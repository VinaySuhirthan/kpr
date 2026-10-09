from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class GenotypePhenotypeItem(BaseModel):
    antibiotic: str
    antibiotic_class: str
    genetic_evidence: List[str]
    ast_result: str
    interpretation: str


class GenotypePhenotypeSummary(BaseModel):
    overall_status: str
    matches: int
    possible_mismatches: int
    no_genetic_evidence: int
    items: List[GenotypePhenotypeItem]


class ASTPhenotypeResponse(BaseModel):
    antibiotic: str
    result: str
    interpretation: str
    class_name: str = ""
