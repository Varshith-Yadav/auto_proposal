from pydantic import BaseModel
from typing import List, Optional


class UserProfile(BaseModel):
    company_name: str
    capabilities: List[str]
    past_experience: List[str]


class ProposalRequest(BaseModel):
    opportunity_id: str
    user_profile: UserProfile


class ProposalRefineRequest(BaseModel):
    opportunity_id: str
    user_profile: UserProfile
    section_title: str
    section_text: str
    instruction: Optional[str] = None
    action: Optional[str] = None


    
