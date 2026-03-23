import html
import re
from io import BytesIO
from typing import Optional

import requests
from pypdf import PdfReader

from rag.pipeline import run_rag, build_context_and_citations
from rag.generator import refine_section
from ingestion.store import load_db, save_db
from ingestion.config import API_KEY


def generate_proposal(opportunity_id: str, user_profile: dict):
    db = load_db()

    if opportunity_id not in db :
        raise Exception("Opportunity not found")
    
    opportunity = db[opportunity_id]["data"]

    sources = _build_sources(opportunity_id, opportunity, db)
    metadata_context = _build_metadata_context(opportunity)

    proposal, citations = run_rag(sources, user_profile, metadata_context=metadata_context)

    return proposal, citations


def refine_proposal_section(opportunity_id: str, user_profile: dict, section_title: str, section_text: str, instruction: str | None, action: str | None):
    db = load_db()
    if opportunity_id not in db:
        raise Exception("Opportunity not found")

    opportunity = db[opportunity_id]["data"]
    sources = _build_sources(opportunity_id, opportunity, db)
    metadata_context = _build_metadata_context(opportunity)

    context, citations = build_context_and_citations(sources, metadata_context=metadata_context)
    updated_section = refine_section(
        context=context,
        user_profile=user_profile,
        section_title=section_title,
        section_text=section_text,
        instruction=instruction,
        action=action,
    )
    return updated_section, citations


def _build_metadata_context(opportunity: dict) -> str:
    lines = [
        f"OPPORTUNITY TITLE: {opportunity.get('title')}",
        f"SOLICITATION NUMBER: {opportunity.get('solicitation_number')}",
        f"NOTICE TYPE: {opportunity.get('notice_type')}",
        f"SET ASIDE: {opportunity.get('set_aside_description') or opportunity.get('set_aside')}",
        f"AGENCY: {(opportunity.get('agency') or {}).get('name')}",
        f"DEADLINE: {opportunity.get('response_deadline')}",
        f"POSTED DATE: {opportunity.get('posted_date')}",
        f"NAICS CODES: {', '.join(opportunity.get('naics_codes') or [])}",
        f"AWARD AMOUNT: {(opportunity.get('award') or {}).get('amount')}",
        f"AWARDEE: {((opportunity.get('award') or {}).get('awardee') or {}).get('name')}",
        f"SUMMARY: {opportunity.get('short_description')}",
        f"STATUS: {opportunity.get('status')}",
    ]
    return "\n".join(line for line in lines if line and line.split(": ", 1)[-1] not in ("None", ""))


def _resolve_description_text(opportunity_id: str, opportunity: dict, db: dict) -> str:
    cached = opportunity.get("description_text")
    if cached:
        return cached

    desc = opportunity.get("description") or ""
    if isinstance(desc, str) and desc.startswith("http"):
        text = _fetch_description(desc)
        if text:
            opportunity["description_text"] = text
            db[opportunity_id]["data"] = opportunity
            save_db(db)
            return text
        return ""

    return str(desc)


def _fetch_description(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, params={"api_key": API_KEY}, timeout=30)
    except Exception:
        return None

    if resp.status_code != 200:
        return None

    try:
        payload = resp.json()
    except ValueError:
        return _strip_html(resp.text)

    text = payload.get("description") or payload.get("Description")
    if not text:
        return None
    return _strip_html(text)


def _strip_html(value: str) -> str:
    unescaped = html.unescape(value)
    cleaned = re.sub(r"<[^>]+>", " ", unescaped)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _resolve_document_texts(opportunity_id: str, opportunity: dict, db: dict) -> list[dict]:
    documents = opportunity.get("documents") or []
    if not documents:
        return []

    cached = {item.get("url"): item.get("text") for item in opportunity.get("document_texts", []) if item.get("url")}
    collected = []
    updated_entries = []

    for doc in documents:
        url = doc.get("url")
        if not url or not _is_pdf_document(doc, url):
            continue
        if url in cached and cached[url]:
            collected.append({"title": doc.get("title") or "Attachment", "url": url, "text": cached[url]})
            continue

        text = _fetch_pdf_text(url)
        if text:
            collected.append({"title": doc.get("title") or "Attachment", "url": url, "text": text})
            updated_entries.append({"url": url, "text": text})

    if updated_entries:
        opportunity.setdefault("document_texts", [])
        opportunity["document_texts"].extend(updated_entries)
        db[opportunity_id]["data"] = opportunity
        save_db(db)

    return collected


def _build_sources(opportunity_id: str, opportunity: dict, db: dict) -> list[dict]:
    sources = []

    # Priority: parsed PDF text first
    for idx, doc in enumerate(_resolve_document_texts(opportunity_id, opportunity, db)):
        sources.append(
            {
                "id": f"{opportunity_id}-doc-{idx}",
                "title": doc.get("title") or "Attachment",
                "url": doc.get("url"),
                "text": doc.get("text"),
            }
        )

    # Then full description
    description_text = _resolve_description_text(opportunity_id, opportunity, db)
    if description_text:
        sources.append(
            {
                "id": f"{opportunity_id}-desc",
                "title": "Opportunity Description",
                "url": opportunity.get("description") if isinstance(opportunity.get("description"), str) else None,
                "text": description_text,
            }
        )

    # Then short description fallback
    short_description = opportunity.get("short_description")
    if isinstance(short_description, str) and short_description.strip():
        sources.append(
            {
                "id": f"{opportunity_id}-short",
                "title": "Opportunity Summary",
                "url": None,
                "text": short_description.strip(),
            }
        )

    return sources


def _is_pdf_document(doc: dict, url: str) -> bool:
    doc_type = str(doc.get("type") or "").lower()
    if "pdf" in doc_type:
        return True
    return url.lower().endswith(".pdf")


def _fetch_pdf_text(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, params={"api_key": API_KEY}, timeout=30)
    except Exception:
        return None

    if resp.status_code != 200:
        return None

    if len(resp.content) > 5_000_000:
        return None

    try:
        reader = PdfReader(BytesIO(resp.content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip()
    except Exception:
        return None

