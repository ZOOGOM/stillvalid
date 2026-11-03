# Validation record

Validated in the cloud checkout with Node.js 24.19.0 and Next.js 16.4.4.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Behavioral/security unit tests | 47 passed |
| Production build | Passed |
| Production HTTP checks | 6 passed: cookie flags, origin rejection, missing configuration, result isolation, deletion, unknown demo |
| Chromium browser flow groups | 11 passed |
| Automated accessibility | No detected WCAG A/AA violations on the five inspected desktop/mobile/review snapshots |
| Browser runtime errors | None during the inspected flows |
| 360px and 390px layouts | No horizontal overflow in the inspected views |

Browser flows covered optional country selection, opt-in memory and clearing, example results and quotes, language switching without fact changes, image upload/crop/rotation, deletion, and mocked HTTP extraction/NDJSON handling. See `scripts/browser-check.mjs`.

Redis tests execute the production Lua commands in an in-memory Redis emulator. Meta contract and browser HTTP-fixture tests do not make real provider calls. This is not a hosted Redis integration test, model-accuracy study, real-device Safari/Android test or full accessibility certification.

`npm run verify:meta` reported that no API key was configured in this session; no catalog or inference request was made. The inspected outbound policy also did not allow api.meta.ai. Actual provider requests, real-notice evaluation, external deployment, production TLS and the Docker image remain unverified.

The [mobile screenshot](screenshots/mobile.png) shows the actual UI with live checks unavailable and clearly labeled synthetic examples. It contains no private notice or credential.
