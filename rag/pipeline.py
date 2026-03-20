from rag.chunking import chunk_document
from rag.embedder import embed_chunks
from rag.retriver import add_embeddings, retrieve
from rag.generator import generate_proposal


def run_rag(rfp_text, user_profile):

    chunks = chunk_document(rfp_text)

    embeddings = embed_chunks(chunks)

    add_embeddings(embeddings, chunks)

    query_embedding = embed_chunks(["proposal requirements"])[0]
    relevant_chunks = retrieve(query_embedding)

    context = "\n".join(relevant_chunks)

    proposal = generate_proposal(context, user_profile)

    return proposal