from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PredictionRequest(BaseModel):
    isolate_id: str
    antibiotic: str


class PredictionResponse(BaseModel):
    isolate_id: str
    antibiotic: str
    prediction: Optional[str] = None
    probability_resistant: Optional[float] = None
    model_available: bool = False
    model_type: Optional[str] = None
    message: Optional[str] = None


class SHAPFeature(BaseModel):
    feature: str
    impact: float
    direction: str
