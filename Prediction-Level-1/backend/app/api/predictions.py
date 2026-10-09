from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.prediction import PredictionRequest
from app.services.model_service import predict_isolate
from app.services.shap_service import explain_isolate

router = APIRouter(prefix="/api/v1")


@router.post("/predict")
def predict(request: PredictionRequest):
    response = predict_isolate(request.isolate_id, request.antibiotic)
    if not response.get("model_available") and response.get("prediction") is None:
        return response
    return response


@router.get("/explain/{isolate_id}/{antibiotic}")
def explain(isolate_id: str, antibiotic: str):
    return explain_isolate(isolate_id, antibiotic)
