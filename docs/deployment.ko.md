# Vercel Git 자동 배포와 검토 설정

기존 Vercel `stillvalid` 프로젝트는 GitHub의 `ZOOGOM/stillvalid` 저장소에 연결되어 있습니다. 알려진 운영 주소는 [https://stillvalid-beta.vercel.app](https://stillvalid-beta.vercel.app)입니다. GitHub Actions 용량이 초과되어 실행되지 않는다는 사용자 보고가 있습니다. Vercel은 Git 변경을 직접 빌드·배포하며 자체 요금제와 한도를 적용합니다.

현재 `main`에는 설정 문서만 있고 실제 앱은 `feat/stillvalid-webapp`에 있습니다. 기능 브랜치에 푸시하면 Git 연동이 미리보기 배포를 생성합니다. 운영 브랜치 설정이 변경되었거나 앱이 병합되었다고 가정하지 말고 배포별 브랜치와 커밋을 확인하세요.

## 1. 기본 화면을 배포하고 검토하기

1. 기존 프로젝트의 배포 목록에서 대상 배포가 READY인지, 브랜치와 커밋 SHA가 검토할 코드와 일치하는지 확인합니다. 저장소 루트가 프로젝트 루트이며 Node.js는 24입니다.
2. 운영 환경의 `APP_URL`은 실제 외부 HTTPS 주소의 정확한 origin으로 설정하고 변경 후 다시 배포합니다. 예를 들어 주소가 `https://example.com/path`이면 origin은 `https://example.com`입니다. 독립적인 미리보기 주소에서는 `APP_URL`을 비워 두거나 그 주소의 정확한 origin을 사용합니다.
3. 검토자가 URL을 열 수 있도록 해당 배포의 **Deployment Protection** 설정을 확인하고 외부 접근을 허용합니다. 프로젝트 설정과 요금제에 따라 가능한 옵션이 다를 수 있습니다. 공개 접근을 허용하면 링크를 가진 다른 사람도 볼 수 있습니다. 로그인하지 않은 별도 브라우저에서 URL이 열리는지 확인한 뒤 검토에 사용하세요. 비밀번호나 우회 토큰을 채팅이나 문서에 넣지 마세요.

이 단계에서는 `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`를 GitHub에 등록할 필요가 없습니다. 기본 UI, 위치 선택 기능과 명시된 합성 예시는 Meta·Redis 비밀값 없이 검토할 수 있습니다. GPS는 HTTPS 환경과 사용자의 위치 권한이 필요합니다.

## 2. 실제 공고 확인을 사용하기

`META_API_KEY`와 `META_MODEL=muse-spark-1.3`은 Production에만 등록되어 있습니다. Preview에서 실제 확인을 하려면 해당 환경에도 Meta 설정이 필요합니다. Upstash를 Vercel Marketplace로 연결해 `KV_REST_API_URL`과 `KV_REST_API_TOKEN`이 Production과 Preview에 제공되었습니다. 앱은 이 쌍 또는 `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN` 정식 쌍을 자동으로 사용합니다. 읽기 전용 `KV_REST_API_READ_ONLY_TOKEN`이 아닌 쓰기 가능한 REST 토큰이 필요하며, 원시 `REDIS_URL`과 `KV_URL`은 사용하지 않습니다. 두 쌍이 모두 완전하면 정식 쌍이 우선하며 같은 데이터베이스를 가리켜야 합니다. 선택된 쌍이 불완전하면 확인이 차단되고 서로 다른 쌍의 URL과 토큰을 섞지 않습니다. Meta 또는 공유 저장소 설정이 없으면 실제 공고 확인은 차단됩니다. 환경변수 변경 후에는 다시 배포하고, 키나 토큰 값을 채팅, 문서, 저장소, 로그에 넣지 마세요.

Marketplace 연결과 환경변수 등록만으로 앱의 실제 연결이 확인된 것은 아닙니다. 호스팅 빌드 로그에서 진단 결과를 확인한 뒤, 실제 공개 공고로 추출·공식 출처 조회·비교·인용문을 검토하고 별도 세션 간 격리와 삭제·만료도 확인하세요. Meta, Vercel, Upstash의 요금과 한도를 각각 확인해야 합니다. 앱의 호출 횟수 제한은 금액 기준 결제 차단이 아닙니다.

호스팅 빌드는 `npm run vercel-build`를 사용합니다. 검토한 운영 배포 한 번에 `STILLVALID_VERIFY_DEPLOYMENT=1`을 설정하면 Redis PING·쓰기·조회·삭제와 명시된 합성 진단 문구의 실제 Meta 텍스트 추출을 검사합니다. 모델 요청은 기존 전역 호출 한도를 사용합니다. 실패하면 새 빌드를 중단하며 이전 운영 배포는 유지됩니다. 로그에는 고정된 검사 단계·HTTP 상태·안전한 성공 여부만 남깁니다. 검사 후에는 플래그를 `0`으로 되돌립니다. 기본값은 검사 생략이며, 이 검사만으로 이미지·검색·공식 자료·실제 공고 정확도나 브라우저 접속을 검증한 것은 아닙니다.

## 이후 변경과 검증

연결된 저장소의 브랜치에 푸시하면 Vercel Git 연동이 해당 변경의 배포를 시작합니다. GitHub Actions 성공 여부가 배포를 보장하거나 차단하지 않으므로 푸시 전 로컬에서 `npm run check`, `npm run build`, `npm run test:browser`를 실행하고 Vercel 배포 상태를 별도로 확인하세요. 브라우저 검사는 실행 중인 앱(`TEST_BASE_URL`, 기본값 `http://localhost:3000`)과 Chromium이 필요합니다. 실제 모바일 브라우저와 외부 HTTPS 접속, 오류 복구도 확인해야 합니다.

## 부록: 직접 CLI 배포를 선택할 때만

권장 Git 연동에는 아래 세 값이 필요하지 않습니다. 별도 CLI 또는 CI 자동화를 직접 구성할 때 필요한 경우에만 사용하세요.

- `VERCEL_TOKEN`: Vercel 계정의 토큰 설정에서 필요한 범위의 토큰을 생성합니다. 생성 시 제공되는 값은 안전한 비밀 저장소에 직접 입력하고 채팅이나 로그에 출력하지 않습니다.
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: 로컬에서 Vercel CLI에 로그인한 뒤 프로젝트 디렉터리에서 `vercel link`로 대상 프로젝트를 연결합니다. 생성된 `.vercel/project.json`의 `orgId`와 `projectId`가 각각 해당 값입니다. 이 로컬 설정 파일을 커밋하지 마세요.

[Vercel Git 연동](https://vercel.com/docs/git), [Deployment Protection](https://vercel.com/docs/deployment-protection), [Vercel CLI](https://vercel.com/docs/cli), [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi)와 [영문 배포 문서](deployment.md)를 참고하세요.
