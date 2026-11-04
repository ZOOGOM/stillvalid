# Validation record

Validated in the cloud checkout with Node.js 24.19.0 and Next.js 16.4.4. A single display-language setting controls the complete interface and results in ten languages. The usage region can be selected from 249 countries and regions or estimated on-device after an explicit location request. These implementation checks do not establish global source coverage or live model quality.

| Check | Result |
| --- | --- |
| TypeScript | Passed on the final UI revision |
| Behavioral/security unit tests | 108 passed, including comparison counterexamples, shared extraction/check admission, legacy Redis deletion isolation, Marketplace Redis configuration, local country lookup and complete interface/result dictionaries |
| Live evaluation harness tests | 7 passed using local HTTP fixtures or pure scoring checks; no live provider or real-notice accuracy results |
| Production build | Passed on the final UI revision |
| Chromium production HTTP browser flow groups | 19 passed on localhost with `APP_URL` matching the server origin |
| Automated accessibility | No detected WCAG A/AA violations on 13 inspected snapshots |
| Browser runtime errors | None during the inspected flows |
| Responsive layouts | No horizontal overflow in all ten home languages, settings, and Arabic, German and French results at 320 and 390px; the inspected mobile result at 360px also passed |

The 13 accessibility snapshots cover desktop home, synthetic result and HTTP-fixture review; mobile home and result; and settings plus Arabic, German and French results at each of 320px and 390px. These checks are not a full accessibility certification or physical-device testing.

Browser flows covered a single display-language setting independent of region; saved preferences and a supported browser-language default, including blocked local storage; all ten interface languages and result headings; Arabic RTL, copy feedback and original-value preservation without another request; on-demand mocked geolocation success, denial, timeout, uncertain positions, stale callbacks and local-only coordinates; optional region memory and clearing; synthetic results and quotes; image upload/crop/rotation; unsupported-file recovery; edition and extracted-country correction; candidate-URL rechecks; visible deletion failures; cancellation without deleting the previous result; and mocked HTTP extraction/NDJSON handling. See `scripts/browser-check.mjs`. The browser suite uses synthetic examples and HTTP fixtures, not real Meta inference.

Regression tests cover complete nonempty interface and result dictionaries across all ten display languages, actual local country polygons for cities and territories, imprecise/invalid positions, ocean and border rejection, and international-date-line samples, unchanged Korean and English wording, independent API language validation, preservation of source values across language choices, and rejection of model-rewritten values and quotes including case, Unicode-width and whitespace changes. Other tests cover incomplete comparisons and source failures staying in review, malformed provider envelopes and country codes, Redis deletion removing stale idempotency mappings, and SQLite idempotency/concurrency under six actual competing processes.

The submission-hardening revision adds regression coverage for a cancellation document with omitted status, a new explicit cancellation absent from the original fields, conditional/historical/negated/reversed cancellation, different sessions within the same year and ambiguous numeric dates containing times. Independent review also reproduced the original four counterexamples and checked ordinary cancellation with an unrelated month name, refund policy or generic page title. Those are synthetic structured-model-output checks, not an observed model error rate. Current exact institution/title/edition checks and the limited English/Korean cancellation grammar can return review for legitimate aliases or unsupported wording.

Storage regressions exercise extraction/check sharing of three execution leases, ten starts per rolling minute across changed anonymous sessions, deletion while running, ownership, duplicate requests, lease recovery and the existing shared daily model budget. They also execute legacy deletion Lua against the current store to confirm it cannot remove versioned execution metadata. Redis behavior was checked in an emulator, not against the hosted database. Vercel Standard Protection was applied and read back; actual external authentication enforcement and public-domain access still require HTTP verification.

The [live evaluation harness](evaluation.md) defaults to zero-network dry run and has an empty public case template. Its seven checks cover incremental HTTP fixtures, isolation/deletion, sanitization, no retries on failed work and human-reference scoring, including limited status-only scoring for review/unavailable. Human-reviewed real-notice evaluations remain **0 completed** in this revision. `/api/status` exposes nonsecret configured-model and commit metadata; local HTTP returned 200 with no-store and a session cookie. This is configuration/storage readiness, not proof of inference.

A previous production HTTP run passed eight checks for home/security headers, cookie/readiness, origin rejection, missing configuration, unknown-result protection, session requirement, session deletion and unknown demo. That run configured `APP_URL` to the test server's exact origin. Keep production and preview origin settings separate when deploying.

Redis tests execute production Lua commands in an in-memory Redis emulator. Meta contract and browser HTTP-fixture tests do not make real provider calls. These checks are not a hosted Redis integration test, model-accuracy study, physical Safari/Android test or proof of language quality in live Meta output.

The Vercel project is connected, and production deployments have reached READY at https://stillvalid-beta.vercel.app. `META_API_KEY` and `META_MODEL=muse-spark-1.3` are registered for Production. Marketplace Redis provided the sensitive `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables for Production and Preview. Registration was checked without reading secret values. Preview has no Meta key. Local tests do not establish actual provider requests or hosted Redis operations. The opt-in hosting-build probe performs a real short-lived Redis write/read/delete and one real text inference on an explicitly synthetic diagnostic input; its fixed success/failure record is written to that deployment's build logs. Images, search, real-notice evaluation, external HTTP/TLS requests and the Docker image remain separate release checks. An earlier authoring environment's enforced outbound policy did not permit the deployment host or api.meta.ai; the later release run reached the public deployment. Native Vercel Git deployment is independent of GitHub Actions; remote CI capacity is currently reported exhausted by the user.

