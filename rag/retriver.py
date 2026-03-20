import faiss
import numpy as np

index = faiss.IndexFlatL2(384)

chunk_store = []

def add_embeddings(embeddings, chunks):
    global chunk_store
    index.add(np.array(embeddings))
    chunk_store.extend(chunks)


def retrieve(query_embedding, top_k = 5):
    D, I = index.search(np.array([query_embedding]), top_k)
    return [chunk_store[i] for i in I[0]]

