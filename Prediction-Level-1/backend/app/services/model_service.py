from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

from app.core.config import settings
from app.core.exceptions import ModelTrainingError
from app.services.feature_engineering import build_training_records, get_feature_columns, iter_isolate_features


MODEL_TYPE = "XGBoost"


def _feature_columns_for_antibiotic(antibiotic: str, all_columns: list[str]) -> list[str]:
    selected = []
    for column in all_columns:
        if column.startswith("amr_") or column.startswith("mutation_") or column in {"genome_length_bp", "gc_percent", "amr_gene_count", "mutation_count", "core_gene_count"}:
            selected.append(column)
    return selected


def ensure_models() -> dict[str, dict]:
    model_dir = Path(settings.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    training = build_training_records()
    metrics = {}
    for antibiotic, frame in training.items():
        if frame.empty:
            continue
        if len(frame) < settings.min_training_samples:
            metrics[antibiotic] = {"model_available": False, "reason": "Insufficient training data"}
            continue
        if frame["target"].nunique() < 2:
            metrics[antibiotic] = {"model_available": False, "reason": "Incomplete class balance"}
            continue

        feature_names = [c for c in get_feature_columns() if c in frame.columns]
        if not feature_names:
            continue
        X = frame[feature_names]
        y = frame["target"]
        # isolate-level split to avoid leakage across the same isolate
        unique_isolates = frame["isolate_id"].drop_duplicates().tolist()
        train_ids, test_ids = train_test_split(unique_isolates, test_size=0.2, random_state=42, stratify=y.groupby(frame["isolate_id"]).first().reindex(unique_isolates).tolist())
        train_mask = frame["isolate_id"].isin(train_ids)
        test_mask = frame["isolate_id"].isin(test_ids)

        model = xgb.XGBClassifier(
            objective="binary:logistic",
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="logloss",
        )
        model.fit(X[train_mask], y[train_mask])
        preds = model.predict(X[test_mask])
        probabilities = model.predict_proba(X[test_mask])[:, 1]

        metrics[antibiotic] = {
            "model_available": True,
            "accuracy": float(accuracy_score(y[test_mask], preds)),
            "precision": float(precision_score(y[test_mask], preds, zero_division=0)),
            "recall": float(recall_score(y[test_mask], preds, zero_division=0)),
            "f1": float(f1_score(y[test_mask], preds, zero_division=0)),
            "roc_auc": float(roc_auc_score(y[test_mask], probabilities)) if len(set(y[test_mask])) > 1 else None,
        }
        joblib.dump(model, model_dir / f"{_slug_antibiotic(antibiotic)}_xgb.joblib")
        with open(model_dir / f"{_slug_antibiotic(antibiotic)}_features.json", "w", encoding="utf-8") as handle:
            json.dump(feature_names, handle)

    with open(model_dir / "model_metrics.json", "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    return metrics


def _slug_antibiotic(antibiotic: str) -> str:
    cleaned = antibiotic.lower().replace(" ", "_").replace("-", "_").replace("/", "_")
    return cleaned


_MODEL_CACHE: dict[str, Any] = {}
_FEATURE_CACHE: dict[str, list[str]] = {}


def load_model(antibiotic: str):
    slug = _slug_antibiotic(antibiotic)
    if slug in _MODEL_CACHE:
        return _MODEL_CACHE[slug]
    model_dir = Path(settings.model_dir)
    path = model_dir / f"{slug}_xgb.joblib"
    if not path.exists():
        return None
    model = joblib.load(path)
    _MODEL_CACHE[slug] = model
    return model


def load_feature_names(antibiotic: str) -> list[str]:
    slug = _slug_antibiotic(antibiotic)
    if slug in _FEATURE_CACHE:
        return _FEATURE_CACHE[slug]
    feature_file = Path(settings.model_dir) / f"{slug}_features.json"
    if not feature_file.exists():
        return []
    features = json.loads(feature_file.read_text(encoding="utf-8"))
    _FEATURE_CACHE[slug] = features
    return features


def predict_isolate(isolate_id: str, antibiotic: str) -> dict:
    model = load_model(antibiotic)
    if model is None:
        return {
            "isolate_id": isolate_id,
            "antibiotic": antibiotic,
            "model_available": False,
            "prediction": None,
            "message": "Model not available for this antibiotic",
        }

    feature_names = load_feature_names(antibiotic)
    if not feature_names:
        return {
            "isolate_id": isolate_id,
            "antibiotic": antibiotic,
            "model_available": False,
            "prediction": None,
            "message": "Feature specification not available",
        }

    isolate_features = iter_isolate_features(isolate_id)
    if not isolate_features.get("organism") and not isolate_features.get("genome_length_bp"):
        return {
            "isolate_id": isolate_id,
            "antibiotic": antibiotic,
            "model_available": False,
            "prediction": None,
            "message": "Isolate not available for model scoring",
        }

    row = {name: isolate_features.get(name, 0) for name in feature_names}
    input_df = pd.DataFrame([row])
    prediction = int(model.predict(input_df)[0])
    probability = float(model.predict_proba(input_df)[0][1])
    return {
        "isolate_id": isolate_id,
        "antibiotic": antibiotic,
        "prediction": "Resistant" if prediction == 1 else "Susceptible",
        "probability_resistant": round(probability, 3),
        "model_available": True,
        "model_type": MODEL_TYPE,
    }

