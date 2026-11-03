# Validation record

Validated in the cloud checkout with Node.js 24.19.0 and Next.js 16.4.4.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Behavioral/security unit tests | 55 passed |
| Production build | Passed |
| Production HTTP checks | 8 passed: home/security headers, cookie/readiness, origin rejection, missing configuration, unknown-result protection, session requirement, session deletion, unknown demo |
| Chromium browser flow groups | 15 passed |
| Automated accessibility | No detected WCAG A/AA violations on the five inspected desktop/mobile/review snapshots |
| Browser runtime errors | None during the inspected flows |
| Responsive layouts | No horizontal overflow across Korean/English home views at 320, 360, 390, 768, 1024 and 1440px; additional narrow result and long-country checks passed |

Browser flows covered optional country selection, opt-in memory and clearing, example results and quotes, language switching without fact changes, image upload/crop/rotation, unsupported-file recovery, edition correction, independent extracted-country correction, candidate-URL rechecks, visible deletion failures, cancellation without deleting the previous result, mobile input/touch sizes, and mocked HTTP extraction/NDJSON handling. See `scripts/browser-check.mjs`.

The production HTTP run set `APP_URL` to the test server's exact origin. An initial run with a different configured origin correctly failed the origin check; aligning that setting resolved the test setup. Keep production and preview origin settings separate when deploying.

Regression tests now also cover incomplete comparisons/source failures staying in review, malformed provider envelopes/country codes, Redis deletion removing stale idempotency mappings, and SQLite idempotency/concurrency under six actual competing processes. The UI and comparison state of all three synthetic scenarios remains consistent in English and Korean.

Redis tests execute the production Lua commands in an in-memory Redis emulator. Meta contract and browser HTTP-fixture tests do not make real provider calls. This is not a hosted Redis integration test, model-accuracy study, real-device Safari/Android test or full accessibility certification.

`npm run verify:meta` reported that no API key was configured in this session; no catalog or inference request was made. The inspected outbound policy also did not allow api.meta.ai. Actual provider requests, real-notice evaluation, external deployment, production TLS and the Docker image remain unverified.

The [mobile screenshot](screenshots/mobile.png) and [desktop screenshot](screenshots/desktop.png) show the actual UI with live checks unavailable and clearly labeled synthetic examples. They contain no private notice or credential. The [product acceptance checklist](acceptance.md) records implemented coverage and the remaining live release gate; its ten real-notice task slots are not completed measurements.
