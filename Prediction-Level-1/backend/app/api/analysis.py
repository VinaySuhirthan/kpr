from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException

from app.services.amr_knowledge import GENE_DESCRIPTION, get_gene_association
from app.services.data_loader import get_ast, get_genes, get_isolate, parse_mutation_records
from app.services.genome_visualization import build_genome_visualization
from app.services.genotype_phenotype import compare_isolate
from app.services.model_service import predict_isolate
from app.services.shap_service import explain_isolate

router = APIRouter(prefix="/api/v1")


def _resolve_resistance_description(gene: str) -> str:
    """Return a human-readable resistance mechanism string from the knowledge base."""
    assoc = get_gene_association(gene)
    description = assoc.get("description") or assoc.get("class") or ""
    if description:
        return description.capitalize()
    return gene  # last resort: gene name itself


def _generate_key_takeaway(amr_findings: list[dict], mutations: list[dict]) -> str:
    gene_names = [item["gene"] for item in amr_findings[:3]]
    mutation_names = [item["display_name"] for item in mutations[:3]]
    if gene_names and mutation_names:
        return (
            f"This isolate contains {', '.join(gene_names)} AMR genes and "
            f"{', '.join(mutation_names)} resistance-associated mutations. "
            "The genomic evidence has been compared against the observed resistance profile."
        )
    if gene_names:
        return (
            f"This isolate contains {', '.join(gene_names)} AMR gene(s). "
            "The genomic evidence has been compared against the observed resistance profile."
        )
    if mutation_names:
        return (
            f"This isolate contains {', '.join(mutation_names)} resistance-associated mutation(s). "
            "The genomic evidence has been compared against the observed resistance profile."
        )
    return "No confirmed AMR gene or resistance mutation was identified in the available dataset for this isolate."


@router.get("/level1/dashboard/{isolate_id}")
def level1_dashboard(isolate_id: str) -> dict:
    t0 = time.perf_counter()

    # ── 1. Metadata lookup ──────────────────────────────────────────────────
    isolate = get_isolate(isolate_id)
    if not isolate:
        raise HTTPException(status_code=404, detail=f"Isolate {isolate_id} not found")
    t1 = time.perf_counter()

    # ── 2. AMR findings from gene_annotations ───────────────────────────────
    genes = get_genes(isolate_id)
    amr_findings: list[dict] = []
    for gene in genes:
        if gene.get("category") == "AMR":
            amr_findings.append({
                "type": "AMR Gene",
                "gene": gene["gene"],
                "location": "Location unavailable",
                "associated_resistance": _resolve_resistance_description(gene["gene"]),
            })

    # ── Fallback: parse amr_genes field from isolate row if get_genes() empty ─
    if not amr_findings:
        raw_amr_genes = str(isolate.get("amr_genes") or "")
        for gene_name in [g.strip() for g in raw_amr_genes.split(";") if g.strip() and g.strip().lower() != "none"]:
            amr_findings.append({
                "type": "AMR Gene",
                "gene": gene_name,
                "location": "Location unavailable",
                "associated_resistance": _resolve_resistance_description(gene_name),
            })

    # ── 3. Mutation findings ─────────────────────────────────────────────────
    mutation_entries: list[dict] = []
    for mutation in parse_mutation_records(isolate.get("resistance_mutations")):
        mutation_entries.append({
            "type": "Mutation",
            "gene": mutation["gene"],
            "display_name": mutation["display_name"],
            "location": "Location unavailable",
            "associated_resistance": mutation["associated_resistance"],
        })
    t2 = time.perf_counter()

    # ── 4. AST results ──────────────────────────────────────────────────────
    ast_results = get_ast(isolate_id)
    t3 = time.perf_counter()

    # ── 5. Genotype ↔ Phenotype concordance ────────────────────────────────
    phenotype = compare_isolate(isolate_id)
    t4 = time.perf_counter()

    # ── 6. XGBoost inference — per antibiotic, direct feature extraction ────
    predictions: list[dict] = []
    explanations: list[dict] = []
    shap_done = False
    for ast in ast_results:
        antibiotic = ast["antibiotic"]
        prediction = predict_isolate(isolate_id, antibiotic)
        predictions.append(prediction)
        if not shap_done and prediction.get("model_available"):
            explanations.append({**explain_isolate(isolate_id, antibiotic), "antibiotic": antibiotic})
            shap_done = True
    t5 = time.perf_counter()

    # ── 7. Genome visualisation ─────────────────────────────────────────────
    genome_visualization = build_genome_visualization(isolate_id)
    t6 = time.perf_counter()

    key_takeaway = _generate_key_takeaway(amr_findings, mutation_entries)

    print(
        f"[dashboard:{isolate_id}] "
        f"meta={t1-t0:.3f}s genes={t2-t1:.3f}s ast={t3-t2:.3f}s "
        f"gp={t4-t3:.3f}s ml={t5-t4:.3f}s viz={t6-t5:.3f}s "
        f"total={t6-t0:.3f}s"
    )

    return {
        "analysis_mode": "dataset",
        "isolate": {
            "organism": isolate.get("organism"),
            "isolate_id": isolate_id,
            "collection_date": isolate.get("collection_date"),
            "genome_id": isolate.get("genome_id"),
            "assembly_status": isolate.get("assembly_status"),
            "genome_length_bp": isolate.get("genome_length_bp"),
            "gc_percent": isolate.get("gc_percent"),
            "amr_gene_count": len(amr_findings),          # actual count from detection
            "mutation_count": len(mutation_entries),       # actual count from detection
            "antibiotics_tested": len(ast_results),
            "status": "Analyzed",
        },
        "genomic_summary": {
            "genome_length_bp": isolate.get("genome_length_bp"),
            "gc_percent": isolate.get("gc_percent"),
            "amr_gene_count": len(amr_findings),
            "mutation_count": len(mutation_entries),
            "core_gene_count": isolate.get("core_gene_count"),
        },
        "amr_findings": amr_findings,
        "mutations": mutation_entries,
        "ast_results": [
            {
                "antibiotic": item["antibiotic"],
                "class": item["class"],
                "result": item["result"],
                "interpretation": item["interpretation"],
            }
            for item in ast_results
        ],
        "genotype_phenotype": phenotype,
        "predictions": predictions,
        "explanations": explanations,
        "genome_visualization": genome_visualization,
        "key_takeaway": key_takeaway,
    }
