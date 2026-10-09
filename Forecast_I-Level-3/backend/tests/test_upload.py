import pytest
from level3_app.services.csv_parser import parse_genomic_csv, CsvParseError
from level3_app.services.fasta_parser import parse_genomic_fasta, FastaParseError

VALID_CSV = b"""isolate_id,contig_id,sequence
ISO001,contig_1,ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
ISO001,contig_2,TTGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
ISO002,contig_1,GGGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
"""

MISSING_COL_CSV = b"""isolate_id,contig_id
ISO001,contig_1
"""

DUPLICATE_CSV = b"""isolate_id,contig_id,sequence
ISO001,contig_1,ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
ISO001,contig_1,TTGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
"""

VALID_FASTA = b""">ISO001___contig_1
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
>ISO002___contig_2
TTGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC
"""

def test_parse_valid_csv():
    records, fasta_map = parse_genomic_csv(VALID_CSV)
    assert len(records) == 3
    assert records[0].isolate_id == "ISO001"
    assert records[0].contig_id == "contig_1"
    assert "ISO001___contig_1" in fasta_map

def test_missing_column_csv():
    with pytest.raises(CsvParseError) as exc:
        parse_genomic_csv(MISSING_COL_CSV)
    assert "missing required column" in str(exc.value)

def test_duplicate_identifier_csv():
    with pytest.raises(CsvParseError) as exc:
        parse_genomic_csv(DUPLICATE_CSV)
    assert "Duplicate sequence identifier" in str(exc.value)

def test_parse_valid_fasta():
    records, fasta_map = parse_genomic_fasta(VALID_FASTA)
    assert len(records) == 2
    assert records[0].isolate_id == "ISO001"
    assert records[0].contig_id == "contig_1"

def test_empty_fasta():
    with pytest.raises(FastaParseError) as exc:
        parse_genomic_fasta(b"")
    assert "is empty" in str(exc.value)
