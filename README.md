# StillValid

Mobile-first AI web app that compares notice photos with official sources and explains changes with evidence, country settings, and multilingual results.

StillValid helps people check whether a saved event poster, public-program notice, or facility announcement still matches the official information available at the time of checking.

한국어 작업명은 **지금도 맞나요**입니다. 저장해 둔 공고 사진을 공식 자료와 대조해, 달라진 내용과 다음 확인 행동을 사용자의 언어로 알려주는 모바일 웹앱을 목표로 합니다.

## Project status

**Repository setup — application implementation is pending.**

This repository currently contains project documentation, an MIT license, ignore rules, and an example environment file. The capabilities below are planned; a working application, model integration, evaluation results, and a deployed demo are not yet available.

| Submission resource | Status |
| --- | --- |
| Live web app | Not deployed yet |
| Three-minute demo video | Not recorded yet |
| Evaluation results | Not measured yet |

## The problem

People often keep a screenshot or photo of a notice after its deadline, location, or event status has changed. Finding the right official update and comparing it with the original can be difficult, especially across languages.

The project focuses initially on public events, classes and programs, and facility notices.

## Planned features

- **Photo and text input:** read a notice from an uploaded image or pasted text.
- **Optional country settings:** select the country relevant to the notice without GPS; country and result language remain independent.
- **Official-source discovery:** use extracted links and identifying information to find candidate sources, with an official URL input as a fallback.
- **Notice identity checks:** distinguish institutions, locations, years, and event editions before comparing.
- **Evidence-linked comparison:** show previous and current values, supporting passages, source URLs, and the time checked.
- **Multilingual results:** start with English and Korean while preserving original names, dates, addresses, and evidence.
- **Clear uncertainty and recovery:** explain ambiguous dates, missing sources, access failures, and retry options.
- **Mobile-first interaction:** make the complete flow usable from a phone without requiring an account.

Selecting a country will not imply a language, a single time zone, or verified coverage of every institution in that country.

## Intended user flow

1. Optionally select the notice country and choose a result language.
2. Upload a notice photo or enter its text.
3. Review identifying details when clarification is needed.
4. Find and verify official-source candidates, or provide an official URL.
5. Compare the same notice or event edition against the retrieved material.
6. Read what changed, inspect the evidence, and choose the next confirmation action.
7. Retry, start a new check, or delete the check as appropriate.

A missing search result must not be interpreted as a cancellation or proof that nothing has changed. Results describe the retrieved evidence and its limits, not guaranteed completeness across the internet.

## Planned architecture and Meta model use

The proposed stack is React, Next.js, and TypeScript, with server-side model calls, source retrieval, validation, and check-state management.

A Meta model is intended to help extract structured information from notice images and interpret retrieved material. The final model identifier and API configuration will be recorded after account access and an actual image request are verified.

Application logic must validate structured outputs, notice identity, dates, and quoted evidence before presenting a confirmed change. Retrieved documents are input data, not instructions for the application.

## Getting started

Clone the repository:

```bash
git clone https://github.com/ZOOGOM/stillvalid.git
cd stillvalid
```

There is no application package or runnable development server yet. Installation, development, build, and test commands will be added with the application code.

The [.env.example](.env.example) file contains proposed server-side variable names with empty values. They are placeholders for the upcoming implementation, not an already-working API integration. Never commit real credentials.

## Evaluation plan

Before submission, evaluate real and clearly labeled synthetic cases covering:

- changed, matching, expired, and canceled notices;
- different institutions, locations, years, or event editions;
- country mismatch, an unset country, and ambiguous dates or time zones;
- missing, blocked, conflicting, and unavailable official sources;
- consistency between English and Korean results;
- mobile input, error recovery, deletion, request limits, latency, and cost.

Report measured case counts, errors, timings, and costs separately from targets. No performance or accuracy claims have been established yet.

## Privacy and security requirements

Before deployment, the application must:

- keep model and search credentials on the server;
- validate uploaded files and fetched URLs, including redirects and private-network destinations;
- restrict access to each check and its uploaded material;
- implement and verify deletion and expiration;
- limit requests, retries, and spending;
- avoid logging raw uploads, complete extracted text, or personal contact details by default.

Do not upload student records, private school notices, personal contact details, or credentials to this public repository. Use permitted public material or clearly labeled synthetic samples.

## Scope and limitations

Global access is the product goal. Verified source, language, and notice coverage will be disclosed as it is tested.

Initial use is limited to understanding public notices and their documented changes. The project does not provide individualized eligibility decisions, medical or legal judgments, emergency instructions, or application and payment services.

The hackathon submission target is a working, hosted mobile web app. App-store distribution, accounts, payments, push notifications, and broader coverage are later stages.

## License

Original project code is licensed under the [MIT License](LICENSE).

Third-party libraries, models, images, and notice content retain their own licenses and terms. This repository's MIT license does not grant rights to those materials.
