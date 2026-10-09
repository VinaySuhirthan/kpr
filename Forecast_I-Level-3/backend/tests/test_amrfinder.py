from pathlib import Path
import tempfile
from level3_app.services.amrfinder_runner import check_amrfinder_status, write_records_to_fasta
from level3_app.services.csv_parser import ParsedSequenceRecord

def test_check_amrfinder_status_returns_tuple():
    status = check_amrfinder_status()
    assert isinstance(status, tuple)
    assert len(status) == 5
    available, version, db_version, path, msg = status
    assert isinstance(available, bool)
    if not available:
        assert msg is not None
        assert "AMRFinderPlus executable" in msg

def test_write_records_to_fasta():
    records = [
        ParsedSequenceRecord(
            fasta_id="ISO001___contig_1",
            isolate_id="ISO001",
            contig_id="contig_1",
            sequence="ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC",
            length=56
        )
    ]
    with tempfile.TemporaryDirectory() as tmp_dir:
        out_fasta = Path(tmp_dir) / "test.fasta"
        write_records_to_fasta(records, out_fasta)
        assert out_fasta.exists()
        content = out_fasta.read_text(encoding="utf-8")
        assert ">ISO001___contig_1" in content
        assert "ATGCGATC" in content