Marketplace configuration tests execute the real backend selection and REST transport with a mocked HTTP response: the writable KV token and endpoint are selected together; a complete canonical pair takes precedence; incomplete pairs never mix or fall back; blank template variables still permit local SQLite; raw Redis URLs and read-only tokens cannot configure REST storage. These tests do not establish hosted Redis connectivity or actual Meta inference.

The latest local browser run includes the upstream liquid-glass theme. The 19 flow groups passed with no page errors and no detected accessibility violations on the same 13 snapshots after small text-link colors were darkened to meet contrast requirements. This is a localhost check, separate from the hosting-build probe and real-device evaluation.

The selected navy comparison/check icon is used in the header, footer, browser icons and home-screen manifest. The original PNG copy matches the selected artwork's SHA-256. Local production HTTP checks confirmed the generated icon links, manifest, PNG dimensions (32, 180, 192 and 512px), transparent PNG corners and 16/32/48px ICO entries. The 74 tests, build and 19 browser flow groups passed after icon integration; physical iOS/Android home-screen installation remains untested.

The [mobile screenshot](screenshots/mobile.png) and [desktop screenshot](screenshots/desktop.png), [desktop settings](screenshots/desktop-settings.png), [mobile settings](screenshots/mobile-settings.png), [desktop Arabic result](screenshots/desktop-arabic-result.png) and [mobile Arabic result](screenshots/mobile-arabic-result.png) show inspected synthetic flows without private notices or credentials. The [product acceptance checklist](acceptance.md) records the remaining live release gate; its ten real-notice task slots are not completed measurements.

Location UI tests inject browser positions and permission errors. They do not establish real GPS, device permission or disputed-border accuracy. Lookup data is loaded on demand and coordinates are not sent to an app or geocoding endpoint. See the local country-coder license notice under public/licenses.

## 2026-11-04 functional hardening and live observation

On the `fix/submission-hardening` revision after the November functional review, local verification passed TypeScript, 143 behavioral/security tests, seven live-harness fixture tests, the production build, and 21 Chromium browser-flow groups with no observed page errors or automated accessibility violations. These tests do not establish real-device behavior or general model accuracy. Source error messages, non-JSON upload rejection, IP-keyed admission with SQLite and a Redis Lua emulator, and counterexample cases for institution/title identity were included. Actual hosted Redis rate-limit enforcement and external header-spoofing resistance were not load-tested.

