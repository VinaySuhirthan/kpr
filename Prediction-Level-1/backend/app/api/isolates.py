from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.data_loader import get_ast, get_genes, get_isolate, get_isolates, get_organisms

router = APIRouter(prefix="/api/v1")


@router.get("/organisms")
def list_organisms() -> dict:
    return {"organisms": get_organisms()}


@router.get("/isolates")
def list_isolates(organism: Optional[str] = Query(default=None)) -> dict:
    rows = get_isolates(organism=organism)
    return {"isolates": rows}


@router.get("/isolates/{isolate_id}")
def get_isolate_record(isolate_id: str) -> dict:
    row = get_isolate(isolate_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Isolate {isolate_id} not found")
    return {
        "isolate_id": row.get("isolate_id"),
        "organism": row.get("organism"),
        "collection_date": row.get("collection_date"),
        "ward": row.get("ward"),
        "specimen_type": row.get("specimen_type"),
        "country": row.get("country"),
        "genome_id": row.get("genome_id"),
        "assembly_status": row.get("assembly_status"),
        "genome_length_bp": row.get("genome_length_bp"),
        "gc_percent": row.get("gc_percent"),
        "amr_gene_count": row.get("amr_gene_count"),
        "mutation_count": row.get("mutation_count"),
        "antibiotics_tested": row.get("antibiotics_tested"),
    }


@router.get("/isolates/{isolate_id}/genes")
def get_isolate_genes(isolate_id: str) -> dict:
    isolate = get_isolate(isolate_id)
    if not isolate:
        raise HTTPException(status_code=404, detail=f"Isolate {isolate_id} not found")
    genes = get_genes(isolate_id)
    amr = [gene for gene in genes if gene["category"] == "AMR"]
    core = [gene for gene in genes if gene["category"] != "AMR"]
    return {"isolate_id": isolate_id, "genes": genes, "amr_genes": amr, "core_genes": core}


@router.get("/isolates/{isolate_id}/ast")
def get_isolate_ast(isolate_id: str) -> list[dict]:
    isolate = get_isolate(isolate_id)
    if not isolate:
        raise HTTPException(status_code=404, detail=f"Isolate {isolate_id} not found")
    return get_ast(isolate_id)
