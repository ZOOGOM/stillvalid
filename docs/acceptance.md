# Product acceptance and release checks

StillValid helps a person compare a saved notice with official material, then understand changes, supporting quotes and the next confirmation step. The first release is a mobile web app with ten display languages, an optional usage region and no GPS requirement.

This checklist translates the existing StillValid product plan into inspectable implementation and release criteria. Code and automated checks are separate from live provider, hosted-storage and real-device validation. See [validation evidence](validation.md) for results actually observed.

## Complete user flow

1. In one settings dialog choose a display language for the interface and results, and optionally select a usage region from 249 countries and regions. These choices are independent. Remembering the region is opt-in and reversible; the app does not infer nationality, residence or time zone, or establish the notice country from GPS or IP.
2. Upload or photograph one JPEG, PNG or WebP, or paste notice text. Crop, rotate and preview the image locally before sending it. Recover from an unsupported file, oversized upload or unreadable image by choosing another input.
3. Review and correct the title, institution, edition, country read from the notice, and original text. The usage region and extracted notice country are separate. Confirm a disagreement between them.
4. Search official-source candidates using Meta's built-in web search, or supply a public HTTPS source URL. Retrieve actual source text and check notice identity and quoted evidence.
5. Read the result, individual before/after values, uncertainty, source URLs and retrieval times. Open supporting quotes. An incomplete check stays a review or unavailable result.
6. If identity remains unclear, inspect the displayed candidates and choose one for a new check. Candidate links are labeled as unverified until the source and notice have been checked. This is a recovery path on the result screen; a separate pre-comparison candidate-selection API is not implemented.
7. Switch display language without changing the verdict or original dates, amounts, institution names, addresses, before/after values or quotes, and without another model call. Copy a summary, check again, or delete a result. Session-wide deletion is available in the privacy dialog.

Display languages are English (`en`), Simplified Chinese (`zh`), Spanish (`es`), French (`fr`), German (`de`), Japanese (`ja`), Korean (`ko`), Portuguese (`pt`), Arabic (`ar`) and Russian (`ru`). One selection applies to the interface, results, errors, settings and copied summaries. Arabic uses RTL throughout and isolates original text direction; Traditional Chinese is a later consideration. The checks API `lang` field is the display language. Selecting a region does not change language; selecting a language does not change the region or `notice.country`. Detect the notice language independently, including multilingual notices, without forcing a country-specific language.

Initialize from valid `sv_display_lang`, legacy `sv_result_lang`, legacy `sv_lang`, a supported browser-language base code, then English. Remove legacy keys only after saving the new preference. Never infer usage region from language. Chinese uses `zh-CN` and Portuguese uses `pt-BR`.

An explicit location button may request a one-time HTTPS location permission. Browser-local boundary lookup does not send, store or log coordinates; positions with accuracy over 20 km, ocean, unsupported and uncertain boundaries require manual selection. Center plus eight samples and a minimum 1 km guard are approximate, not a legal boundary or full-radius guarantee. Detection changes only usage region; allow correction and handle denial, timeout, cancellation and late responses. Actual device GPS remains to be verified.

## Feature coverage

| Requirement | Implementation | Acceptance evidence |
| --- | --- | --- |
| Anonymous mobile use | Main app and session cookie | Browser flow, session isolation and origin checks |
| Optional region and independent display language | Usage-region picker and ten display-language dictionaries | Region memory/clear, mismatch confirmation and fact-preservation checks; live language quality remains unverified |
| Image/text input and local editing | Browser preparation, crop and rotation | Real browser file input and canvas flow; unsupported-file recovery |
| Extraction review | Editable title, institution, edition and transcript | HTTP-fixture extraction and review checks |
| Official-source discovery | Meta Responses search and actual returned URL evidence | Provider-contract tests and recorded production search observations; attachment/blocked candidates can prevent confirmation |
| Bounded source retrieval | Public DNS pinning, HTTPS and redirect/body limits | Security/parser tests and recorded production retrieval from Seoul, GOV.UK and Smithsonian; coverage of other institutions is unmeasured |
| Identity and evidence comparison | Quote checks, identity/edition/section/archive/country/date guards, partial/conflict handling | Regression tests and controlled production comparisons; no human-labelled accuracy benchmark |
| Candidate recovery | Candidate URL selection followed by a new check | Browser HTTP-fixture flow; no claim that a candidate alone is official |
| Progress and cancellation | NDJSON phases, cancellation and stale-operation guards | Browser fixture and cancellation checks |
| Deletion and expiry | Owner-scoped result/session deletion and 24-hour lifetime | SQLite and Redis behavior tests, browser deletion/error checks |
| Shared usage controls | Atomic Redis operations or SQLite transactions | Emulator tests and SQLite multi-process concurrency tests |
| Accessible mobile presentation | Focus handling, keyboard controls, readable inputs and touch targets | Automated browser/accessibility checks and one user-reported iPhone camera/result flow; comprehensive Safari/HEIC and Android checks remain pending |
| Deployable service | Vercel + Marketplace Upstash Redis settings, or single-server Docker | Vercel production deployment reached READY; real provider/storage and external HTTP verification are separate checks |

