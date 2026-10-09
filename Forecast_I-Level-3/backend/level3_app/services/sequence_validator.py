import re
from typing import Tuple, Set
from level3_app.config.settings import settings

# IUPAC nucleotide code: A, C, G, T, plus standard ambiguity characters and N
# A: Adenine, C: Cytosine, G: Guanine, T: Thymine, U: Uracil (RNA)
# Ambiguities: R (A|G), Y (C|T), S (G|C), W (A|T), K (G|T), M (A|C),
#              B (C|G|T), D (A|G|T), H (A|C|T), V (A|C|G), N (any)
VALID_NUCLEOTIDE_CHARS: Set[str] = set("ACGTURYKMSWBDHVN")

class SequenceValidationError(ValueError):
    """Raised when sequence fails biological or format validation."""
    pass

def clean_and_normalize_sequence(seq: str) -> str:
    """
    Strips safe whitespace/newlines and normalizes lowercase nucleotides to uppercase.
    Does NOT alter biologically meaningful sequence data.
    """
    if not seq:
        return ""
    # Remove whitespace, carriage returns, newlines, tabs
    cleaned = re.sub(r"\s+", "", seq)
    return cleaned.upper()

def validate_sequence(
    sequence: str,
    identifier: str = "Sequence",
    min_length: int = settings.MIN_SEQUENCE_LENGTH
) -> str:
    """
    Validates a genomic nucleotide sequence.
    Returns the normalized sequence if valid.
    Raises SequenceValidationError on validation failure.
    """
    if not sequence or not sequence.strip():
        raise SequenceValidationError(f"{identifier} is empty.")

    normalized = clean_and_normalize_sequence(sequence)

    # Check minimum length
    if len(normalized) < min_length:
        raise SequenceValidationError(
            f"{identifier} has length {len(normalized)} bp, which is too short for genomic AMR annotation. "
            f"AMRFinderPlus searches for full or partial coding sequences against its reference database and requires "
            f"sufficient sequence context (minimum {min_length} bp required)."
        )

    # Check valid nucleotide characters
    invalid_chars = set(normalized) - VALID_NUCLEOTIDE_CHARS
    if invalid_chars:
        sample_invalid = ", ".join(sorted(list(invalid_chars))[:5])
        raise SequenceValidationError(
            f"{identifier} contains invalid nucleotide characters: {sample_invalid}. "
            "Only valid nucleotide characters (A, C, G, T, and IUPAC ambiguity codes) are permitted."
        )

    return normalized
