import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import express from "express";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());

const client = new QdrantClient({ host: "localhost", port: 6333 });
const sessions = new Map(); // sessionId -> transport

function createServer() {
  const server = new Server(
    { name: "atlas-memory", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "store_memory",
        description: "Save technical context or decisions to the shared atlas brain",
        inputSchema: {
          type: "object",
          properties: { content: { type: "string", description: "The context or decision to store" } },
          required: ["content"]
        }
      },
      {
        name: "search_memory",
        description: "Search the shared atlas brain for stored context",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", description: "What to search for" } },
          required: ["query"]
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "store_memory") {
      await client.upsert("long_term_memory", {
        points: [{
          id: randomUUID(),
          vector: new Array(1536).fill(0),
          payload: { text: args.content, timestamp: new Date().toISOString() }
        }]
      });
      return { content: [{ type: "text", text: "Saved to shared brain." }] };
    }

    if (name === "search_memory") {
      const result = await client.scroll("long_term_memory", {
        filter: {},
        limit: 10,
        with_payload: true
      });
      const matches = result.points
        .map(p => p.payload.text)
        .filter(t => t.toLowerCase().includes(args.query.toLowerCase()));
      return { content: [{ type: "text", text: matches.length ? matches.join("\n---\n") : "No matches found." }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  });

  return server;
}

// Each agent gets its own isolated session
app.get("/sse", async (req, res) => {
  const sessionId = randomUUID();
  const server = createServer();
  const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
  sessions.set(sessionId, transport);
  res.on("close", () => sessions.delete(sessionId));
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const { sessionId } = req.query;
  const transport = sessions.get(sessionId);
  if (!transport) return res.status(404).json({ error: "Session not found" });
  await transport.handlePostMessage(req, res);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", sessions: sessions.size });
});

app.listen(3000, () => console.log("Atlas Memory Brain live on port 3000"));
