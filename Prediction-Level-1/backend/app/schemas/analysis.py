from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DashboardResponse(BaseModel):
    analysis_mode: str = "dataset"
    isolate: Dict[str, Any] = {}
    genomic_summary: Dict[str, Any] = {}
    amr_findings: List[Dict[str, Any]] = []
    mutations: List[Dict[str, Any]] = []
    ast_results: List[Dict[str, Any]] = []
    genotype_phenotype: Dict[str, Any] = {}
    predictions: List[Dict[str, Any]] = []
    explanations: List[Dict[str, Any]] = []
    genome_visualization: Dict[str, Any] = {}
    key_takeaway: str = ""
