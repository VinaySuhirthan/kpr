from typing import Optional
from pydantic import BaseModel, Field

class AmrDetectionResult(BaseModel):
    analysis_id: str = Field(..., description="Unique identifier for the analysis job")
    isolate_id: str = Field(..., description="Isolate/sample identifier")
    contig_id: str = Field(..., description="Contig or sequence identifier")
    gene: str = Field(..., description="Detected AMR gene symbol / name")
    gene_class: Optional[str] = Field(None, description="Resistance class (e.g. BETA-LACTAM)")
    method: str = Field("AMRFinderPlus", description="Method/tool used for identification")
    start: Optional[int] = Field(None, description="Start coordinate on contig (1-based)")
    end: Optional[int] = Field(None, description="End coordinate on contig (1-based)")
    strand: Optional[str] = Field(None, description="Strand (+ or -)")
    identity: Optional[float] = Field(None, description="Percent identity to reference")
    coverage: Optional[float] = Field(None, description="Percent coverage of reference")
    mechanism: Optional[str] = Field(None, description="Resistance mechanism or subclass")
