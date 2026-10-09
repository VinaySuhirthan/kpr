from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import polars as pl

from app.core.config import settings
from app.core.exceptions import AMRDataError


REQUIRED_ISOLATE_COLUMNS = [
    "isolate_id",
    "organism",
    "collection_date",
    "ward",
    "specimen_type",
    "country",
    "genome_id",
    "assembly_status",
    "amr_gene_count",
    "amr_genes",
    "resistance_mutations",
    "core_gene_count",
    "core_genes_detected",
    "genome_length_bp",
    "gc_percent",
]

REQUIRED_GENE_COLUMNS = [
    "isolate_id",
    "organism",
    "gene_symbol",
    "gene_category",
    "detected",
    "sequence_length_bp",
    "gene_sequence",
]

REQUIRED_AST_COLUMNS = [
    "isolate_id",
    "organism",
    "collection_date",
    "ward",
    "specimen_type",
    "antibiotic",
    "ast_result",
]


def _resolve_data_file(filename: str) -> Path:
    project_root = Path(__file__).resolve().parents[2]
    candidates = [
        project_root / "data" / filename,
        project_root / filename,
        Path(settings.data_dir) / filename,
        Path(filename),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Required data file not found: {filename}")


_isolate_df: pl.DataFrame | None = None
_gene_df: pl.DataFrame | None = None
_ast_df: pl.DataFrame | None = None


def _coerce_bool(series: pl.Series) -> pl.Series:
    return series.map_elements(lambda value: bool(value) if value not in [None, "", "nan", "NaN"] else False, return_dtype=pl.Boolean)


def load_isolate_genomics() -> pl.DataFrame:
    global _isolate_df
    if _isolate_df is not None:
        return _isolate_df

    path = _resolve_data_file("isolate_genomics.csv")
    df = pl.read_csv(path)
    missing = [col for col in REQUIRED_ISOLATE_COLUMNS if col not in df.columns]
    if missing:
        raise AMRDataError(f"Missing columns in isolate_genomics.csv: {missing}")

    df = df.with_columns(
        pl.col("isolate_id").cast(pl.Utf8).replace("", None),
        pl.col("organism").cast(pl.Utf8).str.strip_chars().replace("", None),
        pl.col("collection_date").cast(pl.Utf8).replace("", None),
        pl.col("ward").cast(pl.Utf8).replace("", None),
        pl.col("specimen_type").cast(pl.Utf8).replace("", None),
        pl.col("country").cast(pl.Utf8).replace("", None),
        pl.col("genome_id").cast(pl.Utf8).replace("", None),
        pl.col("assembly_status").cast(pl.Utf8).replace("", None),
        pl.col("amr_gene_count").fill_null(0).cast(pl.Int64),
        pl.col("core_gene_count").fill_null(0).cast(pl.Int64),
        pl.col("genome_length_bp").fill_null(0).cast(pl.Int64),
        pl.col("gc_percent").fill_null(0.0).cast(pl.Float64),
    )
    _isolate_df = df
    return _isolate_df


def load_gene_annotations() -> pl.DataFrame:
    global _gene_df
    if _gene_df is not None:
        return _gene_df

    path = _resolve_data_file("gene_annotations.csv")
    df = pl.read_csv(path)
    missing = [col for col in REQUIRED_GENE_COLUMNS if col not in df.columns]
    if missing:
        raise AMRDataError(f"Missing columns in gene_annotations.csv: {missing}")

    df = df.with_columns(
        pl.col("isolate_id").cast(pl.Utf8).replace("", None),
        pl.col("organism").cast(pl.Utf8).str.strip_chars().replace("", None),
        pl.col("gene_symbol").cast(pl.Utf8).str.strip_chars().replace("", None),
        pl.col("gene_category").cast(pl.Utf8).str.strip_chars().replace("", None),
        pl.col("detected").cast(pl.String).str.strip_chars().str.to_lowercase().is_in(["1", "true", "y", "yes"]),
        pl.col("sequence_length_bp").fill_null(0).cast(pl.Int64),
        pl.col("gene_sequence").cast(pl.Utf8).replace("", None),
    )
    _gene_df = df
    return _gene_df


def load_ast_phenotypes() -> pl.DataFrame:
    global _ast_df
    if _ast_df is not None:
        return _ast_df

    path = _resolve_data_file("ast_phenotypes.csv")
    df = pl.read_csv(path)
    missing = [col for col in REQUIRED_AST_COLUMNS if col not in df.columns]
    if missing:
        raise AMRDataError(f"Missing columns in ast_phenotypes.csv: {missing}")

    df = df.with_columns(
        pl.col("isolate_id").cast(pl.Utf8).replace("", None),
        pl.col("organism").cast(pl.Utf8).str.strip_chars().replace("", None),
        pl.col("collection_date").cast(pl.Utf8).replace("", None),
        pl.col("ward").cast(pl.Utf8).replace("", None),
        pl.col("specimen_type").cast(pl.Utf8).replace("", None),
        pl.col("antibiotic").cast(pl.Utf8).str.strip_chars().replace("", None),
        pl.col("ast_result").cast(pl.Utf8).str.to_uppercase().replace("", None),
    )
    _ast_df = df
    return _ast_df


def get_isolates(organism: str | None = None) -> list[dict[str, Any]]:
    df = load_isolate_genomics()
    if organism:
        df = df.filter(pl.col("organism") == organism)
    return df.select([
        "isolate_id",
        "organism",
        "collection_date",
        "ward",
        "specimen_type",
        "country",
        "genome_id",
        "assembly_status",
        "genome_length_bp",
        "gc_percent",
        "amr_gene_count",
        "resistance_mutations",
    ]).to_dicts()


def get_organisms() -> list[str]:
    df = load_isolate_genomics()
    values = df.get_column("organism").drop_nulls().unique().to_list()
    return sorted(str(item) for item in values)


def get_isolate(isolate_id: str) -> dict[str, Any] | None:
    df = load_isolate_genomics()
    row = df.filter(pl.col("isolate_id") == isolate_id).to_dicts()
    if not row:
        return None
    result = row[0]
    ast = get_ast(isolate_id)
    result["antibiotics_tested"] = len(ast)
    result["mutation_count"] = len(parse_mutations(str(result.get("resistance_mutations") or "")))
    return result


def parse_mutations(raw_value: str | None) -> list[str]:
    if not raw_value or raw_value.lower() in {"none", "none detected", "nan", "null"}:
        return []
    pieces = str(raw_value).split(";")
    mutations: list[str] = []
    for piece in pieces:
        trimmed = piece.strip()
        if trimmed and trimmed.lower() != "none detected":
            mutations.append(trimmed)
    return mutations


def parse_mutation_records(raw_value: str | None) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for mutation in parse_mutations(raw_value):
        if "_" not in mutation:
            gene_name = mutation
            mutation_code = ""
            display_name = mutation
        else:
            gene_name, mutation_code = mutation.rsplit("_", 1)
            display_name = f"{gene_name} {mutation_code}"
        records.append({
            "gene": gene_name,
            "mutation": mutation_code,
            "display_name": display_name,
            "associated_resistance": "Fluoroquinolone resistance" if mutation_code else "Resistance-associated mutation",
            "location_available": False,
            "position": None,
        })
    return records


def get_genes(isolate_id: str) -> list[dict[str, Any]]:
    df = load_gene_annotations().filter(pl.col("isolate_id") == isolate_id)
    results: list[dict[str, Any]] = []
    for row in df.to_dicts():
        if row.get("detected") is not True:
            continue
        gene_symbol = str(row.get("gene_symbol") or "").strip()
        if not gene_symbol:
            continue
        results.append({
            "gene": gene_symbol,
            "category": row.get("gene_category") or "AMR",
            "detected": True,
            "sequence_length_bp": int(row.get("sequence_length_bp") or 0),
            "location_available": False,
            "contig": None,
            "start": None,
            "end": None,
            "strand": None,
            "source": "dataset",
        })
    return results


def get_ast(isolate_id: str) -> list[dict[str, Any]]:
    df = load_ast_phenotypes().filter(pl.col("isolate_id") == isolate_id)
    rows: list[dict[str, Any]] = []
    for row in df.to_dicts():
        result = str(row.get("ast_result") or "").strip().upper()
        rows.append({
            "isolate_id": row.get("isolate_id"),
            "organism": row.get("organism"),
            "antibiotic": row.get("antibiotic"),
            "result": result,
            "interpretation": map_ast_result(result),
            "class": get_antibiotic_class(row.get("antibiotic")),
        })
    return rows


def get_antibiotic_class(antibiotic: str | None) -> str:
    mapping = {
        "Ampicillin": "Penicillins",
        "Ceftriaxone": "Cephalosporins",
        "Cefazolin": "Cephalosporins",
        "Cefepime": "Cephalosporins",
        "Ceftazidime": "Cephalosporins",
        "Meropenem": "Carbapenems",
        "Erythromycin": "Macrolides",
        "Clindamycin": "Lincosamides",
        "Tetracycline": "Tetracyclines",
        "Gentamicin": "Aminoglycosides",
        "Tobramycin": "Aminoglycosides",
        "Vancomycin": "Glycopeptides",
        "Trimethoprim-Sulfamethoxazole": "Sulfonamides",
        "Piperacillin-Tazobactam": "Penicillins",
        "Aztreonam": "Monobactams",
        "Ciprofloxacin": "Fluoroquinolones",
        "Oxacillin": "Penicillins",
    }
    if not antibiotic:
        return "Unclassified"
    return mapping.get(str(antibiotic), "Unclassified")


def map_ast_result(value: str | None) -> str:
    normalized = (value or "").strip().upper()
    if normalized == "R":
        return "Resistant"
    if normalized == "I":
        return "Intermediate"
    if normalized == "S":
        return "Susceptible"
    return "Unknown"
