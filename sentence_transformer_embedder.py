from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

# Load the embedding model (384-dimensional)
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Example input
text = "function that handles HTTP requests in Java"

# Get embedding
embedding = model.encode(text).tolist()
print(embedding)


# Connect to Chroma
client = chromadb.Client(Settings(persist_directory="./chroma_store", anonymized_telemetry=False))
collection = client.get_or_create_collection("code_chunks")

# Add document
collection.add(
    documents=[text],
    embeddings=[embedding],
    ids=["doc_1"]
)

query = "http handler function"
query_embedding = model.encode(query).tolist()

results = collection.query(
    query_embeddings=[query_embedding],
    n_results=3
)

print(results["documents"][0])
