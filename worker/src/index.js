/** Wikidoomia sync worker — stores E2E-encrypted profile blobs only (opaque to server). */

const MAX_BYTES = 256 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function isValidId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && /^[a-f0-9]+$/.test(id);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/v1/profile") {
      return json({ error: "not found" }, 404);
    }

    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!isValidId(id)) return json({ error: "bad id" }, 400);

      const stored = await env.PROFILES.get(id);
      if (!stored) return json({ error: "not found" }, 404);

      return new Response(stored, {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > MAX_BYTES) return json({ error: "too large" }, 413);

      const raw = await request.text();
      if (raw.length > MAX_BYTES) return json({ error: "too large" }, 413);

      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "bad json" }, 400);
      }

      const { id, data, updatedAt } = body;
      if (!isValidId(id)) return json({ error: "bad id" }, 400);
      if (typeof data !== "string" || !data) return json({ error: "bad data" }, 400);

      const record = JSON.stringify({
        data,
        updatedAt: typeof updatedAt === "string" ? updatedAt : new Date().toISOString(),
      });

      await env.PROFILES.put(id, record);
      return json({ ok: true });
    }

    return json({ error: "method not allowed" }, 405);
  },
};
