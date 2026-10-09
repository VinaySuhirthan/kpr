import io
from typing import Dict, List, Tuple
from Bio import SeqIO
from level3_app.services.csv_parser import ParsedSequenceRecord
from level3_app.services.sequence_validator import validate_sequence, SequenceValidationError
from level3_app.utils.logging import logger

class FastaParseError(ValueError):
    """Raised when FASTA format or sequence validation fails."""
    pass

def parse_genomic_fasta(
    file_content: bytes,
    default_isolate_id: str = "Isolate_1"
) -> Tuple[List[ParsedSequenceRecord], Dict[str, Tuple[str, str, int]]]:
    """
    Parses FASTA formatted content using BioPython SeqIO.
    Returns:
      records: List[ParsedSequenceRecord]
      fasta_id_map: Dict[fasta_id, (isolate_id, contig_id, length)]
    """
    if not file_content or len(file_content.strip()) == 0:
        raise FastaParseError("The uploaded FASTA file is empty.")

    try:
        text_stream = io.StringIO(file_content.decode("utf-8", errors="replace"))
        parsed_entries = list(SeqIO.parse(text_stream, "fasta"))
    except Exception as e:
        logger.error(f"Failed to parse FASTA with BioPython: {e}")
        raise FastaParseError(f"Could not parse FASTA file. Ensure it is a valid FASTA format. Error: {str(e)}")

    if not parsed_entries:
        raise FastaParseError("No FASTA sequence records found in file. Ensure headers begin with '>'.")

    records: List[ParsedSequenceRecord] = []
    fasta_id_map: Dict[str, Tuple[str, str, int]] = {}
    seen_ids = set()

    for idx, entry in enumerate(parsed_entries, start=1):
        raw_header = entry.id or f"sequence_{idx}"
        raw_seq = str(entry.seq)

        # Parse isolate and contig if header follows naming conventions (e.g., ISO001___contig_1, ISO001_contig_1, ISO001|contig_1)
        if "___" in raw_header:
            parts = raw_header.split("___", 1)
            isolate_id = parts[0]
            contig_id = parts[1]
        elif "|" in raw_header:
            parts = raw_header.split("|", 1)
            isolate_id = parts[0]
            contig_id = parts[1]
        else:
            isolate_id = default_isolate_id
            contig_id = raw_header

        composite_key = (isolate_id, contig_id)
        if composite_key in seen_ids:
            raise FastaParseError(f"Duplicate sequence header detected: '{raw_header}'.")
        seen_ids.add(composite_key)

        try:
            norm_seq = validate_sequence(raw_seq, identifier=f"FASTA entry '{raw_header}'")
        except SequenceValidationError as sve:
            raise FastaParseError(str(sve))

        safe_iso = "".join(c if c.isalnum() or c in "_-" else "_" for c in isolate_id)
        safe_contig = "".join(c if c.isalnum() or c in "_-" else "_" for c in contig_id)
        fasta_id = f"{safe_iso}___{safe_contig}"

        seq_len = len(norm_seq)
        record = ParsedSequenceRecord(
            fasta_id=fasta_id,
            isolate_id=isolate_id,
            contig_id=contig_id,
            sequence=norm_seq,
            length=seq_len
        )
        records.append(record)
        fasta_id_map[fasta_id] = (isolate_id, contig_id, seq_len)
        fasta_id_map[safe_contig] = (isolate_id, contig_id, seq_len)
        fasta_id_map[contig_id] = (isolate_id, contig_id, seq_len)
        fasta_id_map[raw_header] = (isolate_id, contig_id, seq_len)

    return records, fasta_id_map
