from rag.chunking import chunk_document
from rag.embedder import embed_chunks
from rag.retriver import add_embeddings, retrieve, reset_index
from rag.generator import generate_proposal


def build_context_and_citations(sources, metadata_context: str = ""):
    base_context = metadata_context.strip()
    metadata_chunks = []
    if base_context:
        metadata_chunks = chunk_document(
            base_context,
            source_id="metadata",
            source_title="Opportunity Metadata",
            source_url=None,
        )

    if not sources:
        citations = []
        if base_context:
            citations.append(
                {
                    "title": "Opportunity Metadata",
                    "url": None,
                    "excerpt": base_context[:240].strip(),
                }
            )
        return base_context, citations

    if isinstance(sources, str):
        sources = [{"id": "source-0", "title": "RFP Text", "url": None, "text": sources}]

    chunks = []
    chunks.extend(metadata_chunks)
    for source in sources:
        text = (source.get("text") or "").strip()
        if not text:
            continue
        chunks.extend(
            chunk_document(
                text,
                source_id=source.get("id"),
                source_title=source.get("title"),
                source_url=source.get("url"),
            )
        )

    if not chunks:
        return base_context, []

    reset_index()
    embeddings = embed_chunks(chunks)
    add_embeddings(embeddings, chunks)

    query_embedding = embed_chunks(["proposal requirements"])[0]
    relevant_chunks = retrieve(query_embedding)

    context = "\n".join(chunk.get("text", "") for chunk in relevant_chunks)
    if base_context:
        context = f"{base_context}\n\n{context}"

    citations = _build_citations(relevant_chunks)
    if base_context and not any(citation.get("title") == "Opportunity Metadata" for citation in citations):
        citations.append(
            {
                "title": "Opportunity Metadata",
                "url": None,
                "excerpt": base_context[:240].strip(),
            }
        )
    return context, citations


def run_rag(sources, user_profile, metadata_context: str = ""):
    context, citations = build_context_and_citations(sources, metadata_context)

    if not context:
        return generate_proposal("", user_profile), citations

    proposal = generate_proposal(context, user_profile)

    return proposal, citations


def _build_citations(chunks):
    citations = []
    seen = set()
    for chunk in chunks:
        url = chunk.get("source_url")
        title = chunk.get("source_title") or "Source"
        text = chunk.get("text", "")
        if not text:
            continue
        excerpt = text[:240].strip()
        key = (url, excerpt)
        if key in seen:
            continue
        seen.add(key)
        citations.append(
            {
                "title": title,
                "url": url,
                "excerpt": excerpt,
            }
        )
    return citations
