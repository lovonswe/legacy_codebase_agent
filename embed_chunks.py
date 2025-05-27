import json
from sentence_transformers import SentenceTransformer

# Load chunked code
with open("chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

# Load embedding model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

results = []
for chunk in chunks:
    snippet = chunk["text"][:1000]  # Truncate long code
    embedding = model.encode(snippet).tolist()
    results.append({
        "metadata": {
            "type": chunk["type"],
            "startLine": chunk["startLine"],
            "endLine": chunk["endLine"]
        },
        "text": chunk["text"],
        "embedding": embedding
    })
    print(f"✅ Embedded {chunk['type']} ({chunk['startLine']}–{chunk['endLine']})")

with open("output_local.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("✅ Embeddings saved to output_local.json")
