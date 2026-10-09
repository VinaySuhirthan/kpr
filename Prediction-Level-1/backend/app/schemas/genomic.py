from typing import List, Optional

from pydantic import BaseModel


class FASTAParseRequest(BaseModel):
    file_name: Optional[str] = None
    content: Optional[str] = None


class GenomeVisualizationFeature(BaseModel):
    label: str
    type: str
    contig: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None
    strand: Optional[str] = None
    location_available: bool = False