## Live release gate

Complete these on the deployed HTTPS service before describing it as ready for judging:

- [x] Connect the reviewed GitHub version to Vercel with Node.js 24.
- [x] Register `META_API_KEY`, both Marketplace KV REST variables and the correct production `APP_URL` as server environment variables.
- [x] Check account/model access, then perform actual image extraction, web search, source retrieval and comparison. The dated production observations in [validation](validation.md) cover these operations; they are separate runs, not a claim that every search yields a verified result.
- [ ] Run the ten real-notice tasks below, record human reference answers and investigate every incorrect definitive result.
- [ ] Evaluate actual Meta output quality for each display language separately from the implemented dictionaries; record observed evidence and limitations. Selecting 249 regions does not establish worldwide notice coverage.
- [x] Exercise individual and session-wide deletion on the deployed service; see the dated production validation records.
- [ ] Complete hosted anonymous-session isolation, expiry, duplicate submission and shared request/concurrency limit coverage. Local SQLite/emulator tests and successful deletion alone do not complete this item.
- [ ] Complete real iPhone Safari and Android Chrome coverage, including camera permission failure, upload, editing, keyboard, zoom and network interruption. One user-reported iPhone camera/result flow is recorded in [validation](validation.md); it does not complete the full gate or establish HEIC support.
- [x] Record production source failures and provider stall/output failures without presenting synthetic output as a live result; see [evaluation](evaluation.md#2026-11-04-synthetic-release-run) and [validation](validation.md).
- [ ] Complete hosted provider-limit and insufficient-configuration recovery coverage. Local HTTP fixtures and normal successful traffic do not establish these production failure modes.
- [ ] Confirm provider retention, billing/credits, hosting quotas, deployment rollback and service availability through judging.
- [ ] Align the public code, README, deployment URL and three-minute demonstration with one stable version.

## Real-notice evaluation sheet

The following are task slots, not completed evaluations or synthetic test results. For every task, record permitted input material, the official source URL, institution/edition/country/time zone, human reference answer and quote, observed result, errors, elapsed time and provider usage/cost. Keep private notices and personal information out of the public repository.

| Task | Required real example | Expected decision boundary | Run status |
| --- | --- | --- | --- |
| 1 | Application deadline changed | Identify the supported new deadline without inventing a time | Not run |
| 2 | Event date changed | Keep the correct edition and original date wording | Not run |
| 3 | Venue changed | Link the new venue to the official amendment quote | Not run |
| 4 | Cost changed | Distinguish the actual price change from unrelated fees | Not run |
| 5 | Eligibility changed | Report the published change without deciding a person's eligibility | Not run |
| 6 | All extracted fields agree | Say the retrieved material agrees within the checked scope | Not run |
| 7 | Explicit cancellation or elapsed deadline | Require cancellation evidence or an unambiguous dated time zone | Not run |
| 8 | Similar notice, different institution/edition | Request review and allow candidate/source correction | Not run |
| 9 | Ambiguous numeric date or missing time zone | Preserve ambiguity rather than infer a deadline | Not run |
| 10 | Missing, inaccessible or unsupported source | Explain unavailability and the next input/retry action | Not run |

Include country-unset, country-mismatch and cross-language cases across this sheet. Report exact observed results and sample size; do not infer general accuracy or guaranteed harm prevention from ten examples.
