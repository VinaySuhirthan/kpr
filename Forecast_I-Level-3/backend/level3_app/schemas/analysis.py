from typing import List, Optional
from pydantic import BaseModel, Field
from level3_app.schemas.amr_result import AmrDetectionResult

class ToolStatusResponse(BaseModel):
    available: bool = Field(..., description="Whether AMRFinderPlus is available and runnable")
    version: Optional[str] = Field(None, description="AMRFinderPlus version string")
    database_version: Optional[str] = Field(None, description="Database version string if available")
    executable_path: Optional[str] = Field(None, description="Resolved path of the executable")
    message: Optional[str] = Field(None, description="Diagnostic message or installation instructions")

class AnalysisInputMetadata(BaseModel):
    filename: str
    format: str
    sequences: int
    isolates: int

class AnalysisSummary(BaseModel):
    total_sequences: int
    total_contigs: int
    total_amr_hits: int
    unique_genes: int
    number_of_isolates: int
    number_of_mechanisms: int

class ContigVisualFeature(BaseModel):
    contig_id: str
    isolate_id: str
    gene: str
    gene_class: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None
    strand: Optional[str] = None
    identity: Optional[float] = None
    coverage: Optional[float] = None
    contig_length: Optional[int] = None

class ContigVisualizationTrack(BaseModel):
    contig_id: str
    isolate_id: str
    contig_length: Optional[int] = None
    genes: List[ContigVisualFeature]

class AstValidationItem(BaseModel):
    isolate_id: str
    ast_phenotype: str  # e.g., "Resistant", "Susceptible", "Intermediate"
    genotype_call: str  # e.g., "Resistant", "Susceptible"
    detected_genes: List[str] = Field(default_factory=list)
    status: str  # "MATCH" or "MISMATCH"
    category: str  # e.g., "True Positive", "True Negative", "Major Discrepancy", "Minor Discrepancy"
    interpretation: str

class AstConcordanceSummary(BaseModel):
    total_evaluated: int
    matches: int
    mismatches: int
    concordance_rate: float
    true_positives: int = 0
    true_negatives: int = 0
    false_positives: int = 0  # Genotype Resistant, Phenotype Susceptible
    false_negatives: int = 0  # Genotype Susceptible, Phenotype Resistant
    sensitivity: Optional[float] = None
    specificity: Optional[float] = None
    items: List[AstValidationItem]

class AnalysisResponse(BaseModel):
    status: str = Field("success", description="Status of the analysis job: success or error")
    analysis_id: str
    input: AnalysisInputMetadata
    summary: AnalysisSummary
    results: List[AmrDetectionResult]
    visualization_tracks: Optional[List[ContigVisualizationTrack]] = None
    ast_concordance: Optional[AstConcordanceSummary] = None
    message: Optional[str] = None
