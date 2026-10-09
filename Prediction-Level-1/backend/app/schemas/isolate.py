from typing import List, Optional

from pydantic import BaseModel, Field


class IsolateSummary(BaseModel):
    isolate_id: str
    organism: str
    collection_date: Optional[str] = None
    ward: Optional[str] = None
    specimen_type: Optional[str] = None
    country: Optional[str] = None
    genome_id: Optional[str] = None
    assembly_status: Optional[str] = None
    genome_length_bp: Optional[int] = None
    gc_percent: Optional[float] = None
    amr_gene_count: Optional[int] = None
    mutation_count: Optional[int] = None
    antibiotics_tested: Optional[int] = None


class GeneFinding(BaseModel):
    gene: str
    category: str
    detected: bool = True
    sequence_length_bp: Optional[int] = None
    location_available: bool = False
    contig: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None
    strand: Optional[str] = None
    source: str = "dataset"


class MutationFinding(BaseModel):
    gene: str
    mutation: str
    display_name: str
    associated_resistance: str
    location_available: bool = False
    position: Optional[int] = None


class ASTRecord(BaseModel):
    antibiotic: str
    result: str
    interpretation: str
    class_name: str = Field(alias="class")

    model_config = {"populate_by_name": True}


class PredictionRequest(BaseModel):
    isolate_id: str
    antibiotic: str
