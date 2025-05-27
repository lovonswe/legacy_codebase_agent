import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Initialize Chroma client and collection
client = chromadb.Client(Settings(persist_directory="chroma"))
collection = client.get_or_create_collection(name="legacy-code")

total_record_stored = collection.count()
print(f"Total records stored in Chroma: {total_record_stored}")
# If you want to use a specific persist directory, uncomment the line below

# Load sentence-transformers model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Natural language query
query = "Find the function that merges multiple JavaScript objects."
embedding = model.encode(query).tolist()

# Perform semantic search
results = collection.query(query_embeddings=[embedding], n_results=5)
print(results)

# Show results
for text, metadata in zip(results["documents"][0], results["metadatas"][0]):
    print(f"\n🔍 {metadata['type']} ({metadata['startLine']}–{metadata['endLine']})")
    print(text[:300])  # Preview

