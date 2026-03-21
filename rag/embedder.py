from sentence_transformers import SentenceTransformer


model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_chunks(chunks):
    if not chunks:
        return []
    if isinstance(chunks[0], dict):
        texts = [chunk.get("text", "") for chunk in chunks]
    else:
        texts = chunks
    return model.encode(texts)

