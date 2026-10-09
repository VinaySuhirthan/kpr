from __future__ import annotations

from app.services.data_loader import get_genes, get_isolate


def build_genome_visualization(isolate_id: str) -> dict:
    isolate = get_isolate(isolate_id)
    if not isolate:
        return {"genome_length_bp": 0, "features": []}

    features: list[dict] = []
    for gene in get_genes(isolate_id):
        features.append({
            "label": gene["gene"],
            "type": "AMR gene" if gene["category"] == "AMR" else "Core gene",
            "contig": gene.get("contig"),
            "start": gene.get("start"),
            "end": gene.get("end"),
            "strand": gene.get("strand"),
            "location_available": False,
        })
    return {
        "genome_length_bp": int(isolate.get("genome_length_bp") or 0),
        "features": features,
    }
