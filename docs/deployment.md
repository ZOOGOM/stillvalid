# Deployment and live API setup

Choose **GitHub + Vercel + Upstash Redis** for deployment without maintaining a server. The application also supports a single Node.js 24 process with persistent SQLite storage through Docker Compose. GitHub Pages alone cannot run the protected Meta API routes.

## Vercel Git deployment

The existing `stillvalid` Vercel project is connected to `ZOOGOM/stillvalid` through native Git integration. Vercel builds pushes independently of GitHub Actions; the user reports that the Actions quota is exhausted. Run local `npm run check`, `npm run build`, and `npm run test:browser` before pushing; the browser test needs a running app and Chromium. Vercel does not wait for those local checks or the GitHub checks before deploying.

The known production URL is [https://stillvalid-beta.vercel.app](https://stillvalid-beta.vercel.app). The `main` branch contains the application. Feature-branch pushes create previews through Git integration. Verify the branch, commit and deployment status for each review; do not assume a branch setting was changed or a merge occurred. An explicitly deployed production revision can be ahead of `main`; record its exact source commit. Git integration needs no `VERCEL_TOKEN`, `VERCEL_ORG_ID`, or `VERCEL_PROJECT_ID`; CLI alternatives are described in the [Korean setup guide](deployment.ko.md).

The UI, location control and synthetic examples can be reviewed without application secrets. `META_API_KEY` is registered for Production only; set `META_MODEL=muse-spark-1.3-contributor` for the owner-selected contributor configuration, with the three per-step model variables unset; Preview needs its own Meta configuration to perform live checks. Upstash was connected through Vercel Marketplace, which provided `KV_REST_API_URL` and `KV_REST_API_TOKEN` for Production and Preview. The app accepts that pair automatically, or the canonical `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` pair. Use the full, writable REST token, not `KV_REST_API_READ_ONLY_TOKEN`; raw `REDIS_URL` and `KV_URL` are not used. If both complete pairs are configured, the canonical pair takes precedence and should point to the same database. An incomplete selected pair fails closed; URL and token are never mixed across pairs. Meta or shared storage configuration is required for live checks. Environment changes require a new deployment to take effect.

Set production `APP_URL` to the exact external origin and redeploy; leave it unset for independent preview domains or set their own exact origin. Configure Deployment Protection so the intended review URL is accessible externally and test it in a separate browser before giving it to Claude. Do not put keys, tokens, passwords or bypass tokens in chat or documentation.

Use Vercel Authentication **Standard Protection** (`ssoProtection.deploymentType=prod_deployment_urls_and_all_previews`): production domains remain public while generated production deployment URLs and previews require access. The project setting was applied and read back through Vercel's API; external HTTP enforcement remains a separate check. Keep this protection when retiring versions: old deployments retain their old API behavior and environment. New Redis execution metadata uses a versioned namespace to prevent old deletion code from freeing current work leases, but that alone does not prevent old APIs from making provider calls. Use the public production domain for external review, not a protected generated deployment URL. See [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

The hosting build runs `npm run vercel-build`. By default its hosted probe is skipped. For one reviewed production deployment, set `STILLVALID_VERIFY_DEPLOYMENT=1` to require a real Redis PING/write/read/delete check and one actual Meta text extraction using a visibly synthetic diagnostic notice and the global request allowance. Failure stops that build; a previous production deployment remains available. Logs contain only a fixed phase, numeric provider status and safe success flags. Reset the flag to `0` after the check, and rebuild after changing credentials. This probe does not validate images, search, official sources, real-notice accuracy or browser access.

Vercel runs server-side functions and hosts the interface; GitHub stores source and triggers deployments. Redis holds expiring results and atomic request/concurrency counters shared between function instances. No always-on server purchase is required. Provider plans, quotas and Meta API charges still apply separately.

See [Vercel Git integration](https://vercel.com/docs/git), [Deployment Protection](https://vercel.com/docs/deployment-protection), and [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi). Marketplace connection and environment registration do not prove app connectivity. Check the deployment's opt-in probe result in its build logs, then validate the complete public-notice flow separately.

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

| Variable                                                              | Purpose                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `META_API_KEY`                                                        | Server secret; `MODEL_API_KEY` is an accepted alias.                                                                                                                                        |
| `META_MODEL`                                                          | Common Spark model for reading, search and comparison. Fallback when unset/blank: `muse-spark-1.3-contributor`. Redeploy after changing it; check the privacy notice before a model change. |
| `META_EXTRACTION_MODEL`, `META_SEARCH_MODEL`, `META_COMPARISON_MODEL` | Optional per-step overrides, higher priority than `META_MODEL`. Leave unset for a single switch; blank values fall back to the common setting.                                              |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                  | Canonical shared Redis REST endpoint and writable server-only token, required together.                                                                                                     |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN`                                | Marketplace aliases accepted together when the canonical pair is absent.                                                                                                                    |
| `APP_URL`                                                             | Exact external origin, such as `https://your-domain.example`; controls origin checks and secure cookies.                                                                                    |
| `DATABASE_PATH`                                                       | Persistent writable SQLite file. Compose sets `/app/data/stillvalid.sqlite`.                                                                                                                |
| `DAILY_MODEL_CALL_LIMIT`                                              | Global paid model requests per UTC day, default 300 (raised from 100 for testing on 2026-11-04; set this variable to lower it); not a monetary cap.                                         |
| `VERIFIED_SOURCE_HOSTS`                                               | Additional independently verified institution domains, comma-separated without wildcards.                                                                                                   |

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

Verify the Docker image on the selected host before production use.

## Data and operations

StillValid does not save original image files. Results contain necessary input/source quotes and are accessible only to their anonymous-session cookie holder for up to 24 hours. Expiry is checked before reads; SQLite uses periodic/startup cleanup and Redis uses key TTL. Individual and session-wide deletion are available in the UI. Backups, provider retention and forensic recovery are outside the app's deletion guarantee.

Monitor credits, provider errors, request allowance, disk space and availability. Logs contain error codes, check IDs and durations, not raw notices or credentials. Extraction and checks share three execution slots and ten admitted starts per rolling 60 seconds across anonymous sessions. Existing per-session hourly limits and the shared daily model allowance also apply. A lease expires after 210 seconds, beyond the routes' 140-second extraction and 180-second check execution limits; ordinary cleanup happens only when the runner finishes. Deleting a result does not free a still-running slot. A crash or storage outage may hold a slot until lease expiry. The app tries at most three source candidates and compares at most two retrieved sources per check. These controls limit bursts; a distributed attacker can still consume the anonymous service's allowance. A global request ceiling does not guarantee a dollar billing ceiling.

On Vercel an additional network abuse limit covers extraction and checks together (200 starts per fixed hour, raised from 40 for testing on 2026-11-04). It is on by default: the HMAC key is `IP_RATE_LIMIT_SECRET` when set (at least 32 random characters, server-only, one per environment), otherwise a key derived one-way from the server-only model credential. Neither the credential nor the derived key is logged or stored. Requests use Vercel's `x-vercel-forwarded-for` only, HMAC the normalized address, group IPv6 by /64 and share an unknown bucket when the trusted header is missing or invalid. Shared networks may share a limit; this is not user identity and never controls result ownership. Counters expire at the end of the window; result deletion does not reset them. Rotating the secret or the credential resets this counter, while existing global limits remain in force. Outside Vercel, or without any credential, this layer is disabled. Do not log IPs or the derived identifiers. SQLite cleanup and storage backups are not a guarantee of immediate forensic erasure.

Check and extraction logs record aggregate durations and the count of reserved model calls without notice text, URLs or IPs. They do not measure tokens or cost. A reserved model call may still fail or be cancelled before completion.

Use the opt-in [live evaluation harness](evaluation.md) to record real public-notice results and independent-session deletion checks once deployment access is available. Its default dry run performs no network requests. Fixture checks are separate from real inference, accuracy, hosted expiry and physical-device evidence. `/api/status` exposes configured model and source commit metadata for evaluation; `liveAvailable` only reflects configuration/storage readiness, not successful inference.

## Official API references

- [Models](https://dev.meta.ai/docs/models)
- [Image understanding](https://dev.meta.ai/docs/image-understanding)
- [Structured output](https://dev.meta.ai/docs/structured-output)
- [Search grounding](https://dev.meta.ai/docs/search-grounding)

## Change the production Spark model

Inspect Production model variables first. Keep the selected privacy notice consistent with all effective steps, especially contributor data use. Set `META_MODEL` to an ID returned by the production key’s `GET https://api.meta.ai/v1/models`; leave per-step overrides unset unless intentionally mixing models. Never expose the key or an authenticated response body. SAM remains independently controlled by `SAM_MODEL`.

Every Production hosting build runs a read-only model-catalog check before activation, using the Production key already in Vercel. It checks all three effective step IDs and prints only public model IDs and access flags, with no inference or model-call reservation. An inaccessible catalog or missing selected ID fails the build so the previous deployment keeps serving. Preview builds skip this Production-only check; the existing paid hosting probe remains opt-in via `STILLVALID_VERIFY_DEPLOYMENT`. `npm run verify:meta` uses the same resolution locally when a permitted key is available.

After deploying, verify both public aliases: `/api/status.deploymentSha` must match the released commit; `model` is the effective comparison model and `models` lists extraction/search/comparison. These fields show configuration, not completed inference. Confirm actual requests with a bounded production smoke run. Future model changes require a new deployment and a privacy-copy review; no inference fallback silently chooses another model.
