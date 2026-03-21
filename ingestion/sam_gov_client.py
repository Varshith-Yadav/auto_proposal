import requests
from datetime import datetime
from ingestion.config import SAM_API_URL, API_KEY

def fetch_opportunities(posted_from: str, posted_to: str | None = None):
    if not posted_to:
        posted_to = datetime.utcnow().strftime("%m/%d/%Y")

    params = {
        "api_key": API_KEY,
        "postedFrom": posted_from,
        "postedTo": posted_to,
        "limit": 50
    }

    response = requests.get(SAM_API_URL, params=params, timeout=30)

    if response.status_code != 200:
        raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    data = response.json()
    return data.get("opportunitiesData", data.get("opportunities", []))



