# Vercel Git 자동 배포와 검토 설정

현재 Vercel 계정과 프로젝트가 연결되지 않았고 실제 배포 URL도 없습니다. GitHub Actions 용량이 초과되어 실행되지 않는다는 사용자 보고가 있으며, CI 상태는 별도로 확인하지 못했습니다. 아래 연결을 마치면 Vercel이 Git 변경을 직접 빌드·배포하므로 GitHub Actions 할당량에 의존하지 않습니다. Vercel도 자체 요금제와 한도를 적용합니다.

현재 `main`에는 설정 문서만 있고 실제 앱은 `feat/stillvalid-webapp`에 있습니다. 기존 운영 서비스가 없으므로, 먼저 새 Vercel 프로젝트를 검토용으로 만들고 이 앱 브랜치를 프로젝트의 운영 브랜치로 지정하세요.

## 1. 기본 화면을 배포하고 검토하기

1. Vercel에 로그인해 새 프로젝트를 만들고 GitHub의 `ZOOGOM/stillvalid` 저장소를 Import합니다. 필요한 GitHub 저장소 접근을 승인하고 Next.js 프로젝트로 설정합니다. 프로젝트 루트는 저장소 루트이고 Node.js는 24입니다.
2. 프로젝트의 **Settings → Git**에서 **Production Branch**를 `feat/stillvalid-webapp`으로 설정합니다. 이 설정은 검토용 프로젝트에만 적용합니다. 앱이 `main`에 합쳐진 뒤에는 `main`으로 다시 변경합니다.
3. 처음 Import할 때 Vercel이 기존 기본 브랜치인 `main`을 먼저 빌드하여 실패할 수 있습니다. 브랜치 설정 후 Vercel의 배포 목록에서 앱 브랜치의 배포를 확인하고 필요하면 해당 브랜치를 Redeploy하거나 새 커밋을 푸시하세요. 배포 상세에서 브랜치와 커밋 SHA가 앱 코드와 일치하는지 확인합니다.
4. 배포가 완료되면 Vercel이 제공한 HTTPS 주소를 확인합니다. 이 주소의 정확한 origin을 해당 프로젝트의 운영 환경 변수 `APP_URL`로 설정하고 다시 배포하세요. 예를 들어 주소가 `https://example.com/path`이면 origin은 `https://example.com`입니다. 독립적인 미리보기 주소에서는 `APP_URL`을 비워 두거나 그 주소의 정확한 origin을 사용합니다.
5. Claude가 URL을 열 수 있도록 해당 배포의 **Deployment Protection** 설정을 확인하고 외부 접근을 허용합니다. 프로젝트 설정과 요금제에 따라 가능한 옵션이 다를 수 있습니다. 공개 접근을 허용하면 링크를 가진 다른 사람도 볼 수 있습니다. 로그인하지 않은 별도 브라우저에서 URL이 열리는지 확인한 뒤 검토에 사용하세요. 비밀번호나 우회 토큰을 채팅이나 문서에 넣지 마세요.

이 단계에서는 `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`를 GitHub에 등록할 필요가 없습니다. 기본 UI, 위치 선택 기능과 명시된 합성 예시는 Meta·Redis 비밀값 없이 검토할 수 있습니다. GPS는 HTTPS 환경과 사용자의 위치 권한이 필요합니다.

## 2. 실제 공고 확인을 사용하기

Vercel 프로젝트에서 `META_API_KEY`와 Upstash Redis의 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 해당 배포 환경의 서버 환경 변수로 직접 등록하고 다시 배포합니다. Redis 값은 둘 다 필요합니다. Meta 또는 공유 저장소 설정이 없으면 실제 공고 확인은 차단됩니다. 키나 토큰 값을 채팅, 문서, 저장소, 로그에 넣지 마세요.

실제 공개 공고로 추출·공식 출처 조회·비교·인용문을 검토하고, 별도 세션 간 격리와 삭제·만료도 확인하세요. Meta, Vercel, Upstash의 요금과 한도를 각각 확인해야 합니다. 앱의 호출 횟수 제한은 금액 기준 결제 차단이 아닙니다.

## 이후 변경과 검증

연결된 저장소의 브랜치에 푸시하면 Vercel Git 연동이 해당 변경의 배포를 시작합니다. GitHub Actions 성공 여부가 배포를 보장하거나 차단하지 않으므로 푸시 전 로컬에서 `npm run check`, `npm run build`, `npm run test:browser`를 실행하고 Vercel 배포 상태를 별도로 확인하세요. 브라우저 검사는 실행 중인 앱(`TEST_BASE_URL`, 기본값 `http://localhost:3000`)과 Chromium이 필요합니다. 실제 모바일 브라우저와 외부 HTTPS 접속, 오류 복구도 확인해야 합니다.

## 부록: 직접 CLI 배포를 선택할 때만

권장 Git 연동에는 아래 세 값이 필요하지 않습니다. 별도 CLI 또는 CI 자동화를 직접 구성할 때 필요한 경우에만 사용하세요.

- `VERCEL_TOKEN`: Vercel 계정의 토큰 설정에서 필요한 범위의 토큰을 생성합니다. 생성 시 제공되는 값은 안전한 비밀 저장소에 직접 입력하고 채팅이나 로그에 출력하지 않습니다.
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: 로컬에서 Vercel CLI에 로그인한 뒤 프로젝트 디렉터리에서 `vercel link`로 대상 프로젝트를 연결합니다. 생성된 `.vercel/project.json`의 `orgId`와 `projectId`가 각각 해당 값입니다. 이 로컬 설정 파일을 커밋하지 마세요.

[Vercel Git 연동](https://vercel.com/docs/git), [Deployment Protection](https://vercel.com/docs/deployment-protection), [Vercel CLI](https://vercel.com/docs/cli), [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi)와 [영문 배포 문서](deployment.md)를 참고하세요.
