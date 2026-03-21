from fastapi import APIRouter, HTTPException
from ingestion.store import load_db

router = APIRouter()

@router.get("/")
def get_opportunities():
    db = load_db()

    return [
        {
            "id": k,
            "title": v["data"]['title'],
            "deadline": v["data"].get("response_deadline"),
            "agency": v["data"].get("agency", {}).get("name"),
            "set_aside": v["data"].get("set_aside"),
            "notice_type": v["data"].get("notice_type"),
        }
        for k,v in db.items()
    ]


@router.get("/{opportunity_id}")
def get_opportunity(opportunity_id: str):
    db = load_db()
    if opportunity_id not in db:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    return db[opportunity_id]["data"]

