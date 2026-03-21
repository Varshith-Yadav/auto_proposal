from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from ingestion.pipeline import run_ingestion

if __name__ == "__main__":
    run_ingestion()
