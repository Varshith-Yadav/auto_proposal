# GovPreneurs AI PM Intern Case Study

Role: AI Product Management Intern  
Topic: Auto‑Proposal Engine  
Goal: Move a small business owner from “Finding an Opportunity” to “Drafting a Proposal” in under 10 minutes.

This document consolidates the schema, ingestion strategy, RAG workflow, system prompt, and UI prototype that were implemented in this project.

## Part 1: Data Integration Strategy (Plumbing)

### Source Analysis
Primary source is SAM.gov Opportunities API. The API provides a noticeId, high‑level metadata, and a description URL. Some notices include attachment metadata. Many descriptions are not embedded and require a follow‑up request to the noticedesc endpoint.

### GovPreneurs Opportunity Schema
Full JSON Schema: `docs/opportunity-schema.json`.

Schema goals:
1. Capture the minimum metadata needed for matching and drafting.
2. Retain enough provenance for citations and audit.
3. Preserve document metadata for RFP extraction.

Example (compressed):
```json
{
  "id": "ffefda2fe00649d08b421f6e75752bd0",
  "title": "Refuse and Recycle Services",
  "description": "https://api.sam.gov/prod/opportunities/v1/noticedesc?noticeid=...",
  "notice_type": "Award Notice",
  "set_aside": "SDVOSB",
  "naics_codes": ["562111"],
  "response_deadline": "2026-03-27T12:00:00-04:00",
  "agency": { "name": "DEPT OF DEFENSE...", "code": "097.97AS..." },
  "documents": [{ "title": "Notice Description", "url": "...", "type": "notice_description" }],
  "source": "sam.gov"
}
```

### Ingestion Strategy
Documented in `docs/ingestion-strategy.md`.

Key decisions:
1. Poll SAM.gov on a fixed cadence (hourly).
2. Use rolling windows for postedFrom/postedTo to capture new and modified notices.
3. Hash key fields to detect changes and mark status = new or modified.
4. Store attachment metadata and description URLs for later extraction.

### Freshness and Updates
Change detection uses a deterministic hash of title, description, response_deadline, naics_codes, set_aside, and notice_type. This gives reliable update detection without reprocessing unchanged records.

### Attachments and PDFs
Document metadata is captured from common fields including resourceLinks, attachments, fileLinks, and documents. The description URL is stored as a document record. Full PDF extraction is performed on‑demand at proposal time to avoid SAM API throttling.

## Part 2: RAG Workflow & Prompt Engineering (Brain)

Detailed in `docs/rag-workflow.md`.

### RAG Pipeline
1. Retrieve opportunity metadata and description URL.
2. Resolve description text on‑demand via noticedesc endpoint.
3. Fetch and extract PDF attachments (best effort, cached).
4. Chunk text using requirement‑oriented keywords.
5. Embed chunks (sentence‑transformers) and retrieve top‑k via FAISS.
6. Build context: metadata + retrieved chunks + user profile.
7. Generate proposal with strict output structure.

### Prompt (System Prompt)
Documented in `docs/system-prompt.md`.

Prompt constraints:
1. Use only provided context.
2. No hallucinations.
3. “Not Provided” when info is missing.
4. Do not assume cybersecurity unless context or profile says so.
5. Output fixed headings.

### Guardrails and Evaluation
Guardrails implemented:
1. Section enforcement: if a required section is missing, it is appended with “Not Provided.”
2. Context gating: if no RFP content exists, only metadata context is used.

Planned evaluations:
1. Faithfulness to sources (citation agreement).
2. Completeness (all headings present).
3. Tone adherence (professional, compliant).

## Part 3: Design & “Lovable” UI (Experience)

### Proposal Review Screen
Implemented in `frontend/src/pages/ProposalReview.tsx`.

Key UX features:
1. Trust: citations drawer shows source excerpts and URLs used to generate content.
2. Iterative refinement: Regenerate, Edit, Expand buttons call backend refinement API.
3. Clean, modern layout with contextual metadata and AI actions.

### Prototype Link
Prototype link: https://v0.app/chat/proposal-review-screen-hZbs6h8eghS?ref=LYDNIE  
Local run instructions in `docs/prototype-link.md`.

## Implementation Notes
Backend:
1. `backend/routes/opportunities.py` exposes listings and detail.
2. `backend/routes/generate.py` generates and refines proposals.
3. `backend/services/rag_service.py` orchestrates enrichment and caching.

Frontend:
1. `frontend/src/pages/Index.tsx` renders live opportunities.
2. `frontend/src/pages/ProposalReview.tsx` generates and refines proposals.
3. `frontend/src/pages/Profile.tsx` saves user profile for RAG input.

## Limitations (Current)
1. Some SAM descriptions return 404 or 429; proposals fall back to metadata in those cases.
2. PDF extraction is best‑effort; some attachments may not parse cleanly.
3. Citations are per‑proposal, not per‑sentence, but show actual retrieved excerpts.

## Next Steps (Optional)
1. Add per‑sentence citations and highlight clauses inline.
2. Implement formal evaluation harness and automatic QA.
3. Add ranking / scoring that matches NAICS + past performance to opportunities.
