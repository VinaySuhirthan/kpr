import io
from typing import Dict, List, Tuple, Optional
import polars as pl
from level3_app.services.sequence_validator import validate_sequence, SequenceValidationError
from level3_app.utils.logging import logger

class CsvParseError(ValueError):
    """Raised when CSV structure or parsing fails."""
    pass

class CsvParseResult(tuple):
    def __new__(cls, records, fasta_id_map, ast_phenotype_map=None):
        return super().__new__(cls, (records, fasta_id_map))

    def __init__(self, records, fasta_id_map, ast_phenotype_map=None):
        self.records = records
        self.fasta_id_map = fasta_id_map
        self.ast_phenotype_map = ast_phenotype_map or {}

def normalize_phenotype(val: str) -> str:
    v = val.strip().lower()
    if v in {"r", "res", "resistant", "resistance"}:
        return "Resistant"
    if v in {"s", "sens", "susceptible", "sensitive", "susceptibility"}:
        return "Susceptible"
    if v in {"i", "int", "intermediate"}:
        return "Intermediate"
    return val.strip().capitalize()

class ParsedSequenceRecord:
    def __init__(
        self,
        fasta_id: str,
        isolate_id: str,
        contig_id: str,
        sequence: str,
        length: int,
        ast_phenotype: Optional[str] = None
    ):
        self.fasta_id = fasta_id
        self.isolate_id = isolate_id
        self.contig_id = contig_id
        self.sequence = sequence
        self.length = length
        self.ast_phenotype = ast_phenotype

def parse_genomic_csv(
    file_content: bytes,
    filename: str = "upload.csv"
) -> CsvParseResult:
    """
    Parses and validates genomic CSV content using Polars.
    Returns:
      CsvParseResult: Unpacks as (records, fasta_id_map), with .ast_phenotype_map attribute.
    """
    if not file_content or len(file_content.strip()) == 0:
        raise CsvParseError("The uploaded CSV file is empty.")

    try:
        # Read with Polars
        df = pl.read_csv(io.BytesIO(file_content), infer_schema_length=1000)
    except Exception as e:
        logger.error(f"Failed to read CSV with Polars: {e}")
        raise CsvParseError(f"Could not parse CSV file. Ensure it is a valid comma-separated text file. Error: {str(e)}")

    if df.height == 0:
        raise CsvParseError("The uploaded CSV file has no data rows.")

    # Find columns case-insensitively
    col_map = {col.strip().lower(): col for col in df.columns}
    required_keys = ["isolate_id", "contig_id", "sequence"]

    missing = [req for req in required_keys if req not in col_map]
    if missing:
        raise CsvParseError(f"CSV is missing required column(s): {', '.join(missing)}. Expected columns: isolate_id, contig_id, sequence")

    isolate_col = col_map["isolate_id"]
    contig_col = col_map["contig_id"]
    seq_col = col_map["sequence"]

    # Detect optional AST phenotype column
    ast_col = None
    for candidate in ["ast_phenotype", "ast", "phenotype", "ast_result", "susceptibility", "phenotypic_resistance"]:
        if candidate in col_map:
            ast_col = col_map[candidate]
            break

    select_cols = [isolate_col, contig_col, seq_col]
    if ast_col:
        select_cols.append(ast_col)

    records: List[ParsedSequenceRecord] = []
    fasta_id_map: Dict[str, Tuple[str, str, int]] = {}
    ast_phenotype_map: Dict[str, str] = {}
    seen_identifiers = set()

    # Iterate over rows
    rows = df.select(select_cols).iter_rows(named=True)
    
    for row_idx, row in enumerate(rows, start=1):
        iso_val = str(row[isolate_col] or "").strip()
        contig_val = str(row[contig_col] or "").strip()
        seq_val = str(row[seq_col] or "").strip()

        if not iso_val and not contig_val and not seq_val:
            # Skip purely blank row
            continue

        if not iso_val:
            raise CsvParseError(f"Row {row_idx}: 'isolate_id' is empty.")
        if not contig_val:
            raise CsvParseError(f"Row {row_idx}: 'contig_id' is empty for isolate '{iso_val}'.")
        if not seq_val:
            raise CsvParseError(f"Row {row_idx}: 'sequence' is empty for isolate '{iso_val}', contig '{contig_val}'.")

        composite_key = (iso_val, contig_val)
        if composite_key in seen_identifiers:
            raise CsvParseError(f"Duplicate sequence identifier detected on row {row_idx}: isolate '{iso_val}' already has contig '{contig_val}'.")
        seen_identifiers.add(composite_key)

        # Validate sequence
        try:
            norm_seq = validate_sequence(seq_val, identifier=f"Row {row_idx} ({iso_val} / {contig_val})")
        except SequenceValidationError as sve:
            raise CsvParseError(str(sve))

        # Build clean FASTA ID: use double underscore delimiter
        # Sanitize safe characters for BLAST / AMRFinderPlus FASTA headers (letters, numbers, underscores)
        safe_iso = "".join(c if c.isalnum() or c in "_-" else "_" for c in iso_val)
        safe_contig = "".join(c if c.isalnum() or c in "_-" else "_" for c in contig_val)
        fasta_id = f"{safe_iso}___{safe_contig}"

        # Extract AST phenotype if column was found
        ast_val = None
        if ast_col and row.get(ast_col) is not None:
            raw_ast = str(row[ast_col] or "").strip()
            if raw_ast:
                ast_val = normalize_phenotype(raw_ast)
                if iso_val not in ast_phenotype_map:
                    ast_phenotype_map[iso_val] = ast_val

        seq_len = len(norm_seq)
        record = ParsedSequenceRecord(
            fasta_id=fasta_id,
            isolate_id=iso_val,
            contig_id=contig_val,
            sequence=norm_seq,
            length=seq_len,
            ast_phenotype=ast_val
        )
        records.append(record)
        fasta_id_map[fasta_id] = (iso_val, contig_val, seq_len)
        # Also store original contig_val and safe_contig as fallback keys
        fasta_id_map[safe_contig] = (iso_val, contig_val, seq_len)
        fasta_id_map[contig_val] = (iso_val, contig_val, seq_len)

    if not records:
        raise CsvParseError("No valid genomic sequence records found in CSV.")

    return CsvParseResult(records, fasta_id_map, ast_phenotype_map)
