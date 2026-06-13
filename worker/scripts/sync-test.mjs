/**
 * Integration test: E2E crypto + mock sync server round-trip + merge logic smoke test.
 * Run: node worker/scripts/sync-test.mjs
 */
import http from "node:http";
import { webcrypto } from "node:crypto";

const crypto = webcrypto;
const store = new Map();
const PORT = 9876;
const ENDPOINT = `http://127.0.0.1:${PORT}`;

function json(res, status, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ENDPOINT);
  if (url.pathname !== "/v1/profile") return json(res, 404, { error: "not found" });
  if (req.method === "GET") {
    const id = url.searchParams.get("id");
    const val = id && store.get(id);
    if (!val) return json(res, 404, { error: "not found" });
    res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
    res.end(val);
    return;
  }
  if (req.method === "PUT") {
    const raw = await new Promise((r) => {
      const c = [];
      req.on("data", (d) => c.push(d));
      req.on("end", () => r(Buffer.concat(c).toString("utf8")));
    });
    const body = JSON.parse(raw);
    store.set(body.id, JSON.stringify({ data: body.data, updatedAt: body.updatedAt }));
    return json(res, 200, { ok: true });
  }
  json(res, 405, { error: "method not allowed" });
});

function normalizeSyncCode(code) {
  return String(code || "").trim().toUpperCase();
}
async function deriveAddress(code) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeSyncCode(code)));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function deriveKey(code) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(normalizeSyncCode(code)), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("wikidoomia-sync"), info: enc.encode("v1") },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encryptBlob(plaintext, code) {
  const key = await deriveKey(code);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), iv.length);
  return Buffer.from(out).toString("base64");
}
async function decryptBlob(b64, code) {
  const key = await deriveKey(code);
  const raw = Buffer.from(b64, "base64");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  return new TextDecoder().decode(pt);
}

function mergeMaxObjects(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) out[k] = Math.max(out[k] || 0, v || 0);
  return out;
}

await new Promise((r) => server.listen(PORT, r));

const code = "WD-AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD";
const wrongCode = "WD-11111111-22222222-33333333-44444444";
const profileA = {
  wf_profile: JSON.stringify({ seeds: { "de::Berlin": 5 }, cats: { Geschichte: 3 } }),
  wf_stars: JSON.stringify({ Berlin: { title: "Berlin" } }),
};
const profileB = {
  wf_profile: JSON.stringify({ seeds: { "de::Berlin": 8, "de::Paris": 2 }, cats: { Kunst: 4 } }),
  wf_stars: JSON.stringify({ Paris: { title: "Paris" } }),
};

const payloadA = { updatedAt: "2026-06-10T10:00:00.000Z", data: profileA };
const encA = await encryptBlob(JSON.stringify(payloadA), code);
const id = await deriveAddress(code);

let res = await fetch(`${ENDPOINT}/v1/profile`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id, data: encA, updatedAt: payloadA.updatedAt }),
});
if (!res.ok) throw new Error("PUT failed");

const stored = store.get(id);
if (!stored || stored.includes("Berlin")) throw new Error("KV must store ciphertext only, not plaintext");

res = await fetch(`${ENDPOINT}/v1/profile?id=${id}`);
const remote = await res.json();
const pulled = JSON.parse(await decryptBlob(remote.data, code));
if (pulled.data.wf_profile !== profileA.wf_profile) throw new Error("decrypt round-trip failed");

try {
  await decryptBlob(remote.data, wrongCode);
  throw new Error("wrong code should fail decrypt");
} catch (e) {
  if (e.message === "wrong code should fail decrypt") throw e;
}

const lp = JSON.parse(profileA.wf_profile);
const rp = JSON.parse(profileB.wf_profile);
const merged = {
  wf_profile: JSON.stringify({
    seeds: mergeMaxObjects(lp.seeds, rp.seeds),
    cats: mergeMaxObjects(lp.cats, rp.cats),
  }),
};
if (JSON.parse(merged.wf_profile).seeds["de::Berlin"] !== 8) throw new Error("merge max failed");

console.log("OK sync-test: E2E encrypt/decrypt, ciphertext storage, wrong-code rejection, merge max");
server.close();
