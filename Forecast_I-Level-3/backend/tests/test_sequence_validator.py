import pytest
from level3_app.services.sequence_validator import (
    validate_sequence,
    clean_and_normalize_sequence,
    SequenceValidationError
)

def test_clean_and_normalize_sequence():
    raw = "  atgc \n gtca \t "
    normalized = clean_and_normalize_sequence(raw)
    assert normalized == "ATGCGTCA"

def test_valid_genomic_sequence():
    seq = "ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC"  # 56 bp
    result = validate_sequence(seq, identifier="TestContig", min_length=50)
    assert result == seq

def test_iupac_ambiguity_nucleotides_accepted():
    seq = "ATGCGRYSWKMBDHVNATGCGRYSWKMBDHVNATGCGRYSWKMBDHVNATGCG"
    result = validate_sequence(seq, min_length=50)
    assert len(result) >= 50

def test_short_sequence_rejected():
    short_seq = "ATGCCCCCCTATTTTT"  # 16 bp
    with pytest.raises(SequenceValidationError) as exc:
        validate_sequence(short_seq, identifier="ShortFragment", min_length=50)
    assert "too short for genomic AMR annotation" in str(exc.value)
    assert "16 bp" in str(exc.value)

def test_empty_sequence_rejected():
    with pytest.raises(SequenceValidationError) as exc:
        validate_sequence("", identifier="EmptyFragment")
    assert "is empty" in str(exc.value)

def test_invalid_characters_rejected():
    invalid_seq = "ATGCGATCGATCGATCGATCGATCGATCGATCGATC123Z#GATCGATCGATCGATC"
    with pytest.raises(SequenceValidationError) as exc:
        validate_sequence(invalid_seq, identifier="Contig_BadChar", min_length=50)
    assert "invalid nucleotide characters" in str(exc.value)
