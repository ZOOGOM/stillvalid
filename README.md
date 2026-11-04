# StillValid

### Saved a notice. Still the same? · 저장해 둔 공고, 지금도 그대로일까요?

Compare a notice photo or text with current official-source material. See **changes, supporting quotations and what still needs confirmation** before you act.

공고 사진이나 글을 현재 공식 자료와 비교해 **변경 내용·원문 근거·추가 확인 사항**을 보여 주는 모바일 중심 웹앱입니다.

[**Open the app / 앱 열기**](https://stillvalid-beta.vercel.app) · [English guide](README.en.md) · [한국어 안내](README.ko.md)

<p align="center">
  <img src="docs/screenshots/readme/en-home.jpg" width="310" alt="Actual English production home screen with photo and text input">
  <img src="docs/screenshots/readme/ko-result.jpg" width="310" alt="실제 한국어 운영 UI에서 보여 주는 합성 예제 변경 결과">
</p>

Actual production UI captured on **5 November 2026 (KST)**. The result is a labelled **synthetic example**, not a live model verification. [Image provenance](docs/screenshots/readme/README.md).

실제 운영 화면 캡처입니다. 결과는 **합성 예제**이며 실제 공고를 모델로 검증한 결과가 아닙니다.

## Choose your guide · 안내 선택

| English | 한국어 |
|---|---|
| [Five-step walkthrough](README.en.md#check-a-notice-in-five-steps) | [다섯 단계 사용 방법](README.ko.md#다섯-단계로-확인하기) |
| [Current features](README.en.md#what-is-available-today) | [현재 기능](README.ko.md#현재-사용할-수-있는-기능) |
| [Understand the result](README.en.md#understand-the-result) | [결과 읽는 방법](README.ko.md#결과를-읽는-방법) |
| [Evidence checks](README.en.md#how-the-evidence-is-checked) | [근거 검증 원리](README.ko.md#근거를-확인하는-원리) |
| [Speed and its limits](README.en.md#speed-what-improved-and-what-is-unproven) | [속도 개선과 한계](README.ko.md#속도-개선과-아직-확인하지-못한-점) |
| [Privacy and validation](README.en.md#privacy-limits-and-current-validation) | [개인정보·한도·검증 현황](README.ko.md#개인정보한도검증-현황) |
| [Run and develop](README.en.md#run-and-develop) | [실행·개발 안내](README.ko.md#직접-실행하고-개발하기) |

## What it does

- **Read:** one notice photo or pasted text; crop/rotate and optional SAM 3.1 notice-region selection.
- **Find:** a supplied official HTTPS page or candidates from Meta's built-in web search.
- **Compare:** up to two related sources, exact quotations and deterministic authority/identity checks.
- **Explain:** changed, matched, cancelled, expired, review or unavailable—with reasons and next actions.
- **Follow up:** live-result Google Maps search links, summary copying, fresh checks and deletion.
- **Display:** ten languages, Arabic RTL and an optional usage region independent of notice country.

The Spark stages default to **`muse-spark-1.3-contributor`**. **Submitted inputs may be used to improve Meta's models under its terms.** Keys stay server-side; deleting a StillValid result does not delete provider-held data.

기본 contributor 모델에 제출한 입력은 Meta 약관에 따라 모델 개선에 쓰일 수 있습니다. 앱은 이를 10개 언어로 안내합니다.

**Try without a model call:** the home page includes synthetic examples for changes, cancellation and a different edition. A review result is an explicit limitation, not a hidden “no change.”

## Quick start

Requires Node.js **24** and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Examples work without a key. Live checks require a server-side Meta key and suitable network access; Vercel also requires writable shared Redis storage. [Deployment instructions](docs/deployment.md).

```bash
npm run check     # type checking, unit tests, evaluation fixtures
npm run build
npm start
```

The preceding application release passed **205 unit tests, 7 evaluation-harness tests, a production build and 7 browser suites**. These are not general-accuracy or physical-device guarantees. The full ten-case real-notice study and representative latency evaluation remain incomplete.

## Project references

- [Implementation checklist](docs/acceptance.md) · [Evaluation methodology](docs/evaluation.md)
- [Validation history](docs/validation.md) · [Performance behaviour](docs/performance.md)
- [Deployment and environment variables](docs/deployment.md) · [Submission description](docs/submission.md)
- Backup production address: [stillvalid-zoogom.vercel.app](https://stillvalid-zoogom.vercel.app)

Built for the Meta Global AI Developer Hackathon, **Indie developer** track, “Build for Your World.”

Original source: [MIT](LICENSE). External libraries, models and content retain their own terms. The app footer remains **Copyright 2026 Zoogom. All rights reserved.**
