# Validation record

Validated in the cloud checkout with Node.js 24.19.0 and Next.js 16.4.4. A single display-language setting controls the complete interface and results in ten languages. The usage region can be selected from 249 countries and regions or estimated on-device after an explicit location request. These implementation checks do not establish global source coverage or live model quality.

| Check | Result |
| --- | --- |
| TypeScript | Passed on the final UI revision |
| Behavioral/security unit tests | 74 passed, including Marketplace Redis configuration, local country lookup and complete interface/result dictionaries |
| Production build | Passed on the final UI revision |
| Chromium production HTTP browser flow groups | 19 passed on localhost with `APP_URL` matching the server origin |
| Automated accessibility | No detected WCAG A/AA violations on 13 inspected snapshots |
| Browser runtime errors | None during the inspected flows |
| Responsive layouts | No horizontal overflow in all ten home languages, settings, and Arabic, German and French results at 320 and 390px; the inspected mobile result at 360px also passed |

The 13 accessibility snapshots cover desktop home, synthetic result and HTTP-fixture review; mobile home and result; and settings plus Arabic, German and French results at each of 320px and 390px. These checks are not a full accessibility certification or physical-device testing.

Browser flows covered a single display-language setting independent of region; saved preferences and a supported browser-language default, including blocked local storage; all ten interface languages and result headings; Arabic RTL, copy feedback and original-value preservation without another request; on-demand mocked geolocation success, denial, timeout, uncertain positions, stale callbacks and local-only coordinates; optional region memory and clearing; synthetic results and quotes; image upload/crop/rotation; unsupported-file recovery; edition and extracted-country correction; candidate-URL rechecks; visible deletion failures; cancellation without deleting the previous result; and mocked HTTP extraction/NDJSON handling. See `scripts/browser-check.mjs`. The browser suite uses synthetic examples and HTTP fixtures, not real Meta inference.

Regression tests cover complete nonempty interface and result dictionaries across all ten display languages, actual local country polygons for cities and territories, imprecise/invalid positions, ocean and border rejection, and international-date-line samples, unchanged Korean and English wording, independent API language validation, preservation of source values across language choices, and rejection of model-rewritten values and quotes including case, Unicode-width and whitespace changes. Other tests cover incomplete comparisons and source failures staying in review, malformed provider envelopes and country codes, Redis deletion removing stale idempotency mappings, and SQLite idempotency/concurrency under six actual competing processes.

A previous production HTTP run passed eight checks for home/security headers, cookie/readiness, origin rejection, missing configuration, unknown-result protection, session requirement, session deletion and unknown demo. That run configured `APP_URL` to the test server's exact origin. Keep production and preview origin settings separate when deploying.

Redis tests execute production Lua commands in an in-memory Redis emulator. Meta contract and browser HTTP-fixture tests do not make real provider calls. These checks are not a hosted Redis integration test, model-accuracy study, physical Safari/Android test or proof of language quality in live Meta output.

The Vercel project is connected, and production deployments have reached READY at https://stillvalid-beta.vercel.app. `META_API_KEY` and `META_MODEL=muse-spark-1.3` are registered for Production. Marketplace Redis provided the sensitive `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables for Production and Preview. Registration was checked without reading secret values. Preview has no Meta key. Local tests do not establish actual provider requests or hosted Redis operations. The opt-in hosting-build probe performs a real short-lived Redis write/read/delete and one real text inference on an explicitly synthetic diagnostic input; its fixed success/failure record is written to that deployment's build logs. Images, search, real-notice evaluation, external HTTP/TLS requests and the Docker image remain separate release checks. The authoring environment's enforced outbound policy does not permit the deployment host or api.meta.ai. Native Vercel Git deployment is independent of GitHub Actions; remote CI capacity is currently reported exhausted by the user.

Marketplace configuration tests execute the real backend selection and REST transport with a mocked HTTP response: the writable KV token and endpoint are selected together; a complete canonical pair takes precedence; incomplete pairs never mix or fall back; blank template variables still permit local SQLite; raw Redis URLs and read-only tokens cannot configure REST storage. These tests do not establish hosted Redis connectivity or actual Meta inference.

The latest local browser run includes the upstream liquid-glass theme. The 19 flow groups passed with no page errors and no detected accessibility violations on the same 13 snapshots after small text-link colors were darkened to meet contrast requirements. This is a localhost check, separate from the hosting-build probe and real-device evaluation.

The [mobile screenshot](screenshots/mobile.png) and [desktop screenshot](screenshots/desktop.png), [desktop settings](screenshots/desktop-settings.png), [mobile settings](screenshots/mobile-settings.png), [desktop Arabic result](screenshots/desktop-arabic-result.png) and [mobile Arabic result](screenshots/mobile-arabic-result.png) show inspected synthetic flows without private notices or credentials. The [product acceptance checklist](acceptance.md) records the remaining live release gate; its ten real-notice task slots are not completed measurements.

Location UI tests inject browser positions and permission errors. They do not establish real GPS, device permission or disputed-border accuracy. Lookup data is loaded on demand and coordinates are not sent to an app or geocoding endpoint. See the local country-coder license notice under public/licenses.
