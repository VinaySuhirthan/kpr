from pathlib import Path
from level3_app.services.amrfinder_parser import parse_amrfinder_tsv

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "amrfinder_output.tsv"

def test_parse_amrfinder_fixture():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        tsv_data = f.read()

    fasta_map = {
        "ISO001___contig_1": ("ISO001", "contig_1", 5000),
        "ISO001___contig_2": ("ISO001", "contig_2", 8000),
        "ISO002___contig_1": ("ISO002", "contig_1", 12000),
    }

    results = parse_amrfinder_tsv(
        tsv_content=tsv_data,
        analysis_id="test_run_1",
        fasta_id_map=fasta_map
    )

    assert len(results) == 3

    # Check 1st hit
    r0 = results[0]
    assert r0.isolate_id == "ISO001"
    assert r0.contig_id == "contig_1"
    assert r0.gene == "blaCTX-M-15"
    assert r0.gene_class == "BETA-LACTAM"
    assert r0.mechanism == "CEPHALOSPORIN"
    assert r0.start == 1200
    assert r0.end == 2076
    assert r0.strand == "+"
    assert r0.identity == 100.00
    assert r0.coverage == 100.00

    # Check 2nd hit
    r1 = results[1]
    assert r1.isolate_id == "ISO001"
    assert r1.contig_id == "contig_2"
    assert r1.gene == "tet(A)"
    assert r1.strand == "-"
    assert r1.identity == 98.50
    assert r1.coverage == 99.75

def test_parse_amrfinder_with_threshold_filtering():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        tsv_data = f.read()

    fasta_map = {
        "ISO001___contig_1": ("ISO001", "contig_1", 5000),
        "ISO001___contig_2": ("ISO001", "contig_2", 8000),
        "ISO002___contig_1": ("ISO002", "contig_1", 12000),
    }

    # Filter with min_identity=99.0
    # Hit 0 has 100.00 (passes)
    # Hit 1 has 98.50 (filtered)
    # Hit 2 has 96.00 (filtered)
    filtered = parse_amrfinder_tsv(
        tsv_content=tsv_data,
        analysis_id="test_run_filter",
        fasta_id_map=fasta_map,
        min_identity=99.0
    )
    assert len(filtered) == 1
    assert filtered[0].gene == "blaCTX-M-15"

def test_parse_amrfinder_empty():
    results = parse_amrfinder_tsv("", "empty_run", {})
    assert len(results) == 0
