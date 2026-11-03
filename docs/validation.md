# Validation record

Validated in the cloud checkout with Node.js 24.19.0 and Next.js 16.4.4. The app has two interface languages (Korean and English), ten independently selectable result languages, and 249 manually selectable countries and regions. These implementation checks do not establish global source coverage or live model quality.

| Check | Result |
| --- | --- |
| TypeScript | Passed on the final UI revision |
| Behavioral/security unit tests | 64 passed before the final UI-only storage exception fix; the test sources did not change afterward |
| Production build | Passed on the final UI revision |
| Chromium production HTTP browser flow groups | 18 passed on localhost with `APP_URL` matching the server origin |
| Automated accessibility | No detected WCAG A/AA violations on 13 inspected snapshots |
| Browser runtime errors | None during the inspected flows |
| Responsive layouts | No horizontal overflow in settings and Arabic, German and French results at 320 and 390px; the inspected mobile result at 360px also passed |

The 13 accessibility snapshots cover desktop home, synthetic result and HTTP-fixture review; mobile home and result; and settings plus Arabic, German and French results at each of 320px and 390px. These checks are not a full accessibility certification or physical-device testing.

Browser flows covered independent region, interface and result-language settings; saved preferences and a supported browser-language default, including blocked local storage; ten result-language headings; Arabic RTL, copy feedback and original-value preservation without another request; optional region memory and clearing; synthetic results and quotes; image upload/crop/rotation; unsupported-file recovery; edition and extracted-country correction; candidate-URL rechecks; visible deletion failures; cancellation without deleting the previous result; and mocked HTTP extraction/NDJSON handling. See `scripts/browser-check.mjs`. The browser suite uses synthetic examples and HTTP fixtures, not real Meta inference.

Regression tests cover complete nonempty dictionaries across all ten result languages, unchanged Korean and English wording, independent API language validation, preservation of source values across language choices, and rejection of model-rewritten values and quotes including case, Unicode-width and whitespace changes. Other tests cover incomplete comparisons and source failures staying in review, malformed provider envelopes and country codes, Redis deletion removing stale idempotency mappings, and SQLite idempotency/concurrency under six actual competing processes.

A previous production HTTP run passed eight checks for home/security headers, cookie/readiness, origin rejection, missing configuration, unknown-result protection, session requirement, session deletion and unknown demo. That run configured `APP_URL` to the test server's exact origin. Keep production and preview origin settings separate when deploying.

Redis tests execute production Lua commands in an in-memory Redis emulator. Meta contract and browser HTTP-fixture tests do not make real provider calls. These checks are not a hosted Redis integration test, model-accuracy study, physical Safari/Android test or proof of language quality in live Meta output.

`npm run verify:meta` previously reported that no API key was configured; no catalog or inference request was made. The inspected outbound policy did not allow api.meta.ai. Actual provider requests, real-notice evaluation, hosted Redis, external deployment, production TLS and the Docker image remain unverified. Vercel and Upstash have not been connected or configured for production.

The [mobile screenshot](screenshots/mobile.png) and [desktop screenshot](screenshots/desktop.png), [desktop settings](screenshots/desktop-settings.png), [mobile settings](screenshots/mobile-settings.png), [desktop Arabic result](screenshots/desktop-arabic-result.png) and [mobile Arabic result](screenshots/mobile-arabic-result.png) show inspected synthetic flows without private notices or credentials. The [product acceptance checklist](acceptance.md) records the remaining live release gate; its ten real-notice task slots are not completed measurements.
