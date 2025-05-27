import json
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import os
# from google.generativeai import configure, GenerativeModel
import google.generativeai as genai

import json

with open("output_local.json") as f:
    data = json.load(f)

dims = set(len(item["embedding"]) for item in data)
print("Unique embedding dimensions found:", dims)


# client = chromadb.Client(Settings(
#     persist_directory="chroma",  # Save vectors here
#     anonymized_telemetry=False
# ))
client = chromadb.PersistentClient()

collection = client.get_or_create_collection(name="legacy-code")
# collection = client.create_collection(name="legacy-code")

with open("output_local.json") as f:
    data = json.load(f)

for i, chunk in enumerate(data):
    collection.add(
        ids=[f"chunk-{i}"],
        documents=[chunk["text"]],
        metadatas=[chunk["metadata"]],
        embeddings=[chunk["embedding"]]
    )
    print(f"Stored chunk {i+1}/{len(data)}: {chunk['metadata']['type']} ({chunk['metadata']['startLine']}–{chunk['metadata']['endLine']})")
    print(collection.get(ids=[f"chunk-{i}"]))
# Explicitly persist to disk
# client.persist()

print("✅ All vectors stored in Chroma.")

total_record_stored = collection.count()
print(f"Total records stored in Chroma: {total_record_stored}")




print("querying...")
# Load sentence-transformers model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Natural language query
query = "tell me about the Homepage"
embedding = model.encode(query).tolist()

# Perform semantic search
results = collection.query(query_embeddings=[embedding], n_results=10)
print(results)

# Show results
for text, metadata in zip(results["documents"][0], results["metadatas"][0]):
    print(f"\n🔍 {metadata['type']} ({metadata['startLine']}–{metadata['endLine']})")
    print(text[:300])  # Preview


genai.configure(api_key="AIzaSyBXvW4XfrL-uIIaAYkCHGxk4yN3_CGXPJw")  # Replace with your actual key
print(os.getenv("GEMINI_API_KEY"))
# Initialize model
model = genai.GenerativeModel("gemini-1.5-flash-latest")

# Gather relevant context
retrieved_texts = "\n\n".join(results["documents"][0])
prompt = f"""You are a helpful code assistant. Use the following JavaScript code context to answer the user's question.

=== CODE SNIPPETS ===
{retrieved_texts}

=== USER QUESTION ===
{query}
"""

# Generate answer from Gemini
response = model.generate_content(prompt)
print("\n💬 Gemini Response:\n")
print(response.text)
