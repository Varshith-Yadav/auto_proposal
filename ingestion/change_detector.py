import hashlib
import json


def generate_hash(opportunity: dict):
    relevant_fields = {
        "title": opportunity.get("title"),
        "description": opportunity.get("description"),
        "deadline": opportunity.get("deadline"),
    }

    encoded = json.dumps(relevant_fields, sort_keys=True).encode()

    return hashlib.md5(encoded).hexdigest()


def detect_changes(existing_db: dict, new_opportunity: dict):
    opp_id = new_opportunity["id"]
    new_hash = generate_hash(new_opportunity)

    if opp_id not in existing_db:
        return "new", new_hash
    
    if existing_db[opp_id]["hash"] != new_hash:
        return "modified", new_hash
    
    return "unchanged", new_hash



