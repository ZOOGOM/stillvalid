# Product acceptance and release checks

StillValid helps a person compare a saved notice with official material, then understand changes, supporting quotes and the next confirmation step. The first release is a mobile web app with English and Korean interfaces, optional notice-country settings and no GPS requirement.

This checklist translates the existing StillValid product plan into inspectable implementation and release criteria. Code and automated checks are separate from live provider, hosted-storage and real-device validation. See [validation evidence](validation.md) for results actually observed.

## Complete user flow

1. Choose English or Korean and optionally select the notice country. Country is independent of interface language, citizenship, residence and time zone. Remembering a country is opt-in and reversible.
2. Upload or photograph one JPEG, PNG or WebP, or paste notice text. Crop, rotate and preview the image locally before sending it. Recover from an unsupported file, oversized upload or unreadable image by choosing another input.
3. Review and correct the title, institution, edition, country read from the notice, and original text. The selected country and the extracted country are displayed separately. Confirm a disagreement between the selected country and the country read from the notice.
4. Search official-source candidates using Meta's built-in web search, or supply a public HTTPS source URL. Retrieve actual source text and check notice identity and quoted evidence.
5. Read the result, individual before/after values, uncertainty, source URLs and retrieval times. Open supporting quotes. An incomplete check stays a review or unavailable result.
6. If identity remains unclear, inspect the displayed candidates and choose one for a new check. Candidate links are labeled as unverified until the source and notice have been checked. This is a recovery path on the result screen; a separate pre-comparison candidate-selection API is not implemented.
7. Switch language without changing quoted facts, copy a summary, check again, or delete a result. Session-wide deletion is available in the privacy dialog.

## Feature coverage

| Requirement | Implementation | Acceptance evidence |
| --- | --- | --- |
| Anonymous mobile use | Main app and session cookie | Browser flow, session isolation and origin checks |
| Optional country and independent language | Country picker and bilingual UI | Country memory/clear, mismatch confirmation and language-preservation checks |
| Image/text input and local editing | Browser preparation, crop and rotation | Real browser file input and canvas flow; unsupported-file recovery |
| Extraction review | Editable title, institution, edition and transcript | HTTP-fixture extraction and review checks |
| Official-source discovery | Meta Responses search and actual returned URL evidence | Provider-contract tests; live search still requires deployment validation |
| Bounded source retrieval | Public DNS pinning, HTTPS and redirect/body limits | Security and parser tests; actual institution access remains a live release check |
| Identity and evidence comparison | Quote checks, edition/country/date guards, partial/conflict handling | Comparison tests and clearly labeled synthetic examples |
| Candidate recovery | Candidate URL selection followed by a new check | Browser HTTP-fixture flow; no claim that a candidate alone is official |
| Progress and cancellation | NDJSON phases, cancellation and stale-operation guards | Browser fixture and cancellation checks |
| Deletion and expiry | Owner-scoped result/session deletion and 24-hour lifetime | SQLite and Redis behavior tests, browser deletion/error checks |
| Shared usage controls | Atomic Redis operations or SQLite transactions | Emulator tests and SQLite multi-process concurrency tests |
| Accessible mobile presentation | Focus handling, keyboard controls, readable inputs and touch targets | Automated browser/accessibility checks; actual iOS/Android remains pending |
| Deployable service | Vercel + Upstash Redis settings, or single-server Docker | Production build; external deployment and hosted services remain pending |

## Live release gate

Complete these on the deployed HTTPS service before describing it as ready for judging:

- [ ] Connect the reviewed GitHub version to Vercel with Node.js 24.
- [ ] Register `META_API_KEY`, both Upstash REST variables and the correct production `APP_URL` as server environment variables.
- [ ] Check account/model access, then perform actual image extraction, web search, source retrieval and comparison. A models-list response alone is insufficient.
- [ ] Run the ten real-notice tasks below, record human reference answers and investigate every incorrect definitive result.
- [ ] Exercise a different anonymous session, individual deletion, session-wide deletion, expiry, duplicate submission and shared request/concurrency limits on hosted Redis.
- [ ] Test a real iPhone Safari and Android Chrome, including camera permission failure, upload, editing, keyboard, zoom and network interruption.
- [ ] Check source-site failures, provider timeout/limit errors, insufficient configuration and recovery without returning a synthetic result as live output.
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
