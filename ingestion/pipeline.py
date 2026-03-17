from datetime import datetime, timedelta

from ingestion.sam_gov_client import fetch_opportunities
from ingestion.normalizer import normalize
from ingestion.store import load_db, save_db
from ingestion.change_detector import detect_changes
from ingestion.parser import parser_documents


def run_ingestion():
    print("Starting ingestion pipeline....")

    db = load_db()

    last_run_time = (datetime.utcnow() - timedelta(minutes=15)).isoformat()

    raw_opportunities = fetch_opportunities(last_run_time)

    for raw in raw_opportunities:
        normalized = normalize(raw)

        status, new_hash = detect_changes(db, normalize)

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

    save_db()
    print("Ingestion Completed.")    