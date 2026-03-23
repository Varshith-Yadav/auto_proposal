# GovPreneurs AI PM Intern Case Study

Role: AI Product Management Intern  
Topic: Auto-Proposal Engine  
Goal: Enable a small business owner to go from "Finding an Opportunity" to "Drafting a Proposal" in under 10 minutes.

## Overview
This project designs and implements a full-stack AI system that combines:
- Structured data ingestion from SAM.gov
- A proposal-optimized RAG pipeline
- Strict prompt guardrails for compliance
- A modern UI for trust and iterative refinement

The system is optimized for accuracy, traceability, and user trust, which are critical in government contracting workflows.

## Part 1: Data Integration Strategy (Plumbing)

### Source Analysis
Primary source: SAM.gov Opportunities API

Key constraints:
- Metadata is incomplete
- Full descriptions require the noticedesc endpoint
- Critical requirements exist in PDF attachments (RFPs)

Therefore, ingestion must support:
- Multi-step enrichment
- Incremental updates
- Document extraction

### GovPreneurs Opportunity Schema
Design principle: The schema is designed not just for storage, but to optimize downstream AI tasks like retrieval, matching, and proposal generation.

Key structure:
```json
{
  "id": "string",
  "title": "string",
  "agency": { "name": "string", "code": "string" },

  "naics_codes": ["string"],
  "set_aside": "string",
  "notice_type": "string",

  "response_deadline": "ISO8601",

  "raw_data": {
    "description_url": "string",
    "documents": [{ "url": "string", "type": "pdf" }]
  },

  "processed_data": {
    "description_text": "string",
    "document_texts": ["string"],
    "chunks": ["string"]
  },

  "status": "new | modified | unchanged",
  "version": 1,

  "source": "sam.gov"
}
```

### Ingestion Strategy
Architecture: SAM.gov -> Fetch -> Normalize -> Change Detection -> Enrichment -> Store -> Backend

Key design decisions:
1. Incremental polling
- Poll every hour using postedFrom
- Avoid full refresh
2. Change detection (hashing)
- Hash key fields: title, deadline, naics, set-aside, notice_type
- Detect: new / modified / unchanged
3. Versioning (important)
- Each update creates a new version
- Prevents stale proposal generation
- Versioning ensures traceability and prevents outdated proposals

### Data Enrichment
We enrich opportunities using multi-source data retrieval in priority order:
- Parsed RFP PDFs (source of truth)
- Full description (noticedesc endpoint)
- Short metadata (fallback)

Key insight: RFP documents are treated as the authoritative source of requirements, not metadata.

### Efficiency Optimization
- PDF extraction is on-demand + cached
- Avoids SAM.gov rate limits
- Reduces unnecessary processing

## Part 2: RAG Workflow & Prompt Engineering

### RAG Architecture
Sources -> Chunking -> Embedding -> Retrieval -> Matching -> Generation

### Context Construction
The system builds context from:
- Parsed RFP documents
- Full descriptions
- Opportunity metadata
- User profile

### Chunking Strategy (Upgraded)
Instead of naive splitting:
- Section-aware chunking: Requirements, Scope of Work, Evaluation Criteria, Submission Instructions

Why this matters:
Section-aware chunking improves retrieval precision and ensures requirement-level grounding.

### Retrieval
- Embeddings via sentence-transformers
- FAISS for vector search
- Retrieve top-k relevant chunks

### Requirement -> Capability Matching (Critical)
Before generation:
- Extract requirements from RFP
- Match with user capabilities and past performance

Key insight: The system explicitly maps RFP requirements to user capabilities before generation, ensuring proposals are aligned and non-generic.

### Proposal Generation
Input to LLM:
- Retrieved context
- User profile

Output:
- Executive Summary
- Technical Approach
- Past Performance Mapping
- Compliance Checklist

### Prompt Design
Objectives:
- Prevent hallucination
- Enforce compliance tone
- Ensure structured output
- Maintain traceability

Key rules:
- Use only provided context
- No assumptions
- If missing -> "Information Not Provided"

Improved behavior:
If partial information exists, the system generates using available context and explicitly marks missing portions.
This avoids empty sections and overly strict outputs.

### Guardrails and Evaluation
Guardrails:
- Section enforcement (all headings must exist)
- Context gating (no context -> no assumptions)

Evaluation metrics:
- Faithfulness: claims must match retrieved context
- Completeness: all sections present
- Tone: professional and compliant

Key addition:
Each generated claim is validated against retrieved context to minimize hallucination risk.

## Part 3: UI and Experience (Lovable Product)

### Proposal Review Screen
Layout:
- Left: Proposal Sections
- Right: AI Chat and Controls

### Key UX Features
1. Trust
- Citation drawer
- Source excerpts
- Document references
- Users can verify exactly where each claim comes from

2. Iterative Refinement
- Regenerate
- Expand
- Edit
- Enables control over AI output

3. Section-Based Editing
- No large text blobs
- Structured, editable sections

4. Missing Data Transparency (Important)
Instead of hiding gaps, the UI explicitly communicates missing information to maintain user trust.

Example:
This section is partially generated due to missing RFP data.

### Design Goal
Balance automation with control, allowing users to trust, verify, and refine AI-generated proposals.

## Limitations
- Some SAM.gov descriptions return 404/429
- PDF extraction may fail for certain formats
- Citations are per-section, not per-sentence

## Future Improvements
- Per-sentence citations with highlighting
- Automated evaluation pipeline
- Opportunity ranking based on fit score
- Better document parsing (tables, diagrams)

## Final Summary
This system is designed not just to generate proposals, but to make them accurate, verifiable, and usable in real-world government workflows. It connects data, AI, and UX into a single, scalable product system.
