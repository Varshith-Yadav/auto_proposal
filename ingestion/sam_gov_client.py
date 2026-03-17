import requests
from datetime import datetime, timedelta
from ingestion.config import SAM_API_URL, API_KEY

def fetch_opportunities(last_updated_from: str):
    params = {
        "api_key": API_KEY,
        "postedFrom": last_updated_from,
        "limit": 50
    }

    response = requests.get(SAM_API_URL, params=params)

    if response.status_code != 200:
        raise Exception(f"API Error: {response.status_code}")
    
    data = response.json()
    return data.get("opportunities", [])



