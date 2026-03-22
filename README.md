# GovPreneurs – Auto‑Proposal Engine

End‑to‑end prototype for the GovPreneurs AI PM case study.  
Ingests SAM.gov opportunities, generates AI proposals with RAG + citations, and provides a modern UI for review/refinement.

## Features
- SAM.gov ingestion with normalized schema + change detection
- Opportunity dashboard + proposal review UI (React/Vite)
- RAG pipeline (chunk → embed → retrieve → generate)
- Citations panel for trust
- Iterative refinement actions (Regenerate / Edit / Expand)
- Dark mode

## Project Structure
```
backend/        FastAPI server (API + RAG)
frontend/       React/Vite UI
ingestion/      SAM.gov ingestion pipeline
rag/            Chunking, embeddings, retrieval, generation
docs/           Case study doc + schema + strategy + prompt
data/           Local opportunity data cache
```

## Requirements
- Python 3.10+
- Node 18+
- NVIDIA API key (Integrate API)

## Setup

### 1) Python deps
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2) Environment
Create `.env` in repo root:
```
NVIDIA_API_KEY=your_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=deepseek-ai/deepseek-v3.1
NVIDIA_TEMPERATURE=0.2
NVIDIA_TOP_P=0.7
NVIDIA_MAX_TOKENS=4096
NVIDIA_THINKING=false
```

### 3) Ingest data
```bash
python .\scripts\run_ingestion.py
```

### 4) Run backend
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### 5) Run frontend
```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

---

## API Endpoints
```
GET  /opportunities/                 List opportunities
GET  /opportunities/{id}             Opportunity details
POST /generate/                      Generate proposal
POST /generate/refine                Refine section (edit/expand/regenerate)
```

---

## Docs
- `docs/case-study.md` – submission document
- `docs/opportunity-schema.json` – normalized schema
- `docs/ingestion-strategy.md` – freshness + ingestion strategy
- `docs/rag-workflow.md` – RAG workflow
- `docs/system-prompt.md` – system prompt used
- `docs/prototype-link.md` – prototype instructions
Prototype link (v0): https://v0.app/chat/proposal-review-screen-hZbs6h8eghS?ref=LYDNIE

---

## Notes
- SAM descriptions can return 404/429; proposal falls back to metadata context in that case.
- PDF extraction is best‑effort; some attachments may not parse.
- For longer drafts, increase `NVIDIA_MAX_TOKENS` if your quota allows it.
