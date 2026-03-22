GovPreneurs Opportunity Ingestion Strategy

Scope
- Primary source: SAM.gov Opportunities API.
- Target object: GovPreneurs Opportunity (see opportunity-schema.json).

Freshness / Polling Strategy
- Poll SAM.gov on a fixed cadence (default: every 60 minutes).
- Use postedFrom/postedTo with a rolling window (currently 30 days) to capture new and recently modified notices.
- Normalize every record and compute a deterministic hash of key fields:
  - title, description, response_deadline, naics_codes, set_aside, notice_type
- If hash differs from stored value, mark as modified and update record.
- Maintain last_update timestamp on each record wrapper to support auditability.

Handling Modifications
- New noticeId: mark status = "new"
- Same noticeId, hash changed: status = "modified"
- Same noticeId, hash unchanged: status = "unchanged" (skip write)

Document / Attachment Ingestion
- Capture attachment metadata from known keys:
  - resourceLinks, attachments, fileLinks, documents
- Always store the description URL as a document with type "notice_description" if it exists.
- On-demand enrichment: when generating a proposal, resolve the description URL via the noticedesc endpoint and cache the extracted text as description_text to avoid repeated API calls and throttling.

Error Handling & Rate Limits
- If SAM returns 429 (throttle), skip enrichment and fall back to metadata-only context.
- If SAM returns 404 for a description, keep the URL but do not fail the pipeline.
- Any non-200 response is surfaced with full response text for debugging.

Storage
- Persist to data/opportunities.json as a map:
  - { noticeId: { data: <GovPreneursOpportunity>, hash, status, last_update } }

Notes / Future Enhancements
- Add webhook support if SAM.gov offers it (currently polling).
- Expand schema to include set-aside eligibility logic and scoring fields.
- Add PDF retrieval + text extraction for solicitations with document attachments.
