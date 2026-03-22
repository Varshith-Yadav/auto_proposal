GovPreneurs RAG Workflow (Auto-Proposal Engine)

Inputs
- Opportunity data from SAM.gov (title, agency, deadline, NAICS, set-aside, etc.)
- Opportunity documents (description URL + attachments)
- User profile (company name, capabilities, past performance)

Workflow Steps
1. Ingestion
   - Poll SAM.gov and normalize to GovPreneurs Opportunity schema.
   - Store description URL and document metadata.

2. Context Enrichment
   - Resolve description URL (noticedesc endpoint) when generating a proposal.
   - Fetch PDF attachments (if available) and extract text.
   - Cache extracted text to avoid repeated API calls.

3. Chunking
   - Split RFP text into topical chunks using requirement-oriented keywords.
   - Preserve sections around scope, eligibility, evaluation, submission.

4. Embeddings + Retrieval
   - Embed chunks using sentence-transformers.
   - Store in FAISS for similarity search.
   - Retrieve top-k chunks relevant to “proposal requirements”.

5. Prompt Assembly
   - Build metadata context (title, agency, deadline, NAICS).
   - Combine metadata with retrieved chunks.
   - Inject user profile.

6. Generation
   - LLM: OpenAI `gpt-4o-mini` (configurable via `OPENAI_MODEL`).
   - Output strict section headings:
     - Executive Summary
     - Technical Approach
     - Past Performance
     - Compliance Checklist

Guardrails (Current)
- Prompt explicitly disallows hallucinations.
- If a section is missing, auto-append “Not Provided.”
- If context is thin, metadata is still included to avoid generic outputs.

Future Enhancements
- Cross-citation to source passages.
- Evaluations: faithfulness, completeness, and tone adherence.
- Multi-document routing + summarization for long RFPs.