A single final live run used the first page of a public [Crofton venue-change letter](https://www.gov.uk/government/news/change-of-venue-for-crofton-information-event-monday-20-febuary-2017) rendered as PNG. On deployment `f4fb4f29d43ce2581568ec1b396a48cdc4d97ee5`, image extraction returned HTTP 200 in 32.8 seconds and included the venue, date and shuttle table; this one example is not a complete OCR-accuracy measurement or a physical camera test. A comparison using that official URL reached source and comparison stages but failed with `model_output`; the fixed diagnostic category was `completion_length`. The individual result and session were deleted with HTTP 204. URL-free discovery was not attempted after the failure. Human-reviewed real-notice accuracy evaluations completed: **0**. Tokens and cost were not measured. The model's private reasoning and visible output both count against the output budget, so the category alone does not identify which consumed it.

The hosted network limit uses `IP_RATE_LIMIT_SECRET` when set, otherwise a key derived from the server-only model credential, and Vercel's trusted header. A configured secret and successful normal request do not by themselves prove the limit is enforced under real concurrent traffic. See [deployment](deployment.md) for scope and limitations.

## 2026-11-04 release-candidate checks

On commit `7f99b7a76c2cdb3a71e6743efa5cd0c202ea9266`, Node 24 verification passed TypeScript, 150 behavioral/security tests, seven live-evaluation fixture tests, the production build, and 21 Chromium browser-flow groups. The browser run reported no page errors and no automatically detected accessibility violations. GitHub's Vercel preview and a production deployment reached READY; the public home and status endpoint returned HTTP 200 and the deployed status reported that SHA. These checks do not establish physical-device behavior.

A bounded production run used synthetic images and text against public sources. Eight of nine requested scenarios produced the expected result on their first attempt; L3 initially returned `503 model_unavailable` after 60.5 seconds and produced the expected `review` on one retry. Source failure and unsafe-URL checks behaved as listed in [the evaluation record](evaluation.md#2026-11-04-synthetic-release-run). This is not a human-reviewed real-notice accuracy study. Eighteen model calls were observed in server timing logs; cost and tokens were not measured. Three test sessions were deleted with HTTP 204.

## 2026-11-04 identity counterexamples, retry and real-notice photo run

Independent review found two deterministic gaps on `87c13b9`, each reproduced as a verified `changed` result: a changed value quoted from a section labelled with another edition of the same title (for example "2027 Garden Workshop" on a 2026 notice), and a dedicated official page whose archive notice sat more than 400 characters from the quote. Both now yield `review`; regression tests also keep cross-year deadlines of the notice's own edition, unlabelled title repeats and Korean `제N회` labels verified. On a page listing several programmes, whether a quoted value belongs to *this* programme still depends on the model when no edition label distinguishes the sections.

Extraction keeps a 60-second first attempt; only a provider stall or 5xx is retried once, inside a 130-second route budget (`maxDuration` 140). Comparisons now have a 12,000-token completion budget and a 100-second call limit after a long official page twice ended in `model_output`. If one of several comparisons fails, the others are kept with a `source_compare_failed` warning. Titles that differ only by whitespace beside a bracket or punctuation mark (a printed line break) are matched; letters and digits must still match.

Live checks on production `445996b` used camera-style JPEG photos (tilted sheet, uneven light, slight blur) of real public notices. These were rendered posters, not physical camera captures:

| Case | Official source | Result | Extraction | Check |
| --- | --- | --- | ---: | ---: |
| Seoul internship notice, unchanged | seoul.go.kr notice 454731 | `matched`, verified (earlier deployment, after the institution fix) | 26.1 s | 57.7 s |
| Same notice, poster with an older deadline (3/31 18:00) | same URL | `changed` 3/31 → 4/3 15:00, verified | 26.0 s | 49.4 s |
| Engen Conservation Fellowship poster with the general date | airandspace.si.edu fellowships | `review`; the model quoted Engen's own February 15 deadline | 9.2 s | 34.0 s |
| NASM Fellowships, no URL (search) | found airandspace.si.edu | deadline `same`, verified; overall `review` because two other candidates were blocked or too large | — | 43.9 s |
| Seoul notice, no URL (search) | candidates were attachments and a script-only page | `unavailable` with reasons | — | 19.9 s |

Before the comparison budget change the same Seoul page failed with `model_output` in two of three comparisons; after it, one further comparison succeeded and one result was lost to a network reset in the test environment, so stability is not yet measured. Human-reviewed real-notice accuracy evaluations completed remain **0**. All test sessions were deleted with HTTP 204.

## 2026-11-04 follow-up on `f13fe9a`

The public production status endpoint and remote `main` both reported `f13fe9a2f4eaaa20556b36d3f7bc97034d14babf`. Local checks on that source passed TypeScript, 155 behavioral/security tests, seven live-harness fixture tests, the production build and 21 Chromium browser-flow groups with no page errors or automatically detected accessibility violations. The local browser suite uses fixtures; a complete browser-to-production photo flow was not performed in this session because an interactive browser-control interface was unavailable. Physical-device behavior remains unverified.

Runtime logs for production deployments at `3bb81cb` and `cc169f4` recorded `model_output_rejected` with reason `completion_length` on comparison requests. Two approximately 76-second extraction events on `49657e6` recorded two reserved model calls each (76,447ms and 76,063ms); without the original request ID neither can be conclusively matched to a particular earlier client observation. The host's one-hour runtime-log retention prevents a complete UTC-day call total. Eighteen calls from the earlier release test, 26 calls in separately timed retained logs, and nine calls in the follow-up below establish a **minimum of 53** reserved calls on this UTC day, not an exact total. Credit cost and token usage were not measured. The daily limit remained 100.

A reconstructed Seoul notice used the public [Seoul notice](https://www.seoul.go.kr/news/news_notice.do?nttNo=454731), with its old date deliberately changed to 31 March 2026. The original Claude extraction object was unavailable; the reconstructed input is not the same captured image or model response. Three sequential comparisons with the official URL completed without a stream error, taking 58,365ms, 46,146ms and 56,368ms client-side. Each found the official period ending 3 April 2026 but returned `review` with `identity`, `evidence`, `partial` and an unverified comparison, rather than the requested `changed`. The app does not retain the model's identity quote in the result, so its exact choice cannot be determined. The three results and session were deleted; the session returned HTTP 204.

Two other official GOV.UK notices were tested using newly rendered synthetic poster images. The user confirmed the reference dates and the intended comparison scope. For each notice the altered 15 November date was artificial, not a documented historical deadline. Both image extractions returned HTTP 200; all four comparisons returned `review` with `identity`, `evidence`, `partial`, and unverified fields:

| Official notice                                                                                                               | Input                 | Expected | Observed before → after                                                   | Extract ms | Check ms |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- | ------------------------------------------------------------------------- | ---------: | -------: |
| [Consul General For a Day](https://www.gov.uk/government/news/enter-competition-to-be-consul-general-istanbul-for-a-day-2026) | Same                  | matched  | 22 November 2026 → 22 November 2026; review                               |     14,014 |   24,008 |
| Same notice                                                                                                                   | Artificially modified | changed  | 15 November 2026 → 22 November 2026; review                               |     reused |   28,066 |
| [Honorary Consul Bremen](https://www.gov.uk/government/news/honorary-consul-bremen-recruitment)                               | Same                  | matched  | Sunday, 22 November 2026, 23:59 → same; review                            |     20,358 |   36,633 |
| Same notice                                                                                                                   | Artificially modified | changed  | Sunday, 15 November 2026, 23:59 → Sunday, 22 November 2026, 23:59; review |     reused |   30,822 |

The Bremen source did not state a time zone for the deadline; none was inferred. Each notice used one model call for extraction and one per comparison. The four results and both sessions were deleted; the session DELETE requests returned HTTP 204. These are four controlled operational comparisons, not four historical deadline changes or evidence of population accuracy.

An offline counterfactual used each actually returned `- GOV.UK` source title and an exact source excerpt containing the notice title and issuing institution. `verifyComparison` rejected identity for both; replacing only the heading in that fixture with the exact notice title made both verify. Thus the existing specific-heading equality check is independently sufficient to prevent confirmation for these returned headings. This does not reveal what identity quote or `same_notice` value the live model actually returned. No identity rule or test expectation was changed.

## 2026-11-04 section scope, page-level archive and heading fixes (`9c9e77d`)

An independent review reproduced two false confirmations on `f13fe9a` with synthetic model outputs: a date quoted from a sibling programme's section on the same official page ("Music" for a "Garden" notice), and a page that began "This page is an archive." while the quote itself contained the title, institution and edition. Both now yield `review`, with new regression tests that fail on the previous code. A changed value is rejected when its inline lead-in or nearest heading names a sibling programme; neutral headings ("Timeline", "Applications Due") keep scope, and a quote naming the title is always in scope. Page-level archived, superseded or withdrawn statements now veto identity on every path; menu links such as "News archive" do not. Where several programmes share one section without distinguishing labels, scope still depends on the model.

The same review found that `- GOV.UK` page titles blocked identity. The site's own label, generic labels and "recruitment" are now neutral, and a heading that only wraps lead-in words around the complete title still names it; "Local History" still does not match "History". An unrelated fetched page no longer uses one of the two comparison slots. `check_timing` logs now include fixed identity/scope rejection codes, without notice or source text.

Offline, the real NASM, Seoul and two GOV.UK pages were checked with constructed model outputs: NASM L1/L2 and the Seoul notice still verify, both GOV.UK notices verify, and an Engen notice quoting the page's general date is rejected for scope. Live on `9c9e77d`, with notices sent directly to the check endpoint (three comparison calls, no extraction):

| Case | Result | Check |
| --- | --- | ---: |
| GOV.UK Honorary Consul Bremen, artificially earlier deadline | `changed` 15 → 22 November, verified | 22.1 s |
| GOV.UK Consul General For a Day, same deadline | `matched`, verified | 18.8 s |
| Seoul internship notice, poster with an earlier end date | `changed` 3/31 → 4/3, verified | 34.7 s |

Each is a single run; the GOV.UK date change was artificial and the inputs were not photographed. Local checks passed TypeScript, 159 tests, seven harness tests, the build and 21 browser-flow groups with no page errors or accessibility violations. A reconnecting client still starts a new check, because the server cancels work when the stream disconnects. The session was deleted with HTTP 204.

## 2026-11-04 submission rehearsal on d46ab66

At approximately 04:30 UTC, both public production aliases returned HTTP 200 for home and `/api/status`, reporting `d46ab66e6ab6ca8d299c6fac2f01a527708eaab4`, `muse-spark-1.3` and `liveAvailable: true`. CSP, HSTS with preload, DENY framing, nosniff, referrer and permissions policies were present. Remote `main` matched that commit. Readiness metadata alone was not counted as inference evidence.

A Chromium browser at a 390×844 mobile viewport then used two self-designed notice cards, visibly labelled as examples. These were generated images, not physical camera photographs or official posters. Both complete recorded flows used actual production image upload, crop, extraction, review, a user-supplied official URL and comparison, without fixture responses.

| Reconstructed input | Observed production result | Client extraction | Client comparison |
| --- | --- | --- | --- |
| Seoul internship card with deliberately earlier 31 March deadline | `changed`, verified; original period ending `3. 31.(화) 15:00` versus official period ending `4. 3.(금) 15:00` | 24,071 ms | 25,203 ms |
| GOV.UK Consul General For a Day card | `matched`, verified; `22 November 2026` on both sides | 17,460 ms | 45,289 ms |

Each result had no warnings and one verified deadline field. Both comparison timing records had `rejected: []`. Switching the result display to Korean issued no additional extraction/check request. Both completed recording sessions were deleted with HTTP 204. Neither example establishes a real historical deadline change or general notice accuracy.

An earlier Seoul capture attempt consumed one extraction and one comparison (server durations 21,514 ms and 26,136 ms; comparison `rejected: []`). A Playwright response-body capture error stopped the recorder before its final result was preserved. That attempt's final status and session deletion were not verified; normal result expiry applies. The recording utility was repaired without application changes. Across that attempt and the two completed flows, timing logs established **six reserved model calls**, with one call per extraction/comparison and no provider retry. Tokens and cost were not measured. The UTC-day total and exact remaining budget are unknown; the daily limit was not changed.

A separate built-in different-edition example was captured from the production interface with its synthetic/no-live-lookup banner visible. It is separate from the real model calls above. The public event page confirmed the 4 November 21:00 ET deadline. The submission portal redirected the unauthenticated browser to login, so authenticated form requirements and video limits were not verified. No entry was submitted.

Local verification on the unchanged application source passed TypeScript, **159 behavioral/security tests**, **seven harness tests**, the production build, **21 browser-flow groups** with no recorded page errors or automatic accessibility violations, and `npm audit --omit=dev` with zero reported vulnerabilities. The browser suite uses fixtures. The user subsequently reported one physical iPhone camera flow, described below; HEIC and comprehensive Safari coverage remain unverified. Android physical-device testing is unavailable in this session. The real-notice human-reference evaluation sheet remains uncompleted.

### User-reported iPhone camera flow and read-only source diagnosis

The user supplied result screenshots for a public festival notice, reported taking the original photo with an iPhone camera, reported OS version 27.3, and estimated about three minutes to the result. The result was `review`, with a missing retrieved event date and an unverified matching venue. This establishes a user-observed camera-input/result flow, not independent verification of the exact device, Safari version, image MIME type, HEIC conversion, cropping, permission failures, or network interruption. The original image and exact extracted notice/model output were not available for this diagnosis. No repeat model request was made.

The user identified [the related article](https://gyeongnamzine.com/10448) as a page containing the information. A browser request returned HTTP 200; its raw HTML was 30,530 bytes. The application's unchanged `parseSourceDocument` extracted 2,177 characters, including the event edition, 14–15 November 2026 dates and venue. Therefore, this observed page response does **not** reproduce the app's too-large guard (600,000 response bytes or 22,000 extracted characters). The warning could concern another candidate or a different response; the precise failed source was not identified. A separate Python HTTP request returned 403, so browser access is not proof that every client or the production fetch path receives the same response.

The article's domain is not in the default official-host registry, and the user's result showed unverified authority. No organiser relationship was established from the page. Content being present does not establish official authority or a verified comparison. The parser also joins adjacent table cells without a separator, producing text such as `행사명제4회 수산제농경문화제`. Constructed offline model outputs using the fetched page reproduced `title_not_in_quote`, and a spaced title also produced `field_scope`. Exact title matching can reject spacing differences and a Korean particle attached immediately after a title; these reproductions do not establish which quote the live model selected.

A separate production log sequence around the user's screenshot time recorded a 38.1-second extraction and a 57.7-second search/check, with `title_not_in_quote` and `field_scope` diagnostics. Without a matching request ID, that sequence cannot be conclusively assigned to the user's run or used to replace the user's approximately three-minute observation. Candidate quality, text/identity matching and long waits remain material product limitations. No decision rules, test expectations, registry entries or environment variables were changed to make this example pass.

## 2026-11-04 iPhone case diagnosis, source reporting, PDF, SAM opt-in and map search (PR #5)

All work below was verified without model calls: **0 paid model calls**, cost not measured. Commits on `codex/submission-demo-prep` after `68a9e5b`: `c371d9f`, `d9eb096`, `b0d8471`, `276d066`, `e9ce73e`, `9e3632b` and this record. Production remained on `d46ab66`; nothing was merged or promoted.

### Reported iPhone check ("제4회 수산제 농경문화제")

- **Official source, independently checked.** The Miryang City tourism calendar on `www.miryang.go.kr` lists 「제4회 수산제 농경문화제」, 2026. 11. 14(토) ~ 11. 15.(일) 10:00~17:00, 수산제 역사공원 일원, **주최: 밀양시**. The page the user identified (`gyeongnamzine.com/10448`) is a magazine article, not the organiser. Neither host is in the registered-source list; no registry entry was added. Registering `go.kr` hosts is a policy decision: government sites also host public boards, so it needs the user's approval and its own tests.
- **Not preserved:** the user's photo, extraction, model identity quote and response. Everything below uses constructed fixtures and constructed model outputs. It shows mechanisms that *can* produce the reported review; it does not establish which one did.
- **Observed in this environment:** the article returned HTTP 200, 30,085 bytes, and 2,177 extracted characters (below the 600,000-byte and 22,000-character limits). Its label/value table was flattened into `행사명제4회 수산제농경문화제` and `장소수산제역사공원 일원`. A title glued to its label cannot pass the exact title check (`title_not_in_quote`).
- **Fixed:** table cells and definition terms now keep a ` | ` boundary (`행사명 | 제4회 수산제농경문화제`); cell text is unchanged. An explicit name row naming another event (`행사명 | …`) now marks another section.
- **Intentionally still review:** poster spacing (`수산제 농경문화제` vs `수산제농경문화제`), an attached particle (`…문화제가`), an unregistered host, a specific different page heading (the article headline), another edition, institution or event, fabricated quotes and archived pages. `tests/korean-notice.test.ts` covers these, and its tests fail on the previous source and comparison code.
- **Real registered pages, rechecked offline** with constructed outputs after the table change: NASM L1/L2 and the Seoul internship notice still verify, both GOV.UK notices still verify, and the Engen sub-programme with the general date is still rejected for section scope.

### Per-source reasons and stage timing

- **Per-source reasons.** Results now list each candidate in priority order: could not be read (with the fixed reason), unrelated (not compared), compared, or analysis not finished. Compared sources add authority, an identity category, any section exclusion and the confirmed-quote count. Source-specific warnings moved out of the general list, so one oversized candidate does not read as a failure of every source.
- **Logs.** `check_timing` now carries the check id, the rejection codes and per-candidate outcome codes; no URLs, notice or source text.
- **Timing.** Extraction responses return the server duration and reserved calls. The result's expandable "Processing time" panel separates photo preparation, the whole reading request, reading on the server, the user's review time, search, retrieval, comparison, the server total, the whole check request and the model-call count.
- **Progress screen.** It shows the elapsed time and the measured range so far (about 45–90 s with an official link, longer with search) without a promised completion time.
- **Link path.** The source-link hint now says a link skips search; the server already makes no search call when a link is given. Existing parallel fetching and comparison were not changed and are not claimed as new.
- **Not measured.** No new latency measurements were taken. The user's roughly three-minute iPhone observation was not matched to any server log line.
- **Not changed.** A dropped connection still cancels server work (`request.signal`); resuming would need work to outlive the request, which was not changed before the deadline. No speculative search before the user's review was added.

### PDF sources and SAM 3.1 (opt-in)

- **PDF sources.** An `application/pdf` source with a `%PDF-` signature is read with `unpdf` 1.9.1 (pdf.js 6.4, no eval path), limited to 5 MB and 20 pages, without font faces or XFA. Only its text layer is used and every quote is verified against it exactly.
  - Scanned PDFs: `source_pdf_no_text`. Damaged or disguised files: `source_format`. More than 20 pages: `source_too_large`.
  - A PDF's metadata title is never identity evidence.
  - Tests use synthetic generated PDFs. A live PDF source has not been fetched in production.
- **SAM 3.1 (opt-in).** "Find the notice automatically" sends the prepared photo once to SAM 3.1 (`/api/locate`), keeps the most confident box covering at least 8% of the frame, and crops with a 2% margin.
  - It shares the extraction limits and the daily allowance, and the crop can be undone.
  - Only mocked provider tests ran. **The real SAM response, the default `poster` prompt and its crop quality are unverified.**

### Google Maps search on location cards

- Location comparison cards link each displayed place value to `https://www.google.com/maps/search/?api=1&query=…`. The query is the shown text, trimmed and otherwise unchanged; identical values share one link; synthetic examples have none.
- `tests/maps.test.ts` covers Korean, English, spaces, `&`, `#`, brackets, `+`, `%`, emoji and Arabic, plus null, empty, whitespace, `—` and over-2,048-character input.
- `scripts/browser-maps-check.mjs` ran ten fixture results (changed, same, before only, after only, both null, `—`, unverified review, unavailable, two sources, demo):
  - link counts and decoded queries matched each card's own values, with zero empty or wrong-side searches;
  - "needs review" badges and warnings stayed;
  - hrefs and place text were identical in all ten display languages;
  - there were zero google.com requests before a click (all were recorded and aborted). Mouse click and keyboard Enter each opened a new page requesting the expected URL;
  - clicks and language changes added no `/api/checks`, `/api/extract` or `/api/demo` requests;
  - the copied summary held no map URL;
  - 320, 360 and 390 px in ko, ar and de had no horizontal overflow and 44 px link targets;
  - axe and page-error counts were zero.
- During development, axe flagged the existing copy toast while it was animating in (white text over a light measured background). The check was reordered to audit before copying; the toast itself was not changed and was not separately evaluated.
- **Real devices: unverified.** iPhone Safari and Android Chrome were not tested. Whether the Google Maps app or the web map opens, back navigation and query preservation on a phone are for the user's own check. Desktop Chromium results above are not phone results.

### Commands (local, no Meta key)

The server ran with `liveAvailable: false`.

| Command | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm test` | **173/173** |
| `npm run test:live-harness` | **7/7** |
| `npm run build` | passed |
| `npm run test:browser` | **21 groups**, 0 page errors, 0 axe violations |
| `npm run test:browser-maps` | all checks above passed |
| `npm audit --omit=dev` | **0 vulnerabilities** |

## 2026-11-04 production after merging PR #5 (`11836c7`, then `a9411e6`)

With the user's approval, PR #5 was merged (merge commit `11836c74aa5f155855f20674fda809ee0e0b5e20`) and both production aliases reported it with HTTP 200 home pages.

The first live PDF check showed that the Seoul notice's official PDF attachment is served as `application/octet-stream` with a `.pdf` file name. A follow-up commit (`a9411e6a0ec7981e8711534746ae742c51c73c71`, 176 tests and 7 harness tests passed, build passed) accepts generic downloads as PDF only when named `.pdf`, still requiring the `%PDF-` signature. Both aliases then reported `a9411e6`.

Live checks on `a9411e6` used **five model calls** (approved limit six). The session was deleted with HTTP 204; tokens and cost were not measured. Notices were sent directly to the check endpoint (no extraction); the Seoul notice's earlier end date is artificial, and the Miryang notice was reconstructed from the user's report, not from the original photo.

| Check | Result | Time |
| --- | --- | ---: |
| SAM 3.1 crop, Seoul notice photo (camera-style rendering) | HTTP 200, **no box returned** | 2.6 s |
| SAM 3.1 crop, NASM poster photo (camera-style rendering) | HTTP 200, **no box returned** | 1.3 s |
| Seoul internship notice, official HTML page | `changed` 3/31 → 4/3 15:00, verified; source registered, identity `ok`, 1/1 quotes | 30.6 s (fetch 1.7 s, compare 28.3 s) |
| Same notice, official PDF attachment (`seoulboard.seoul.go.kr`) | PDF read and compared; `review`. The PDF's title wording (`여름·가을학기`, `참여기업 (사업장, 단체)`) differs from the photographed title, so the identity category is `title` | 28.1 s (fetch 3.5 s, compare 24.1 s) |
| 제4회 수산제 농경문화제, official Miryang City schedule page (`www.miryang.go.kr`, now registered) | Source registered and identity `ok`. Date and place were not verified because their wording differs from the poster (`2026. 11. 14 ~ 15` vs `2026. 11. 14(토) ~ 11. 15.(일) …`; `수산제역사공원 일원` vs `수산제 역사공원 일원(…)`); overall `review` | 58.8 s (fetch 9.3 s, compare 49.1 s) |

SAM 3.1 returned no qualifying box with the default `poster` prompt for either image. The API's raw output is not returned or logged, so it is unknown whether the cause is the prompt, the photos or the response shape. The opt-in button therefore currently says no notice was found and leaves the photo unchanged. This is not a working crop feature yet. Real devices, HEIC and the map app hand-off remain unverified.

### SAM 3.1 diagnosis (`0dc7d2c`)

`/api/locate` now returns and logs the provider response shape only: status, top-level keys, output and part types, output-text length, token counts and each box's share of the frame. It never includes image data, mask payloads or free text. A fixed prompt list (poster, document, paper, sign, notice, flyer) allows diagnosis without forwarding free text.

**Five model calls** were made in production; the session was deleted with HTTP 204.

| Image | Prompt | Response | Box | Confidence |
| --- | --- | --- | --- | ---: |
| Seoul notice, camera-style rendering | poster | `completed`, one `message`/`output_text` part, text length 0 (zero matches) | none | — |
| same | paper | text length 565, one box | 161,166–984,870 of 1080×1440 (37% of frame) | 0.906 |
| same | document | text length 577, one box | 161,166–984,871 (37%) | 0.902 |
| NASM poster, camera-style rendering | paper | text length 550, one box | 162,153–966,650 (26%) | 0.824 |
| same | document | text length 546, one box | 162,153–966,650 (26%) | 0.926 |

**Cause:** the concept prompt. "poster" matched nothing on these printed sheets. The response shape and parser worked as documented.

**Result:**
- Drawn on the images, both boxes enclose the tilted sheet.
- The default prompt is now `document`; the change is covered by unit tests.
- After this change, the default path itself was not called again live.
- These were rendered test images, not physical camera photos. Behaviour on real photos, in poor light or with several notices in one photo remains unmeasured.

## 2026-11-04 real photographs, limits for testing, HEIC and partial readings (`22cdec4`)

**Usage limits.** At the user's request, while the app is being tested, the request ceilings now live in `src/lib/limits.ts`:
- network starts per hour: 40 → 200 (this limit had blocked live testing);
- per-session extractions per hour: 20 → 60;
- per-session checks per hour: 12 → 40;
- daily model calls when `DAILY_MODEL_CALL_LIMIT` is unset: 100 → 300.

Concurrency (3) and the 10-starts-per-minute burst are unchanged. The Meta Billing spend limit remains the money ceiling. Setting `DAILY_MODEL_CALL_LIMIT` lowers the daily limit without a code change.

**Real photographs.** Openly licensed (Creative Commons) Flickr photographs, found through Openverse, were used for testing only and are not stored in the repository: a poster on a wall, a framed notice board with four notices, and a dense school notice board. A darkened, noisier copy of the poster was also tested. All calls went to production through the default locate path.

| Photo | Phrases tried | Boxes offered | Notes |
| --- | --- | --- | --- |
| Colourful poster on a wall | document (none) → poster | 2: the poster (77% of frame, 0.94) and a partly visible poster above it (8%, 0.82) | "document" alone found nothing; the fallback was needed |
| Same, darkened and noisy | document | 1: the poster (77%, 0.50) | Lower confidence |
| Framed board, four notices | document | 4 after lowering the minimum to 3%; drawn on the photo, each box encloses one notice (confidence 0.72–0.83) | With the earlier 8% minimum only 2 of 4 were offered |
| Dense school board | document (none) → poster | 1: the whole board (92%, 0.74) | Individual sheets were not separated |
| Seoul notice rendering (default path recheck) | document | 1 (0.90) | Confirms the default prompt |

**Reading from cropped real photographs**, at the app's crop with a 2% margin:
- **The board's main poster** (crop ~350×505 px): the title, institution and full text were transcribed correctly in 15.1 s. No fields were invented for a poster without dates.
- **A small typed notice** (crop 261×185 px): only partly read, in 26.7 s and later 27.7 s. The title also changed between runs ("monthly" vs "evening" lectures).

**Changes from these results:**
- Photos with a short side under 500 px or under 0.3 MP now show a "take a closer photo" hint.
- `/api/extract` reports `readability: "uncertain"` when the reader classes a photo as cropped, blurry or sparse. Production returned `uncertain` for the small typed notice, and the review screen asks the user to compare and correct.
- Several detected notices are numbered in reading order. The minimum box size for offering a notice is 3%.

**HEIC.** A HEIC/HEIF file is now decoded where the browser supports it and re-encoded to JPEG. Otherwise a HEIC-specific message explains how to send JPEG. Only the Chromium path (the guidance message) was tested; decoding on Safari or iPhone was not.

**Cost.** This round used **13 model calls**, including two calls before the limits were raised; cost was not measured. Sessions were deleted with HTTP 204.

**Still unverified:**
- physical iPhone and Android devices;
- map app vs web map;
- HEIC decoding on Safari;
- photographs taken with the app's own camera input;
- human-labelled accuracy.

## 2026-11-04 fixes for the code review's waiting and stream findings (`6d8fce7`)

A code review on `ae54a88` reproduced the following with fixed responses and a controlled browser clock: endless waits on a stalled read or check, a received result discarded by a later transport error, a blocked "Run a fresh check" while the stream stayed open, and a provider body timeout classified as a model output error. Production logs showed a 96.9 s extraction with two calls and a 100 s comparison holding a 121 s check.

**Browser (P1-1/2/3)**
- Reading, checking and notice location now have browser deadlines above the server's own: 150 s, 200 s and 80 s.
- A check stream has a 45 s silence watchdog, and the server now sends a heartbeat every 10 s.
- On a deadline the input is kept and a "took too long" message is shown.
- A received result is final: reading stops and the busy lock is released, so a later error or an unclosed stream cannot undo it.
- After a broken or timed-out stream, the page asks once (owner-scoped GET, no model call) whether the check was saved and shows that result if so.
- `scripts/browser-stream-check.mjs` replays the review's four scenarios, a 100 s check kept alive by heartbeats, and recovery of a saved result. It failed on the previous build and passes now.

**Server (P1-4, P1-5, P2-8, P2-9)**
- Extraction retries a provider stall only when the first attempt failed within 20 s.
- Once an official source's comparison succeeds, slower comparisons get 30 s more and are then reported as not finished. That keeps the result in review, as before.
- A body timeout after headers is a stall, not a model output error.
- PDF document proxies are destroyed on every path.
- Logs now carry, per call, the duration, outcome and token counts, and per source, the comparison time and whether it was cut off. No text, URLs or images are logged.
- The processing-time panel now includes notice location.

**Not changed:** the source-fetch/compare overlap and DNS cancellation (P2-6); comparison of unregistered candidates (P2-7, a product decision); request-key reuse (P2-10, the recovery above is used instead); verification rules; limits.

**Checks**
- Local: TypeScript, 183 tests, 7 harness tests and the build passed. All four browser suites passed (flows, maps, locate, stream) with no page errors or axe violations. `npm audit --omit=dev` found 0 vulnerabilities.
- Production on `6d8fce7` used **3 model calls**:
  - Seoul notice with an official link: `changed`, verified. The result arrived at 33.8 s, the stream closed at once, and 3 heartbeats were received.
  - NASM search: `review` (other candidates blocked or too large) at 39.2 s. With only one comparable source, the grace period was not exercised.
- The session was deleted with HTTP 204.
- The user-reported 200-second wait was not matched to a request, so whether these changes remove that particular wait is not established.

## 2026-11-04 background check during review (production `fc1ad60`)

The check now starts right after reading when the official link is known, and is reused only if the notice, region, language and link are unchanged at the tap. Local checks: 188 unit tests and six browser scripts (including `test:browser-early`: started before the tap and reused, dropped after an edit, not started without a link, with an uncertain reading or on a region mismatch). Fixed fetch responses; no model call.

One production browser run, a Seoul notice as text with its printed official link, 10 s spent reviewing: reading 5.5 s; the link field was filled from the notice and the check started 0.2 s before the review screen appeared; after the tap the result arrived in 3.9 s with a verified `changed` outcome; 19.4 s from the start including the 10 s review; one POST to the check route. Two model calls (one reading, one comparison). This is one run on a text notice. It hides model time behind the user's review time and does not reduce the model's own time: reading a dense photo still takes about 17–25 s and the comparison about 7–25 s, so the original P50 15 s / P90 30 s target is not shown to be met by this change.

Production `e314b1b`, no official link (a Smithsonian fellowship notice as text, 15 s spent reviewing): reading 3.4 s; the link field stayed empty and the check, including the official-source search, started in the background before the review screen finished; after the tap the result arrived in 7.9 s with `review` (the unchanged verifier did not confirm); 26.3 s from the start including the 15 s review; one POST. The same path measured about 22–42 s when started at the tap (2026-11-04 search runs). One run on a text notice; it moves model time into the review period and does not shorten the model's own time. Roughly three to four model calls (reading, search, up to two comparisons).

## 2026-11-04 reading with other Meta models (production, read step only)

The deployment's Meta key listed these model IDs: `muse-spark-1.3` (current), `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.2-contributor`, `muse-spark-1.1`, plus `sam-3.1`, `muse-wonder-1.0`, `muse-image-1.0`, `muse-voice-transcribe-1.0`. No model is named as a faster tier. The two "contributor" variants were not tried because their data-handling terms were not checked.

Reading only, two photos (a Seoul notice and a Smithsonian fellowship, reconstructed as photos) twice each, one model call per run, temporary deployments:

| Model | Reading time | Seoul title read correctly | Smithsonian |
|---|---|---|---|
| `muse-spark-1.3` (default, earlier runs) | 17–25 s | 4 of 4 ("서울영커리언스") | correct |
| `muse-spark-1.2` | 2.0–4.5 s | 0 of 2 ("서울영커리어스") | correct |
| `muse-spark-1.1` | 2.4–7.9 s | 1 of 2 | correct |

The faster models were far quicker but misread one character of the Seoul title in most runs; the identity check compares the notice title with the official page, so such a misreading can send a correct comparison to review. Four runs per model is a small sample, and this does not measure comparison or search with these models. The default stays `muse-spark-1.3`; `META_EXTRACTION_MODEL` can select another reading model without a code change. Eight model calls.

## 2026-11-04 production with `muse-spark-1.3-contributor` (`f671f3b`)

Reading, search and comparison default to `muse-spark-1.3-contributor` (the owner's cost decision; see the privacy notice). Same two photos with their official links, twice each, reading then check, one call each: Seoul notice `changed` with a verified deadline 2 of 2, title read correctly ("서울영커리언스") 2 of 2, 32.3 and 35.7 s end to end (reading 16.4–19.8 s, comparison 12.6–13.6 s); Smithsonian fellowship `review` 2 of 2 (identity not confirmed, as with the earlier models), 12.0 and 16.4 s (reading 3.6–4.0 s, comparison 7.6–10.2 s). Median 24.3 s over these four runs versus 26.8 s with `muse-spark-1.3` at minimal effort. Four runs are a small sample: no accuracy claim beyond these outcomes, and the original P50 15 s / P90 30 s target is not shown to be met. Eight model calls.
