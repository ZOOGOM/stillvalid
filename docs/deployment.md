# Deployment and live API setup

Choose **GitHub + Vercel + Upstash Redis** for deployment without maintaining a server. The application also supports a single Node.js 24 process with persistent SQLite storage through Docker Compose. GitHub Pages alone cannot run the protected Meta API routes.

## Recommended GitHub deployment

1. Review/merge the application branch, then import `ZOOGOM/stillvalid` into Vercel using your GitHub account. Use the Next.js framework preset. Node.js 24 is specified in `package.json`.
2. Connect an Upstash Redis database through your Vercel storage/integration setup. Register its `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-only environment variables.
3. Register `META_API_KEY`. Set production `APP_URL` to the exact deployed HTTPS origin; leave it unset on independent preview domains or use their own origin.
4. Deploy the application commit. The synthetic examples remain available without secrets; live checks fail closed if Meta or shared storage is not configured.
5. Test live extraction, official-source retrieval, comparisons, cross-session isolation and deletion before using the URL for judging.

Vercel runs server-side functions and hosts the interface; GitHub stores source and triggers deployments. Redis holds expiring results and atomic request/concurrency counters shared between function instances. No always-on server purchase is required. Provider plans, quotas and Meta API charges still apply separately.

See [Vercel's GitHub integration](https://vercel.com/docs/git/vercel-for-github) and [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi). Hosted accounts and secrets are not created by the code. The Redis implementation has in-memory Lua behavior tests, not a verified hosted-provider deployment.

## Local development

```bash
npm ci
cp .env.example .env.local
# Edit .env.local to set META_API_KEY; do not commit it.
npm run dev
npm run verify:meta
```

The interface and three synthetic examples work without a key. Live input is never silently routed to a fake model. The verification command checks account/model availability without an inference request; then test image extraction, source discovery and comparison through the UI using a public notice.

## Configuration

| Variable | Purpose |
| --- | --- |
| `META_API_KEY` | Server secret; `MODEL_API_KEY` is an accepted alias. |
| `META_MODEL` | Default `muse-spark-1.3`, Standard mode. |
| `UPSTASH_REDIS_REST_URL` | Shared Redis REST endpoint for serverless deployment. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only Redis token. Both Redis variables are required together. |
| `APP_URL` | Exact external origin, such as `https://your-domain.example`; controls origin checks and secure cookies. |
| `DATABASE_PATH` | Persistent writable SQLite file. Compose sets `/app/data/stillvalid.sqlite`. |
| `DAILY_MODEL_CALL_LIMIT` | Global paid model requests per UTC day, default 100; not a monetary cap. |
| `VERIFIED_SOURCE_HOSTS` | Additional independently verified institution domains, comma-separated without wildcards. |

Meta's built-in web search is used through Responses; a separate search key is not needed. Registered domains still undergo notice identity and quote checks. Unknown authority remains a review result.

## Docker

Prepare an untracked environment file with the key and production HTTPS `APP_URL`:

```bash
docker compose --env-file .env.local up --build -d
```

For this alternative, place the service behind an HTTPS reverse proxy. Preserve the SQLite data volume and use one replica unless shared Redis is configured. Domain registration and TLS termination are not included. Test the URL from another browser: cookies, session isolation, deletion, source retrieval and API credits. Keep access available through judging.

## Networking

The Meta adapter needs approved HTTPS access to `api.meta.ai`. Source retrieval needs public DNS resolution and direct HTTPS egress to institution domains. It pins source connections to validated public DNS addresses and checks redirects. Unsafe/private/loopback addresses and credential-bearing URLs are rejected.

A generic forward proxy cannot preserve destination pinning, so source retrieval fails closed when `HTTP_PROXY` or `HTTPS_PROXY` is configured. The fixed-host Meta adapter supports the configured egress proxy. Preserve the authoring environment's network controls; use its supported configuration workflow for denied destinations, not a proxy bypass.

The inspected authoring environment did not provide the Sites starter/publishing helper. No hosted service URL is claimed. Verify the Docker image on the selected host before production use.

## Data and operations

StillValid does not save original image files. Results contain necessary input/source quotes and are accessible only to their anonymous-session cookie holder for up to 24 hours. Expiry is checked before reads; SQLite uses periodic/startup cleanup and Redis uses key TTL. Individual and session-wide deletion are available in the UI. Backups, provider retention and forensic recovery are outside the app's deletion guarantee.

Monitor credits, provider errors, request allowance, disk space and availability. Logs contain error codes, check IDs and durations, not raw notices or credentials. The app permits three concurrent checks, tries at most three source candidates and compares at most two retrieved sources per check. A global request ceiling does not guarantee a dollar billing ceiling.

## Official API references

- [Models](https://dev.meta.ai/docs/models)
- [Image understanding](https://dev.meta.ai/docs/image-understanding)
- [Structured output](https://dev.meta.ai/docs/structured-output)
- [Search grounding](https://dev.meta.ai/docs/search-grounding)
