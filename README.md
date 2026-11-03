# StillValid

**Saved a notice. Still the same?**

A mobile-first web app that compares notice photos or text with official-source material and links changes to supporting quotes. 한국어 작업명은 **지금도 맞나요**입니다.

## Implementation status

The web app and server adapter include English/Korean interfaces, ten result languages, optional usage-region settings, image editing, extraction review, source discovery, evidence comparison, synthetic examples, deletion and failure recovery.

See the [product acceptance checklist](docs/acceptance.md) for the complete user flow, implementation coverage and live release checks. It includes a ten-task real-notice evaluation sheet with unrun tasks clearly marked.

**Live checks require a real Meta API key and approved network access.** Provider-contract tests use mocked HTTP responses. Live inference, real-notice accuracy, external hosting and a judging-ready service URL have not yet been verified. Examples are visibly synthetic and never presented as live checks.

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

1. In settings, choose the interface language (English or Korean) and result language independently, and optionally select a usage region from 249 countries and regions. Remembering the region is opt-in and reversible. GPS and IP do not determine the notice country.
2. Upload a JPEG, PNG or WebP (up to 10MB), crop/rotate locally, or paste notice text. Image re-encoding reduces metadata.
3. Review title, institution and recognized details, including the notice country separately from the usage region. Resolve a mismatch or edit the text before comparing.
4. Find source candidates using Meta's built-in web search, or provide an official HTTPS URL.
5. Inspect before/after values, actual source quotes, URLs, time checked and the next confirmation action.
6. Copy a summary, start a fresh check, or delete individual/session-wide results.

Result languages are English (`en`), Simplified Chinese (`zh`), Spanish (`es`), French (`fr`), German (`de`), Japanese (`ja`), Korean (`ko`), Portuguese (`pt`), Arabic (`ar`) and Russian (`ru`). Result status, explanations, comparison labels, next actions, warnings and copied summaries use the selected result language. Dates, amounts, institution names, addresses, before/after source values and quotes are preserved. Changing the result language does not change the verdict or make another model call. Arabic results use RTL with original text direction isolated. Traditional Chinese is a later consideration.

Region and language choices do not change one another or infer nationality, residence or time zone. The 249 choices do not establish worldwide notice coverage. The result language is stored on the device as `sv_result_lang`, independently of the interface language in `sv_lang`; `POST /api/checks` uses `lang` for the result language. The ten-language dictionary is separate from real Meta language-quality validation, which remains outstanding.

A valid saved result language takes precedence; otherwise the browser language's supported base code is used, falling back to the default interface language (Korean or English). For example, `ja-JP` selects Japanese results even if the interface defaults to English. Language does not infer the usage region. Chinese uses the `zh-CN` locale and Portuguese uses `pt-BR`.

## Architecture

```text
Browser → Next.js API routes → Meta Model API
                     ├─ Chat Completions: image/text extraction and structured comparison
                     ├─ Responses: built-in web search and returned candidates
                     ├─ HTTPS retrieval: bounded text and public DNS pinning
                     └─ SQLite (local) / Redis (serverless): session-owned results and limits
```

The default model is `muse-spark-1.3` at `https://api.meta.ai/v1`. Keys stay on the server. Deterministic quote checks supplement model interpretation; they do not establish general factual accuracy. Unknown authority, ambiguous fields, different editions and conflicting sources remain review states.

Deploy directly from GitHub using **Vercel + Upstash Redis**, without buying or maintaining a server. A local/persistent Node server with SQLite and Docker Compose is also supported. See [deployment and secret setup](docs/deployment.md) for both paths. GitHub Pages alone cannot execute the protected Meta API routes.

## Validation

Behavioral tests cover supported changes, fabricated evidence, different editions, country mismatch, unknown authority, conflicting sources, negated cancellation, explicit time zones, invalid dates, source encoding, unsafe URLs, request sizes, session isolation, deletion, expiry, idempotency and request ceilings. Provider-contract tests incur no inference charges. Redis Lua behavior is tested with an in-memory Redis emulator; a hosted Redis account has not been tested.

Browser checks exercise desktop/mobile layouts, country persistence, evidence expansion, language preservation, image editing and HTTP-fixture integration. They require an installed Chromium and a running app:

```bash
CHROMIUM_PATH=/usr/bin/chromium SCREENSHOT_DIR=./test-results/screenshots \
  npm run test:browser
```

HTTP fixtures do not constitute live provider testing. Automated viewport/accessibility checks do not establish real-device coverage or full WCAG conformance. No model accuracy or production latency claims have been established.

## Privacy and limits

- Original image files are not saved by StillValid. Necessary result quotes are session-owned and available for 24 hours.
- Individual and session-wide deletion are supported. Expiry is enforced before reads and periodically cleaned up.
- Writes require the same origin and an HTTP-only anonymous-session cookie.
- Source requests reject unsafe addresses and pin public DNS results. Retrieval fails closed under a generic forward proxy.
- Global paid-model request limits and per-session/concurrent-check limits reduce exposure; request ceilings are not dollar billing caps.
- Provider handling follows [Meta's terms and documentation](https://dev.meta.ai/docs/models).

Use permitted public notices or clearly labeled synthetic material. Do not commit keys, student records, private school notices or personal contact details. The app does not determine individual eligibility, give medical/legal judgments or issue emergency instructions.

## License

Original project code is licensed under [MIT](LICENSE). Third-party libraries, models, notice content and images retain their own licenses and terms.
