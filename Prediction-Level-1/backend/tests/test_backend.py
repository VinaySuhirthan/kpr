from fastapi.testclient import TestClient

from app.main import app
from app.services.data_loader import (
    get_ast,
    get_genes,
    get_isolate,
    get_organisms,
    load_ast_phenotypes,
    load_gene_annotations,
    load_isolate_genomics,
)
from app.services.feature_engineering import build_feature_dataset
from app.services.genotype_phenotype import compare_isolate
from app.services.model_service import ensure_models

client = TestClient(app)


def test_csv_loading():
    isolate_df = load_isolate_genomics()
    gene_df = load_gene_annotations()
    ast_df = load_ast_phenotypes()
    assert len(isolate_df) > 0
    assert len(gene_df) > 0
    assert len(ast_df) > 0


def test_organisms_and_isolate_lookup():
    organisms = get_organisms()
    assert "Escherichia coli" in organisms
    isolate = get_isolate("EC0001")
    assert isolate is not None
    assert isolate["organism"] == "Escherichia coli"


def test_gene_and_ast_retrieval():
    genes = get_genes("EC0003")
    ast = get_ast("EC0003")
    assert len(genes) > 0
    assert len(ast) > 0


def test_mutation_and_genotype_phenotype():
    result = compare_isolate("EC0003")
    assert "overall_status" in result
    assert isinstance(result["items"], list)


def test_feature_engineering_and_model_training():
    dataset = build_feature_dataset()
    assert not dataset.empty
    metrics = ensure_models()
    assert isinstance(metrics, dict)


def test_dashboard_endpoint():
    response = client.get("/api/v1/level1/dashboard/EC0003")
    assert response.status_code == 200
    body = response.json()
    assert body["analysis_mode"] == "dataset"
    assert "isolate" in body
    assert "genomic_summary" in body
    assert "amr_findings" in body
    assert "mutations" in body
    assert "ast_results" in body
    assert "genotype_phenotype" in body
    assert "predictions" in body
    assert "explanations" in body
    assert "genome_visualization" in body
    assert "key_takeaway" in body
