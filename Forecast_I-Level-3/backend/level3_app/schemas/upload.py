from typing import Optional
from pydantic import BaseModel, Field

class AnalysisRequestParams(BaseModel):
    tool: str = Field("AMRFinderPlus", description="Analysis tool to use")
    organism: Optional[str] = Field(None, description="Target organism, e.g. Escherichia, Salmonella")
    min_identity: Optional[float] = Field(None, ge=0.0, le=100.0, description="Minimum sequence identity threshold in percent")
    min_coverage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Minimum reference coverage threshold in percent")
