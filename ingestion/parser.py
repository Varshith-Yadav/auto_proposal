import html
import re
from io import BytesIO
from typing import Optional

import requests
from pypdf import PdfReader

from ingestion.config import API_KEY


MAX_PDF_BYTES = 5_000_000


def parser_documents(opportunity: dict):
    parsed = {}

    description_text = _resolve_description_text(opportunity)
    if description_text:
        parsed["description_text"] = description_text

    document_texts = _resolve_document_texts(opportunity)
    if document_texts:
        parsed["document_texts"] = document_texts

    return parsed


def _resolve_description_text(opportunity: dict) -> str:
    cached = opportunity.get("description_text")
    if cached:
        return cached

    desc = opportunity.get("description") or ""
    if isinstance(desc, str) and desc.startswith("http"):
        text = _fetch_description(desc)
        return text or ""

    if isinstance(desc, str):
        return desc.strip()

    return ""


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


def _resolve_document_texts(opportunity: dict) -> list[dict]:
    documents = opportunity.get("documents") or []
    if not documents:
        return []

    cached = {item.get("url"): item.get("text") for item in opportunity.get("document_texts", []) if item.get("url")}
    collected = []

    for doc in documents:
        url = doc.get("url")
        if not url or not _is_pdf_document(doc, url):
            continue
        if url in cached and cached[url]:
            collected.append({"url": url, "text": cached[url], "title": doc.get("title")})
            continue

        text = _fetch_pdf_text(url)
        if text:
            collected.append({"url": url, "text": text, "title": doc.get("title")})

    return collected


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

    if len(resp.content) > MAX_PDF_BYTES:
        return None

    try:
        reader = PdfReader(BytesIO(resp.content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip()
    except Exception:
        return None


def _strip_html(value: str) -> str:
    unescaped = html.unescape(value)
    cleaned = re.sub(r"<[^>]+>", " ", unescaped)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()
