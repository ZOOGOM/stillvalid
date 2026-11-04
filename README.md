# StillValid

**Saved a notice. Still the same?**

A mobile-first web app that compares notice photos or text with official-source material and links changes to supporting quotes. 한국어 작업명은 **지금도 맞나요**입니다.

## Implementation status

The web app and server adapter include ten display languages, optional usage-region settings, image editing, extraction review, source discovery, evidence comparison, synthetic examples, deletion and failure recovery.

See the [product acceptance checklist](docs/acceptance.md) for the complete user flow, implementation coverage and live release checks. It includes a ten-task real-notice evaluation sheet with unrun tasks clearly marked.

**Live checks require a real Meta API key, shared storage on Vercel, and approved network access.** Provider-contract tests use mocked HTTP responses. The connected Vercel project has a production URL at [stillvalid-beta.vercel.app](https://stillvalid-beta.vercel.app). Actual Redis/model connectivity is checked by the opt-in [hosting-build probe](docs/deployment.md); see that deployment's build logs for its result. Real-notice accuracy and judging readiness remain separate release checks. Examples are visibly synthetic and never presented as live checks.

## Run locally

Requires Node.js 24 and npm.

```bash
npm ci
cp .env.example .env.local
# Add META_API_KEY securely to .env.local for live checks.
npm run dev
```

Open `http://localhost:3000`. Without a key, explore three synthetic examples: deadline/location changes, explicit cancellation and a different event edition.

```bash
npm run verify:meta # Read-only account/model availability check
npm run check       # Type checking and behavioral/security tests
npm run build       # Production build
npm start           # Production server
```

## User flow

1. In settings, choose one display language for the interface and results, and optionally select a usage region from 249 countries and regions. Remembering the region is opt-in and reversible. GPS and IP do not determine the notice country.
2. Upload a JPEG, PNG or WebP (up to 10MB), crop/rotate locally, or paste notice text. Image re-encoding reduces metadata.
3. Review title, institution and recognized details, including the notice country separately from the usage region. Resolve a mismatch or edit the text before comparing.
4. Find source candidates using Meta's built-in web search, or provide an official HTTPS URL.
5. Inspect before/after values, actual source quotes, URLs, time checked and the next confirmation action.
6. Copy a summary, start a fresh check, or delete individual/session-wide results.

Display languages are English (`en`), Simplified Chinese (`zh`), Spanish (`es`), French (`fr`), German (`de`), Japanese (`ja`), Korean (`ko`), Portuguese (`pt`), Arabic (`ar`) and Russian (`ru`). The selection controls the interface, results, errors, settings and copied summaries. Dates, amounts, institution names, addresses, before/after source values and quotes are preserved. Changing language does not change the verdict or make another model call. Arabic uses RTL throughout with original text direction isolated. Traditional Chinese is a later consideration. Notice language is detected independently and is not forced to a country-specific language.

Region and language choices do not change one another or infer nationality, residence or time zone. The 249 choices do not establish worldwide notice coverage. `POST /api/checks` uses `lang` for the chosen display language. The ten-language dictionaries are separate from real Meta language-quality validation, which remains outstanding.

Language preference order is valid `sv_display_lang`, legacy `sv_result_lang`, legacy `sv_lang`, a supported browser-language base code, then English. Legacy keys are removed after the new preference is saved. Chinese uses the `zh-CN` locale and Portuguese uses `pt-BR`.

The optional “find region using current location” button requests location once only after a user action and browser permission on HTTPS. A locally loaded boundary dataset estimates the region in the browser without sending, storing or logging coordinates. Inaccurate positions over 20 km, ocean, unsupported or uncertain borders fall back to manual choice. The center-and-eight-sample method with a 1 km guard is an approximation, not a legal boundary or full-radius guarantee. Detection changes only the usage region; users can correct it or cancel.

## Architecture

```text
Browser → Next.js API routes → Meta Model API
                     ├─ Chat Completions: image/text extraction and structured comparison
                     ├─ Responses: built-in web search and returned candidates
                     ├─ HTTPS retrieval: bounded text and public DNS pinning
                     └─ SQLite (local) / Redis (serverless): session-owned results and limits
```

The default model is `muse-spark-1.3` at `https://api.meta.ai/v1`. Keys stay on the server. Deterministic quote checks supplement model interpretation; they do not establish general factual accuracy. Unknown authority, ambiguous fields, different editions and conflicting sources remain review states.

Cancellation needs an exact, current assertion for the same notice. A document role or cancellation keyword alone cannot establish it. The current deterministic cancellation grammar accepts limited English and Korean assertions; other or uncertain wording stays in review. Institution/title/edition checks are conservative and can also require review for aliases or unsupported source headings. Only a registered official domain can confirm a change. There, the issuer or edition may come from the page's dedicated heading (exactly "<title> | <institution>") or the text around the quoted title instead of the same excerpt, but nearby text naming another issuer, another edition or an archive keeps the result in review, and listing titles such as "Events" never qualify. A fetched page sharing nothing with the notice is reported as unrelated without a model comparison. Numeric dates remain ambiguous even when followed by a time. The ten display languages do not imply validated ten-language fact checking.

The existing **Vercel + Upstash Redis** setup deploys from GitHub without an always-on server. The Marketplace-provided `KV_REST_API_URL` and `KV_REST_API_TOKEN` pair is accepted, as is the canonical Upstash REST pair. A local/persistent Node server with SQLite and Docker Compose is also supported. See [deployment and secret setup](docs/deployment.md) for details and remaining verification. GitHub Pages alone cannot execute the protected Meta API routes.

## Validation

Behavioral tests cover supported changes, fabricated evidence, different editions, country mismatch, unknown authority, conflicting sources, negated cancellation, explicit time zones, invalid dates, source encoding, unsafe URLs, request sizes, session isolation, deletion, expiry, idempotency and request ceilings. Provider-contract tests incur no inference charges. Redis Lua behavior is tested with an in-memory Redis emulator; this is separate from the opt-in hosted storage/provider probe.

Browser checks exercise desktop/mobile layouts, country persistence, evidence expansion, language preservation, image editing and HTTP-fixture integration. They require an installed Chromium and a running app:

```bash
CHROMIUM_PATH=/usr/bin/chromium SCREENSHOT_DIR=./test-results/screenshots \
  npm run test:browser
```

HTTP fixtures do not constitute live provider testing. Automated viewport/accessibility checks do not establish real-device coverage or full WCAG conformance. No model accuracy or production latency claims have been established.

The [opt-in live evaluation harness](docs/evaluation.md) runs extraction, checking, anonymous-session isolation and individual deletion against a permitted deployment. It defaults to a dry run and keeps fixture checks separate from human-reviewed real-notice accuracy.

## Privacy and limits

- Original image files are not saved by StillValid. Necessary result quotes are session-owned and available for 24 hours.
- Individual and session-wide deletion are supported. Expiry is enforced before reads and periodically cleaned up.
- Writes require the same origin and an HTTP-only anonymous-session cookie.
- Source requests reject unsafe addresses and pin public DNS results. Retrieval fails closed under a generic forward proxy.
- Extraction and checks share three execution slots and ten starts per rolling minute; deleting a result does not release running work. Per-session and daily model limits also apply. Anonymous quota exhaustion remains possible; request ceilings are not dollar billing caps.
- On Vercel an additional keyed IP-derived limit covers extraction and checks together (40 starts per fixed hour). Its key is `IP_RATE_LIMIT_SECRET` when set, otherwise one derived from the server-only model credential. Shared networks share a limit; it is not an identity or result ownership mechanism. The short-lived counter expires at the hourly window and is independent of result deletion.
- Provider handling follows [Meta's terms and documentation](https://dev.meta.ai/docs/models).

Use permitted public notices or clearly labeled synthetic material. Do not commit keys, student records, private school notices or personal contact details. The app does not determine individual eligibility, give medical/legal judgments or issue emergency instructions.

## License

Original project code is licensed under [MIT](LICENSE). Third-party libraries, models, notice content and images retain their own licenses and terms.
