/** Local mock of the Wikidoomia sync worker API (in-memory). For dev/testing without Cloudflare. */
import http from "node:http";

const store = new Map();
const MAX_BYTES = 256 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/v1/profile") {
    res.writeHead(404, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }
  if (req.method === "GET") {
    const id = url.searchParams.get("id");
    const val = id && store.get(id);
    if (!val) {
      res.writeHead(404, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    res.end(val);
    return;
  }
  if (req.method === "PUT") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (raw.length > MAX_BYTES) {
      res.writeHead(413, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "too large" }));
      return;
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad json" }));
      return;
    }
    const { id, data, updatedAt } = body;
    if (!id || typeof data !== "string") {
      res.writeHead(400, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "bad request" }));
      return;
    }
    store.set(
      id,
      JSON.stringify({ data, updatedAt: updatedAt || new Date().toISOString() })
    );
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(405, { ...CORS, "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "method not allowed" }));
});

const port = Number(process.env.PORT || 8787);
server.listen(port, () => {
  console.log(`Mock sync server on http://localhost:${port}`);
});
