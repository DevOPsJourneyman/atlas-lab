from qdrant_client import QdrantClient

# Replace with your atlas-mcp IP
client = QdrantClient(host="<ATLAS-MCP-IP>", port=6333)

try:
    collections = client.get_collections()
    print("Successfully connected to the Brain!")
    print(f"Current Collections: {collections}")
except Exception as e:
    print(f"Connection failed: {e}")
