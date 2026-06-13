# Wikidoomia Sync Worker

Minimal Cloudflare Worker + KV store for **End-to-End encrypted** profile blobs. The server never sees plaintext — only opaque ciphertext addressed by `SHA-256(syncCode)`.

## One-time setup

1. Create a free [Cloudflare account](https://dash.cloudflare.com/sign-up) (no credit card required).
2. Install dependencies:

   ```bash
   cd worker
   npm install
   ```

3. Create KV namespaces and note the IDs:

   ```bash
   npx wrangler kv namespace create PROFILES
   npx wrangler kv namespace create PROFILES --preview
   ```

4. Paste the returned IDs into [`wrangler.toml`](wrangler.toml) (`id` and `preview_id`).

5. Deploy:

   ```bash
   npm run deploy
   ```

6. Copy the Worker URL (e.g. `https://wikidoomia-sync.<subdomain>.workers.dev`) into `SYNC_ENDPOINT` at the top of [`../index.html`](../index.html) (production GitHub Pages build).

## Local development

```bash
npm run dev
# Worker listens on http://localhost:8787
```

When the app is served from `localhost`, `SYNC_ENDPOINT` is auto-detected — no manual config needed.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/profile?id=<sha256-hex>` | Fetch encrypted blob |
| `PUT` | `/v1/profile` | Body: `{ id, data, updatedAt }` — max 256 KB |
| `OPTIONS` | `*` | CORS preflight |

## Cost

Cloudflare Free tier: 100k requests/day, KV 100k reads / 1k writes per day, 1 GB storage — sufficient for personal and classroom use at no charge.
