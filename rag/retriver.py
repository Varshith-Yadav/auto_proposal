import faiss
import numpy as np

INDEX_DIM = 384
index = faiss.IndexFlatL2(INDEX_DIM)

chunk_store = []


def reset_index(dim: int = INDEX_DIM):
    global index, chunk_store
    index = faiss.IndexFlatL2(dim)
    chunk_store = []


def add_embeddings(embeddings, chunks):
    global chunk_store
    if len(embeddings) == 0:
        return
    index.add(np.array(embeddings))
    chunk_store.extend(chunks)


def retrieve(query_embedding, top_k = 5):
    if index.ntotal == 0:
        return []
    D, I = index.search(np.array([query_embedding]), top_k)
    return [chunk_store[i] for i in I[0] if i < len(chunk_store)]

