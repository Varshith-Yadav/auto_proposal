from fastapi import APIRouter, HTTPException
import httpx
from backend.models.request_models import ProposalRequest, ProposalRefineRequest
from backend.models.response_models import ProposalResponse, ProposalRefineResponse
from backend.services.rag_service import generate_proposal, refine_proposal_section
from ingestion.store import load_db

router = APIRouter()


@router.post("/")
def generate(request: ProposalRequest):
    db = load_db()
    if request.opportunity_id not in db:
        sample_ids = list(db.keys())[:3]
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Opportunity not found",
                "sample_ids": sample_ids,
            },
        )

    try:
        proposal, citations = generate_proposal(
            opportunity_id=request.opportunity_id,
            user_profile=request.user_profile.dict()
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not reachable. Start Ollama (`ollama serve`) and ensure the model is pulled.",
        )

    return ProposalResponse(proposal_text=proposal, citations=citations)


@router.post("/refine")
def refine(request: ProposalRefineRequest):
    db = load_db()
    if request.opportunity_id not in db:
        sample_ids = list(db.keys())[:3]
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Opportunity not found",
                "sample_ids": sample_ids,
            },
        )

    try:
        section_text, citations = refine_proposal_section(
            opportunity_id=request.opportunity_id,
            user_profile=request.user_profile.dict(),
            section_title=request.section_title,
            section_text=request.section_text,
            instruction=request.instruction,
            action=request.action,
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not reachable. Start Ollama (`ollama serve`) and ensure the model is pulled.",
        )

    return ProposalRefineResponse(section_text=section_text, citations=citations)


