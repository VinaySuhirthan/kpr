import csv
import io
from typing import Dict, List, Optional, Tuple
from level3_app.schemas.amr_result import AmrDetectionResult
from level3_app.utils.logging import logger

def parse_amrfinder_tsv(
    tsv_content: str,
    analysis_id: str,
    fasta_id_map: Dict[str, Tuple[str, str, int]],
    min_identity: Optional[float] = None,
    min_coverage: Optional[float] = None
) -> List[AmrDetectionResult]:
    """
    Parses real AMRFinderPlus tab-delimited output.
    Maps real fields to internal AmrDetectionResult schema.
    Applies threshold filters (min_identity, min_coverage) if specified.
    Never fabricates missing data; uses None for unavailable fields.
    """
    results: List[AmrDetectionResult] = []
    
    if not tsv_content or not tsv_content.strip():
        logger.info("AMRFinderPlus returned empty output (no genes detected).")
        return results

    reader = csv.reader(io.StringIO(tsv_content), delimiter="\t")
    rows = list(reader)

    if not rows:
        return results

    # Locate header row (skip comments if any)
    header_idx = 0
    header = None
    for idx, row in enumerate(rows):
        if row and not row[0].startswith("#"):
            header = [col.strip() for col in row]
            header_idx = idx
            break

    if not header:
        return results

    # Normalize header names for case-insensitive lookup
    header_lower_map = {col.lower(): i for i, col in enumerate(header)}

    def get_val(row: List[str], possible_col_names: List[str], allow_dash: bool = False) -> Optional[str]:
        for name in possible_col_names:
            idx = header_lower_map.get(name.lower())
            if idx is not None and idx < len(row):
                val = row[idx].strip()
                if val and val != "NA" and (allow_dash or val != "-"):
                    return val
        return None

    def get_int(row: List[str], possible_col_names: List[str]) -> Optional[int]:
        val = get_val(row, possible_col_names)
        if val is not None:
            try:
                return int(float(val))
            except ValueError:
                return None
        return None

    def get_float(row: List[str], possible_col_names: List[str]) -> Optional[float]:
        val = get_val(row, possible_col_names)
        if val is not None:
            try:
                return round(float(val), 2)
            except ValueError:
                return None
        return None

    for row_idx, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        if not row or len(row) == 0:
            continue
        # Skip comment rows
        if row[0].startswith("#"):
            continue

        # Extract sequence / contig identifier
        # AMRFinderPlus v4 uses 'Contig id', v3 used 'Contig' or 'Sequence id'
        raw_seq_id = get_val(row, ["contig id", "contig_id", "contig", "sequence id", "protein identifier"])
        if not raw_seq_id:
            continue

        # Gene symbol: v4 uses 'Element symbol', v3 used 'Gene symbol'
        gene = get_val(row, ["element symbol", "gene symbol", "symbol", "gene", "protein identifier", "sequence name"])
        if not gene:
            continue

        # Map fasta_id back to isolate_id and contig_id
        isolate_id = "Unknown"
        contig_id = raw_seq_id
        if raw_seq_id in fasta_id_map:
            iso, ctg, _ = fasta_id_map[raw_seq_id]
            isolate_id = iso
            contig_id = ctg
        elif "___" in raw_seq_id:
            parts = raw_seq_id.split("___", 1)
            isolate_id = parts[0]
            contig_id = parts[1]

        # Coordinates
        start = get_int(row, ["start", "start coordinate", "begin"])
        end = get_int(row, ["stop", "stop coordinate", "end"])
        strand = get_val(row, ["strand"], allow_dash=True)
        if strand and strand not in ["+", "-"]:
            strand = None

        # Identity and Coverage
        # AMRFinderPlus v4: '% Identity to reference', v3: '% Identity to reference sequence'
        identity = get_float(row, [
            "% identity to reference",
            "% identity to reference sequence",
            "% identity",
            "identity",
            "%id",
            "pident"
        ])

        coverage = get_float(row, [
            "% coverage of reference",
            "% coverage of reference sequence",
            "% coverage",
            "coverage",
            "%cov",
            "qcov"
        ])

        # Filter by user-defined minimum identity and coverage thresholds
        if min_identity is not None and identity is not None:
            if identity < min_identity:
                continue

        if min_coverage is not None and coverage is not None:
            if coverage < min_coverage:
                continue

        # Gene Class and Subclass
        # v4: 'Class', 'Subclass' | v3: same names
        gene_class = get_val(row, ["class", "gene class"])
        subclass = get_val(row, ["subclass", "gene subclass"])
        # v4: 'Element subtype', 'Element type' | v3: 'Subtype', 'Type'
        element_subtype = get_val(row, ["element subtype", "subtype"])
        element_type = get_val(row, ["element type", "type"])
        # v4: 'Element name' replaces 'Sequence name' from v3
        seq_name = get_val(row, ["element name", "sequence name", "name of closest sequence"])

        # Mechanism: derived from real AMRFinder fields (subclass, element_subtype, or seq_name)
        mechanism = subclass or element_subtype or (f"{gene_class} resistance" if gene_class else None)

        # Method
        method = get_val(row, ["method", "method type"]) or "AMRFinderPlus"

        results.append(
            AmrDetectionResult(
                analysis_id=analysis_id,
                isolate_id=isolate_id,
                contig_id=contig_id,
                gene=gene,
                gene_class=gene_class,
                method=method,
                start=start,
                end=end,
                strand=strand,
                identity=identity,
                coverage=coverage,
                mechanism=mechanism
            )
        )

    return results
