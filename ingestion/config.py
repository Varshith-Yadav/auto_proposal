# ingestion/config.py
from pathlib import Path

SAM_API_URL = "https://api.sam.gov/opportunities/v2/search"
API_KEY = "SAM-75845f29-89e2-4589-a075-23086cd383b1"

POLL_INTERVAL_MINUTES = 60

ROOT_DIR = Path(__file__).resolve().parents[1]
DB_PATH = str(ROOT_DIR / "data" / "opportunities.json")
