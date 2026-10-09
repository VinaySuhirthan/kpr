from __future__ import annotations

from typing import Any
import pandas as pd
import shap

from app.services.feature_engineering import iter_isolate_features
from app.services.model_service import _slug_antibiotic, load_feature_names, load_model

_EXPLAINER_CACHE: dict[str, Any] = {}
_SHAP_RESULT_CACHE: dict[tuple[str, str], dict] = {}


def _get_tree_explainer(antibiotic: str, model):
    slug = _slug_antibiotic(antibiotic)
    if slug in _EXPLAINER_CACHE:
        return _EXPLAINER_CACHE[slug]
    explainer = shap.TreeExplainer(model)
    _EXPLAINER_CACHE[slug] = explainer
    return explainer


def explain_isolate(isolate_id: str, antibiotic: str) -> dict:
    cache_key = (isolate_id, antibiotic)
    if cache_key in _SHAP_RESULT_CACHE:
        return _SHAP_RESULT_CACHE[cache_key]

    model = load_model(antibiotic)
    if model is None:
        result = {"isolate_id": isolate_id, "antibiotic": antibiotic, "model_available": False, "features": []}
        _SHAP_RESULT_CACHE[cache_key] = result
        return result

    feature_names = load_feature_names(antibiotic)
    if not feature_names:
        result = {"isolate_id": isolate_id, "antibiotic": antibiotic, "model_available": False, "features": []}
        _SHAP_RESULT_CACHE[cache_key] = result
        return result

    isolate_features = iter_isolate_features(isolate_id)
    if not isolate_features.get("organism") and not isolate_features.get("genome_length_bp"):
        result = {"isolate_id": isolate_id, "antibiotic": antibiotic, "model_available": True, "features": []}
        _SHAP_RESULT_CACHE[cache_key] = result
        return result

    row = {name: isolate_features.get(name, 0) for name in feature_names}
    input_df = pd.DataFrame([row])

    try:
        explainer = _get_tree_explainer(antibiotic, model)
        values = explainer(input_df)
        shap_raw = values[0].values
        # Handle binary classification shapes (scalar or 2D)
        if hasattr(shap_raw, "ndim") and shap_raw.ndim > 1:
            shap_raw = shap_raw[:, 1] if shap_raw.shape[1] > 1 else shap_raw[:, 0]

        impacts = []
        for feature, value in zip(feature_names, shap_raw):
            val_float = float(value)
            impact = abs(val_float)
            if impact <= 0.0001:
                continue
            impacts.append({
                "feature": feature,
                "impact": round(impact, 3),
                "direction": "increases_resistance_risk" if val_float > 0 else "decreases_resistance_risk",
            })

        impacts = sorted(impacts, key=lambda item: item["impact"], reverse=True)[:5]
        result = {"isolate_id": isolate_id, "antibiotic": antibiotic, "model_available": True, "features": impacts}
    except Exception:
        result = {"isolate_id": isolate_id, "antibiotic": antibiotic, "model_available": True, "features": []}

    _SHAP_RESULT_CACHE[cache_key] = result
    return result
