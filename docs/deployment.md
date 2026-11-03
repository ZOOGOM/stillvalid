# Deployment and live API setup

Choose **GitHub + Vercel + Upstash Redis** for deployment without maintaining a server. The application also supports a single Node.js 24 process with persistent SQLite storage through Docker Compose. GitHub Pages alone cannot run the protected Meta API routes.

## Vercel Git deployment

Import `ZOOGOM/stillvalid` into a new Vercel project and connect its Git integration. Vercel can build and deploy pushes independently of GitHub Actions. The user reports that the Actions quota is exhausted; CI status has not been independently verified. Run local `npm run check`, `npm run build`, and `npm run test:browser` before pushing; the browser test needs a running app and Chromium. Vercel does not wait for those local checks or the GitHub checks before deploying.

The current `main` contains setup documentation, while the application is on `feat/stillvalid-webapp`. For a new review project, set its Production Branch in the Vercel project's Git settings to `feat/stillvalid-webapp`, then redeploy that branch or push a new commit. The initial import may try `main` and fail before this setting is changed. Once the app is merged into `main`, change the Production Branch back to `main`. The Git integration needs no `VERCEL_TOKEN`, `VERCEL_ORG_ID`, or `VERCEL_PROJECT_ID`; CLI alternatives are described in the [Korean setup guide](deployment.ko.md).

The UI, location control and synthetic examples can be reviewed without application secrets. For live checks, register `META_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel for the relevant environment; live checks fail closed without Meta or shared storage. After Vercel issues an HTTPS domain, set production `APP_URL` to its exact origin and redeploy. Leave it unset for independent preview domains or set their own exact origin. Configure Deployment Protection so the intended review URL is accessible externally and test it in a separate browser before giving it to Claude. Do not put passwords or bypass tokens in chat or documentation.

Vercel runs server-side functions and hosts the interface; GitHub stores source and triggers deployments. Redis holds expiring results and atomic request/concurrency counters shared between function instances. No always-on server purchase is required. Provider plans, quotas and Meta API charges still apply separately.

See [Vercel Git integration](https://vercel.com/docs/git), [Deployment Protection](https://vercel.com/docs/deployment-protection), and [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi). Hosted accounts and secrets are not created by the code. No Vercel deployment or hosted Redis connection has been verified, and no hosted URL is available yet.

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
