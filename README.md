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
- Ollama installed

## Setup

### 1) Python deps
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2) Ollama
```bash
ollama serve
ollama pull llama3.1:8b
```

### 3) Environment
Create `.env` in repo root:
```
OLLAMA_MODEL=llama3.1:8b
```

### 4) Ingest data
```bash
python .\scripts\run_ingestion.py
```

### 5) Run backend
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### 6) Run frontend
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

---

## Notes
- SAM descriptions can return 404/429; proposal falls back to metadata context in that case.
- PDF extraction is best‑effort; some attachments may not parse.
- For heavier responses, set `OLLAMA_MODEL` to a larger model (e.g., `llama3.1:70b`) if your machine can handle it.
