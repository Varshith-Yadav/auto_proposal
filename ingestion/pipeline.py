from datetime import datetime, timedelta

from ingestion.sam_gov_client import fetch_opportunities
from ingestion.normalizer import normalize
from ingestion.store import load_db, save_db
from ingestion.change_detector import detect_changes
from ingestion.parser import parser_documents


def run_ingestion():
    print("Starting ingestion pipeline....")

    db = load_db()

    posted_from = (datetime.utcnow() - timedelta(days=30)).strftime("%m/%d/%Y")

    raw_opportunities = fetch_opportunities(posted_from)

    for raw in raw_opportunities:
        normalized = normalize(raw)

        if not normalized.get("id"):
            continue

        status, new_hash = detect_changes(db, normalized)

        if status == "unchanged":
            continue

        print(f"processing {status}: {normalized['id']}")

        parsed_docs = parser_documents(normalized)
        normalized.update(parsed_docs)

        db[normalized["id"]] = {
            "data": normalized,
            "hash": new_hash,
            "status": status,
            "last_update": datetime.utcnow().isoformat()
        }

    save_db(db)
    print("Ingestion Completed.")    
