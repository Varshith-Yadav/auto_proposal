import json
import os
from ingestion.config import DB_PATH

def load_db():
    if not os.path.exists(DB_PATH):
        return {}
    
    with open(DB_PATH, "r") as f:
        return json.load(f)
    
def save_db(db: dict):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2)

        
