from __future__ import annotations

import re
from collections.abc import Iterable

import pandas as pd

from app.services.amr_knowledge import ANTIBIOTIC_RELEVANT_GENES
from app.services.data_loader import get_ast, get_genes, get_isolate, load_gene_annotations, load_isolate_genomics


def sanitize_feature_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", str(name).strip())
    return cleaned.strip("_")


def iter_isolate_features(isolate_id: str) -> dict[str, int | str | float]:
    isolate = get_isolate(isolate_id)
    gene_rows = get_genes(isolate_id)
    features: dict[str, int | str | float] = {
        "isolate_id": isolate_id,
        "organism": isolate.get("organism") if isolate else "",
        "genome_length_bp": float(isolate.get("genome_length_bp") or 0),
        "gc_percent": float(isolate.get("gc_percent") or 0),
        "amr_gene_count": int(isolate.get("amr_gene_count") or 0),
        "mutation_count": int(isolate.get("mutation_count") or 0),
        "core_gene_count": int(isolate.get("core_gene_count") or 0),
    }
    for item in gene_rows:
        gene = item["gene"]
        feature_name = f"amr_{sanitize_feature_name(gene)}"
        features[feature_name] = 1
    mutation_values = [m for m in str(isolate.get("resistance_mutations") or "").split(";") if m.strip()]
    for mutation in mutation_values:
        feature_name = f"mutation_{sanitize_feature_name(mutation)}"
        features[feature_name] = 1
    return features


def build_feature_dataset() -> pd.DataFrame:
    isolate_df = load_isolate_genomics().to_pandas()
    ast_df = pd.DataFrame(get_ast("")) if False else None
    records = []
    for _, row in isolate_df.iterrows():
        isolate_id = row["isolate_id"]
        feature_dict = iter_isolate_features(isolate_id)
        for entry in get_ast(isolate_id):
            antibiotic = entry["antibiotic"]
            target_value = entry["result"]
            if target_value == "I":
                continue
            record = dict(feature_dict)
            record["antibiotic"] = antibiotic
            record["target"] = 1 if target_value == "R" else 0
            record["isolate_id"] = isolate_id
            records.append(record)
    if not records:
        return pd.DataFrame()
    dataset = pd.DataFrame(records)
    dataset = dataset.fillna(0)
    return dataset


def build_training_records() -> dict[str, pd.DataFrame]:
    dataset = build_feature_dataset()
    if dataset.empty:
        return {}

    grouped: dict[str, pd.DataFrame] = {}
    for antibiotic, frame in dataset.groupby("antibiotic"):
        frame = frame.copy()
        frame = frame.drop(columns=["organism"], errors="ignore")
        frame["organism"] = frame["isolate_id"].map(lambda x: get_isolate(x).get("organism") if get_isolate(x) else "")
        grouped[antibiotic] = frame
    return grouped


def get_feature_columns() -> list[str]:
    columns = [
        "genome_length_bp",
        "gc_percent",
        "amr_gene_count",
        "mutation_count",
        "core_gene_count",
    ]
    genes = [
        "blaCTX-M",
        "blaTEM",
        "blaKPC",
        "blaNDM",
        "blaSHV",
        "mecA",
        "ermC",
        "tetM",
        "blaZ",
        "tetA",
        "qnrS",
        "sul1",
        "aac(6')-Ib",
        "dfrA",
    ]
    mutations = ["gyrA_S83L", "parC_S80I", "gyrA_T83I", "grlA_S80F"]
    for gene in genes:
        columns.append(f"amr_{sanitize_feature_name(gene)}")
    for mutation in mutations:
        columns.append(f"mutation_{sanitize_feature_name(mutation)}")
    return columns
