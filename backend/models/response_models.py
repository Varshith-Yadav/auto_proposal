from pydantic import BaseModel
from typing import List, Optional


class Citation(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    excerpt: Optional[str] = None

class ProposalResponse(BaseModel):
    proposal_text: str
    citations: List[Citation] = []


class ProposalRefineResponse(BaseModel):
    section_text: str
    citations: List[Citation] = []
    
