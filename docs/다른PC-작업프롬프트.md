# 다른 PC에서 영상을 끝까지 만드는 작업 프롬프트

아래 코드 블록 전체를 다른 PC의 Claude Code 세션에 그대로 붙여넣습니다. 그 PC가 자료 확인, 설치, 내레이션 생성, 합성, 검수, 출력까지 스스로 합니다.
미리 해 둘 것 (사람이 할 일): ① 그 PC에 Claude Code 설치와 로그인, ② `~/stillvalid-video/` 폴더에 녹화 자료 두기(아래 "자료 위치" 참고), ③ 인터넷 연결.

```text
너는 StillValid 해커톤 시연영상을 이 컴퓨터에서 끝까지 만든다. 사람에게 되묻지 말고 아래 규칙으로 직접 판단해 진행해.
막히면 대체안으로 내려가고, 대체안도 안 되면 그때만 멈추고 정확한 사유를 보고해.

# 0. 시간
(서브에이전트로 병렬 작업을 시키는 방법은 3-1절에 있다. 시작하자마자 4절까지 끝내고 3-1절대로 동시에 시작해.)
- 제출 마감: 2026-11-05 11:00 KST. 업로드는 사람이 하므로 최종 파일은 늦어도 10:40까지.
- 시작하자마자 `date`로 현재 KST 시각을 확인하고 남은 시간을 기록해.
- 체크포인트(KST): 09:15 Demo card 완성 · 09:40 성공 테이크 확보(없으면 3-2-5 대체안) · 10:00 안전판 1080p60 완성 · 10:15 도입/엔딩 완성 또는 제목 카드로 대체 · 10:30 4K60 완성 또는 1080p60으로 확정 · 10:40 사람이 업로드할 수 있는 최종 파일 준비. (녹화 자료가 있으면 예전 체크포인트 09:30/09:50/10:10/10:25 를 쓴다.)
- 이미 체크포인트를 지난 상태로 시작하면, 지난 단계는 건너뛰고 가장 가까운 대체안부터 만들어. 항상 "지금 제출 가능한 파일"이 하나는 디스크에 있게 해.

# 1. 절대 규칙
1. 프로덕션 앱(https://stillvalid-beta.vercel.app)의 /api/extract, /api/checks 는 3-2절의 녹화에서만, 그 한도 안에서만 호출한다(테이크당 /api/extract 최대 1회, /api/checks 최대 3회, 테이크 최대 3회). 그 밖의 모델 호출은 금지. 녹화 자료가 이미 있으면 호출 0회.
2. 영상 안의 앱 화면은 녹화 원본을 자르고 늘리고 겹치기만 한다. 앱 화면, 판정, 날짜, 인용 글자를 새로 그리거나 고치지 마.
   (예외: 도입/엔딩 모션그래픽과 자막은 새로 만든다.)
3. 화면과 자막에 쓰지 않는 표현: iPhone, always accurate, never miss, any notice, worldwide, "Photos aren't stored", 속도 보장.
4. 비밀 값(API 키, 쿠키, 세션 ID)을 파일·자막·커밋에 넣지 마. 영상에서 주소창의 결과 ID가 보이면 안 된다.
5. 큰 파일(영상, 프레임, 음성)은 저장소에 커밋하지 마. 작업 폴더는 ~/stillvalid-video/ (Windows는 %USERPROFILE%\stillvalid-video\).
6. 결과 삭제 버튼을 자동화로 누르지 마. 유튜브 등에 업로드하지 마. 최종 파일만 준비하고 사람이 올린다.
7. 실제로 확인한 것만 보고해. 만들지 못한 단계를 만든 것처럼 쓰지 마.

# 2. 먼저 읽을 것 (순서대로)
저장소가 없으면 `git clone https://github.com/ZOOGOM/stillvalid ~/stillvalid-video/repo` 후
`git fetch origin claude/compassionate-albattani-fwxaqv && git checkout claude/compassionate-albattani-fwxaqv`.
이미 있으면 fetch 후 같은 브랜치로 맞춰(작업 중인 변경이 있으면 건드리지 말고 별도 폴더에 새로 clone).
1. docs/시연영상-전체본.md  ← 이게 기준 문서다. 콘티(SHOT 01~11), 내레이션 N01~N11, 자막, 규격, 시간표, 검수 목록이 모두 있다.
2. docs/시나리오.md 의 19절(시험 캡처), 20절(본 녹화 결과), 23절(README 정합 규칙).
두 문서가 다르면 시연영상-전체본.md 를 따른다. 문서에 없는 판단은 "정직성 우선, 시간 안에 끝내기"로 결정해.

# 3. 자료 위치와 확인
이 컴퓨터에는 이전 녹화(takes/take-2 등)가 없다고 알려져 있다. ~/stillvalid-video/ 를 1분만 확인해서 takes/take-N/capture.mp4 와 take.json, stills/ 가 있으면 그것을 쓰고(ffprobe 로 1170x2532, 60fps 확인), 없으면 바로 3-2절로 가서 직접 녹화해. 자료 찾기에 3분 넘게 쓰지 마.
(handoff zip 이 있으면: stillvalid-handoff.zip SHA-256 6e4e7455e03335da63c39ddfae820e28e982dab3efe88cf3e8c001c4bf1ed8a5 을 확인하고 풀어. stillvalid-frames.zip SHA-256 30fd7df12bbb9dff871e3c8b4b1469f21bc106cff77a4d926ef14c8b664eff04 는 capture.mp4 가 멀쩡하면 풀 필요 없다.)
확인: `ffprobe`로 해상도·프레임율·길이, take.json 을 읽어 단계 이름과 시각, stills 파일 이름을 표로 정리해 ~/stillvalid-video/final/inventory.md 에 저장. 정지 이미지는 이미지 읽기 도구로 직접 열어 어떤 화면인지 확인해.

# 3-1. 병렬 작업: 서브에이전트 사용
Agent 도구(서브에이전트)를 쓸 수 있으면 아래 작업 꾸러미를 동시에 시켜 시간을 줄여. 쓸 수 없으면 같은 순서로 직접 해.
시작 전에 네가(메인) 먼저 4절 환경 준비와 3절 자료 확인을 끝내고, ~/stillvalid-video/final/ 아래에 폴더 규칙을 만들어 둬: audio/, cards/, intro/, outro/, segments/, subs/, qa/.

| 꾸러미 | 서브에이전트 | 입력 | 산출물(자기 폴더에만 쓴다) | 선행 조건 |
| --- | --- | --- | --- | --- |
| A | TTS | 문서의 N01~N11 원문, 5절 규칙 | audio/N01.wav ..., audio/durations.json | 없음 |
| B | 도입·엔딩 모션그래픽 | 문서 SHOT 01·11 콘티, 6-3절, 앱 아이콘, 3-2절의 Demo card PNG | intro/intro_4k60.mp4 (12초), outro/outro_4k60.mp4 (18초), 실패 시 제목 카드 PNG | Demo card PNG 완성 후. 앱 홈 화면은 드라이런 스크린샷으로 대신 |
| C | 앱 구간 합성 | 성공 테이크의 capture.mp4, take.json, 6-1절 | segments/shotXX.mp4 (SHOT 02~06, 08~10, 3840x2160 60fps, 무음) | 3-2절 녹화 완료. 그 전에는 모델 호출 없는 드라이런 영상으로 합성 스크립트만 만들어 둔다 |
| D | 결과 카드 연출 | 성공 테이크의 stills/ 정지 이미지, 6-2절 | cards/shot07.mp4 (44초, 무음), 잘라낸 카드 PNG | 3-2절 녹화 완료. 그 전에는 카드 연출 코드만 만들어 둔다 |
| E | 자막 | 문서 5절 표, N 대본 | subs/captions.ass (정직성 주석 포함) | audio/durations.json 이 있으면 반영, 없으면 콘티 시간 사용 |
| F | 독립 검수 | 완성 mp4, 문서 9절 | qa/review.md | 합성 끝난 뒤(8절 직전) |

- 메인(너)의 일: 0) 3-2절 녹화를 직접 맡는다(서브에이전트에 맡기지 마: 모델 호출 한도와 세션 삭제 금지 규칙 때문). Demo card PNG 가 나오면 곧바로 A·B·E 를 서브에이전트로 시작하고 녹화와 병행한다. C·D 는 성공 테이크가 나온 뒤 시작. 1) 꾸러미를 가능한 한 한 메시지에서 동시에 실행. 2) 산출물이 모이면 SHOT 순서대로 이어 붙이고(concat, 무손실 구간 단위), 자막 번인, 오디오 믹스(6-5절), 7절 출력 A→B 를 직접 수행. 3) 꾸러미 F 는 완성본을 처음 보는 눈으로 8절 검수를 하게 시키고, 그 결과로 고친다.
- 각 서브에이전트에게 줄 프롬프트에는 반드시 포함: ① 이 문서의 해당 SHOT 콘티와 규격(해상도 3840x2160, 60fps, BT.709 제한 범위), ② 1절의 절대 규칙(모델 호출 금지, 앱 글자 수정 금지, 금지 표현), ③ 입력과 산출물의 정확한 절대 경로, ④ 다른 꾸러미 폴더는 읽기만 하고 쓰지 않는다, ⑤ 끝나면 "만든 파일, 길이, 해상도, 못 한 것"만 5줄 이내로 보고, ⑥ 마감 체크포인트(0절)와 대체안.
- 동시 실행 한도: CPU 코어 수를 보고 4K 인코딩/렌더가 겹치지 않게 해. 코어 6개 미만이면 B(프레임 렌더)와 C·D(ffmpeg)를 동시에 돌리되 각자 `-threads` 를 나눠 쓰고, 메모리가 부족하면 B 를 먼저 끝낸 뒤 C·D 를 돌려.
- 서브에이전트가 실패하거나 시간 안에 못 끝내면 해당 꾸러미는 대체안(B는 제목 카드, D는 정지 카드 2장 크로스페이드)으로 네가 직접 마무리해. 한 꾸러미 때문에 전체를 기다리지 마.
- 서브에이전트의 결과를 믿고 넘어가지 말고, 합치기 전에 각 산출물을 ffprobe 로 해상도·프레임율·길이를 확인하고 프레임 한두 장을 직접 열어 봐.

# 3-2. 녹화 자료가 없을 때: 직접 녹화하기
이 컴퓨터에는 녹화 자료가 없다. 아래대로 Demo card 를 만들고 프로덕션에서 한 번 녹화한다. 결과 화면은 실제 프로덕션 앱의 실제 응답이어야 하며 조작하지 마.
목표 시각: 녹화 시작 전 준비 09:15까지, **성공 테이크 09:40까지**. 09:40까지 성공이 없으면 아래 "녹화 실패 대체안"으로 간다.

## 3-2-1. Demo card 만들기 (모델 호출 없음)
- 먼저 공식 공지 페이지를 브라우저(Playwright)로 열어 본문을 직접 확인해: https://www.seoul.go.kr/news/news_notice.do?nttNo=454731 (이 컴퓨터는 접속 가능할 수 있다. 막히면 3-2 "대체안"으로).
- 카드에 넣을 줄은 공식 페이지 글자를 그대로 복사한다(띄어쓰기, 괄호, 쉼표까지 같아야 앱이 같은 공고로 인정한다). 지금까지 알려진 줄은 아래이고, 페이지와 다르면 페이지를 따라:
  서울특별시 공고 제2026-993호
  「2026년 서울영커리언스 인턴십(여름,가을학기)」 참여기업 모집 공고
  서울특별시
  1. 접수기간 : 2026. 3. 23.(월) 10:00 ~ 3. 31.(화) 18:00
  2. 모집규모 : 50개사 내외 기업
- 바꾸는 값은 접수기간의 끝 한 곳뿐이다. 공식 페이지의 값은 `~ 4. 3.(금) 15:00` 이고, 카드에는 `~ 3. 31.(화) 18:00` 을 쓴다. 공식 페이지에 4. 3.(금) 15:00 이 더 이상 없으면 그 사실을 기록하고 대체안으로 가.
- 항목은 위 5줄만. 항목을 늘리면 결과가 review 로 바뀐 적이 있다. 카드에 URL 을 넣지 마.
- 모서리에 "Demo card · date altered for this demo" 표시. 서울시 로고/실제 디자인 흉내 금지. HTML → PNG 1080x1350, 실제 카메라 사진처럼 꾸미지 마. 저장: ~/stillvalid-video/final/demo-card.png

## 3-2-2. 녹화 도구 만들기 (Playwright + CDP, 모델 호출 없는 드라이런 먼저)
앱의 현재 영어 화면 문구는 저장소 src/lib/ui-base.ts 의 `en` 객체와 src/components/app.tsx 에 있다(origin/main 기준; 필요하면 `git fetch origin main` 후 `git show origin/main:...`). 선택자는 그 문구로 잡아.
- 브라우저: Chromium/Chrome/Edge 헤드리스, 실행 옵션 `--force-device-scale-factor=3 --window-size=600,1000`, 컨텍스트 뷰포트 390x844, 새 프로필(쿠키 없음). 안정성이 우선이면 headless 를 유지.
- 화면 캡처: CDP `Page.startScreencast` (jpeg, quality 95, everyNthFrame 1). 프레임마다 `Page.screencastFrameAck` 를 보내고, 프레임 파일과 metadata.timestamp 를 저장.
- 60fps 고정 영상 재구성: 프레임마다 실제 타임스탬프를 가장 가까운 1/60초 칸에 놓고 빈 칸은 직전 프레임으로 채운 뒤 `ffmpeg -framerate 60 -i %06d.jpg -c:v libx264 -crf 12 -preset ultrafast -pix_fmt yuv444p`. (concat 목록에 간격을 적어 `-r 60` 으로 변환하는 방법은 복제/누락이 생기니 쓰지 마.) 프레임 간격 통계(복제 칸 수, 최대 연속, 유실 수)를 take.json 에 기록.
- 정지 이미지: 필요한 순간에 `Emulation.setDeviceMetricsOverride` 로 deviceScaleFactor 6(2340x5064) 로 바꿔 `Page.captureScreenshot` 후 원래 배율로 복원. 이때 스트림이 약 1.0~1.3초 멈추므로 그 시각 구간을 take.json 의 stills 에 기록(합성에서 잘라낸다).
- 드라이런(모델 호출 0): 앱 홈에서 10초 스크롤을 캡처해 프레임 크기가 1170x2532 인지, 10초에 약 590~600프레임인지 확인. 크기가 다르면 옵션을 조정하고, 끝내 안 되면 배율 2(780x1688)로 낮추되 보고서에 적고 확대는 1.0배로 제한.
- 드라이런에서 모델 호출 없이 확인할 수 있는 선택자를 전부 확인해: Settings, 언어/지역 드롭다운, 사진 업로드(파일 선택), 자르기 적용 버튼, 합성 예제(When it's a different edition, When a deadline changes), 언어 전환, Privacy 대화상자.
- 안전장치(스크립트 안에 코드로): 모든 요청을 기록하고, DELETE 요청과 허용 횟수를 넘는 POST 는 route 로 abort 한다. /api/extract 는 테이크당 1회, /api/checks 는 테이크당 3회까지. 결과 삭제 버튼의 확인은 절대 누르지 마(확인창까지만).

## 3-2-3. 한 테이크의 동작 (순서대로, 사람이 하는 속도로 천천히)
R0 홈 접속, `/api/status` 응답(deploymentSha, models)을 기록, 홈 정지 이미지.
R1 Settings → Display language English, Region of use United States → 닫기.
R2 Upload a photo → Choose photo(Demo card) → 자르기 화면에서 범위 그대로 적용.
R3 "Read this notice" → 검토 화면("Is this the right notice?")이 뜰 때까지 대기. 시작~끝 시간 기록(읽기 시간). 검토 화면 정지 이미지. 읽은 제목/기관/연도/국가를 기록.
   (읽기 직후 앱이 백그라운드로 확인을 미리 시작할 수 있다. 그건 앱의 정상 동작이고 /api/checks 한도 안에서만 허용한다. 검토 화면의 "already started in the background" 안내가 보이면 그대로 둔다.)
R4 "Country read from the notice" 가 Not selected 면 Korea 를 선택 → "Your region of use differs…" 배너 노출(정지 이미지) → "Use the notice country".
R5 "Official notice URL" 칸에 https://www.seoul.go.kr/news/news_notice.do?nttNo=454731 입력 → "Check official sources". 결과 화면까지 대기(최대 150초). 버튼~결과 시간 기록.
R6 결과 상단에서 잠시 멈춤(정지 이미지) → 변경 항목까지 천천히 스크롤(정지) → "See the supporting text" 펼치기(양쪽 인용 정지) → 출처 영역(정지) → "Processing time" 패널이 있으면 정지.
R7 "Your next step" 까지 스크롤.
R9 Display language 를 한국어 → العربية → English 순서로 전환(아랍어 결과 정지 이미지). 이 동안 GET 이외의 요청이 0건인지 확인해 기록.
R10 "Copy summary" 클릭(클립보드 길이 기록) → "Delete this result" 클릭 → 삭제 확인창이 뜨면 정지 이미지 → 확인하지 말고 닫기.
R8 (맨 마지막) 홈 → "When it's a different edition" 예제 → 결과(합성 예제 배너가 보이게) 정지 이미지.
(6-1절과 문서의 S0~S11 이름은 여기의 R0~R10 과 같은 단계다: S3=R3, S4=R4, S5=R5, S6=R6, S7=R7, S8=R8(합성 예제), S9=R9(언어 전환), S10=R10(복사·삭제 확인창).)
저장: ~/stillvalid-video/takes/take-N/ 에 capture.mp4, stills/, take.json(단계별 시각, 읽기/확인 시간, 요청 로그, 프레임 통계, status 응답, 결과 요약).

## 3-2-4. 성공 판정과 재시도
- 성공 = 결과 화면에 "We found a few changes", Application deadline 항목이 Changed, 인용 확인 문구(예: Quotes confirmed: 1 of 1) 가 보이고 경고(identity/evidence/partial) 가 없음. 결과 화면을 정지 이미지로 직접 열어 눈으로 확인해.
- 실패(예: "This needs another look")면 그 테이크를 버리지 말고 take-N 에 보존하고(설명란의 "X회 중 Y회 확인" 통계에 쓴다) 새 브라우저 프로필로 다시. 최대 3테이크, POST 사이 10초 이상 간격. 한 테이크는 약 3~4분이다.
- 읽기에서 제목/기관/연도가 카드와 다르게 읽히면(오독) 카드 글자를 고치지 말고 그대로 한 번 더 시도한다.
- 모델 호출은 테이크 안의 실제 요청 기록으로 센다(extract 1 + checks 1~3). 총 호출 수를 보고에 적어.

## 3-2-5. 녹화 실패 대체안 (09:40까지 성공 테이크가 없거나, 공식 페이지가 막혔을 때)
- 모델 호출을 더 하지 마. 가장 나은 테이크의 R0~R5 와 마지막 R8, 그리고 앱의 합성 예제 "When a deadline changes"(모델 호출 없음, 합성 예제 배너 필수 표시)를 결과 장면으로 쓴다.
- 이 경우 N07 을 아래로 바꾸고, 정직성 자막을 "Synthetic example · No live lookup" 으로 하며, Demo card 날짜 자막과 "registered Seoul government domain" 주장은 빼:
  "When a deadline changes, StillValid shows the saved value and the new value side by side, each with the exact quote. This one is a built-in synthetic example, with no live lookup."
- 유튜브 설명란에도 "the live comparison did not complete in our final recording" 를 사실대로 적어.
- 읽기 이후 화면을 담은 테이크가 하나도 없으면(extract 도 실패) 앱 홈·설정·합성 예제 두 개(When a deadline changes, When it's a different edition)·언어 전환(합성 예제 결과 화면에서)·요약 복사로만 약 1분 30초 영상을 만든다. 이 경우 반드시 실제로 보여준 것만 내레이션과 자막에 쓰고, 보고서 맨 위에 "실제 공고 비교는 영상에 없음"이라고 적어.

## 3-2-6. 녹화값으로 바꿔야 하는 문서 값
문서의 `f60f6fe`, `Reading: 22 s`, `Check: 61 s`, "3 checks 중 2 confirmed" 는 이전 녹화 값이다. 이번 녹화의 `/api/status` 의 deploymentSha 앞 7자리, 실측 읽기/확인 시간, 실제 성공/전체 테이크 수로 모든 자막, 설명란(description.txt), 엔딩 문구를 바꿔라. 모델 이름은 status 의 models 값을 그대로(현재 muse-spark-1.3-contributor 일 것) 쓰고 엔딩 구조도의 모델 표기는 "Muse Spark" 로 둔다.

# 4. 환경 준비 (관리자 권한 없이)
- `ffmpeg`, `ffprobe` (9.x 권장, libx264 필수), Node.js 20 이상, Python 3. 없으면 설치: macOS brew, Windows `winget install Gyan.FFmpeg` / `OpenJS.NodeJS.LTS` / Python.Python.3, Linux apt.
- 모션그래픽/카드 렌더용: Playwright + Chromium (`npm i playwright` 후 `npx playwright install chromium`; 이미 있는 Chrome/Edge가 있으면 그걸 써도 된다).
- 한글 글꼴이 필요한 새 글자는 없다(영어 자막만). 앱 화면의 한글은 녹화 원본에 이미 들어 있다.
- 설치가 막히면 가능한 도구만으로 진행하고, 못 쓰는 도구는 보고서에 적어.

# 5. 내레이션(TTS)
문서의 N01~N11 (N06은 침묵)을 장면별 WAV로 만든다. 48kHz, 모노 또는 스테레오, 앞뒤 무음 0.2초.
우선순위:
1) 환경 변수에 사용자의 TTS 키가 이미 있으면(예: OPENAI_API_KEY, ELEVENLABS_API_KEY, AZURE_SPEECH_KEY) 그것으로 차분한 영어 중립 음성 1개. 키를 출력하거나 저장하지 마.
2) 없으면 `pip install edge-tts` 로 en-US-AriaNeural (또는 en-US-GuyNeural) 사용: `edge-tts --voice en-US-AriaNeural --rate=-3% --text "..." --write-media nXX.mp3` 후 ffmpeg 로 48kHz wav 변환.
3) 인터넷이 막히면 OS 음성: macOS `say -v Samantha`, Windows PowerShell System.Speech, Linux `espeak-ng`. 로봇 같으면 보고서에 적어.
공통: 한 목소리만 쓰고, 실존 인물 목소리를 복제하지 마. 각 WAV 길이를 ffprobe 로 재서 콘티의 구간 길이를 넘으면 `-rate`를 올려 맞추되 +12%를 넘기지 말고, 그래도 넘으면 문장을 줄이지 말고 보고해(내용 변경 금지). 결과는 ~/stillvalid-video/final/audio/ 에 N01.wav ... 와 durations.json.

# 6. 합성 (모든 클립은 3840x2160, 60fps 고정)
작업 폴더 ~/stillvalid-video/final/ 아래에 `build.mjs` 또는 `build.sh` 로 재현 가능하게 만들어 (여러 번 다시 돌릴 수 있게).
## 6-1. 앱 구간 (SHOT 02, 03, 04, 05, 06, 08, 09, 10)
- 녹화 순서는 영상 순서와 다르다: 녹화는 S0~S7 → S9(언어 전환) → S10(복사·삭제 확인창) → S8(합성 예제) 순이다. 영상은 SHOT 08(합성 예제) → 09(언어 전환) → 10(복사·삭제)이므로 take.json 의 시각으로 구간을 잘라 순서를 바꿔 이어 붙여.
- 정지 이미지 촬영 때 스트림이 1.0~1.3초 멈춘 구간(take.json 의 stills)은 잘라내.
- 배치(콘티 기준): 배경 = 같은 클립을 3840x2160 으로 확대(cover)해 boxblur 와 어둡게(brightness -0.3); 전경 = 같은 클립을 높이 2160 으로(scale=-2:2160, 폭 약 998) x=192 위치에 overlay. 오른쪽 2/3(x 1280~3648)는 자막/핵심 값 영역.
- 읽기 대기(SHOT 03)와 확인 대기(SHOT 06)는 setpts 로 배속해 슬롯에 맞추고, 프레임 혼합(minterpolate/framerate 필터)은 쓰지 마. 배속 구간 자막은 문서대로 "Reading: 22 s (sped up)", "Check: 61 s (sped up)" (take.json 실측값이 다르면 실측값으로).
- 확대는 영상 위 1.15배까지만. SHOT 04의 불일치 배너 강조는 정지 이미지를 쓰거나 1.15배 이내.
## 6-2. 결과 구간 (SHOT 07, 44초)
- 1:20~1:24 는 녹화 결과 화면 그대로. 이어서 정지 이미지(2340x5064)에서 5개 카드를 잘라내(판정 / 변경 항목 / Your notice 인용 / Retrieved source 인용 / 출처·확인 시각). 잘라낸 PNG 에 둥근 모서리와 그림자만 더하고 글자는 건드리지 마.
- 카드가 순서대로 떠오르게 ffmpeg overlay (x/y/alpha 시간식) 또는 HTML+Playwright 프레임 렌더로 연출. 각 카드 최소 2.5초, ④번 인용 카드는 3초 이상 크게.
- 마지막 구간에서 카드가 결과 화면으로 돌아가며 다음 장면으로 이어져.
## 6-3. 도입(SHOT 01, 12초)과 엔딩(SHOT 11, 18초) 모션그래픽
- HTML 한 장에서 시간 t 를 받아 그리는 순수 함수로 만들고 (예: window.__render(t)), Playwright 로 1920x1080 뷰포트, deviceScaleFactor 2 로 프레임을 PNG 로 저장 → ffmpeg 로 60fps 영상화. 도입 720프레임, 엔딩 1080프레임.
- 디자인: 배경 #faf9f5, 글자 #273e33, 포인트 #285c48, 보조 #a7683f. 제목 serif, 본문 sans. 앱 아이콘은 저장소의 public/brand/stillvalid-icon-original.png 또는 public/icons/stillvalid-512.png.
- 도입: 제목 "Saved a notice. Still the same?" → 서울을 단순화한 지도 일러스트(실제 지도 데이터/브랜드/로고 금지) 위에 Demo card 사진(takes/ 또는 rehearsal/plan-a-2/demo-card.png) → 휴대폰 프레임으로 들어가 앱 홈 첫 프레임(S0 정지 이미지)으로 이어짐.
- 엔딩: 앱 아이콘 → 구조도 5줄(Read / Find the page / Compare / Verify / Result, 문구는 문서 SHOT 11 그대로) → stillvalid-beta.vercel.app, 하단 작은 글씨 2줄.
- 시간이 모자라면(0절의 도입/엔딩 체크포인트) 정지 제목 카드(도입 3초, 엔딩 6초)로 대체. 3D/지구본/위성 영상은 쓰지 마.
## 6-4. 자막
- ASS 파일 하나로: 내레이션 자막(하단, 최대 2줄, 글자 높이 약 96px), 정직성 주석(약 64px), 장면 제목/핵심 값. 문서 5절의 표를 그대로 구현하고 유지 시간을 지켜.
- 내레이션 자막 문구는 N01~N11 원문 그대로.
## 6-5. 소리
- 각 WAV 를 해당 SHOT 시작 시각에 adelay 로 놓고 합쳐. 전체 loudnorm 으로 -14 LUFS, 피크 -1 dBTP. 효과음/음악은 쓰지 않거나, 만든다면 직접 합성한 짧은 톤만(저작권 문제 없게).

# 7. 출력 단계 (이 순서로, 각 단계가 끝날 때마다 파일을 남겨)
A. 안전판 `final/safe_1080p60.mp4`: 1920x1080 60fps, SHOT 02~10 + 제목 카드, 자막, 내레이션. 0절의 안전판 체크포인트까지.
B. 완성본 `final/stillvalid_demo_4k60.mp4`: 3840x2160 60fps, H.264 High, yuv420p, BT.709(`-color_primaries bt709 -color_trc bt709 -colorspace bt709`), 약 60Mbps(`-b:v 60M -maxrate 70M -bufsize 120M`), AAC 48kHz 320kbps, `-movflags +faststart`. 입력의 JPEG 전체 범위 색은 먼저 scale 필터에서 `in_range=pc:out_range=tv` 로 변환.
   4K 인코딩이 0절의 4K 체크포인트까지 끝나지 않거나 메모리/속도가 안 되면 `final/stillvalid_demo_1080p60.mp4` 로 확정(같은 파이프라인, 해상도만 낮춤).
C. 마스터(여유가 있을 때만): ProRes 422 HQ.

# 8. 검수 (직접 확인하고 결과를 기록)
1. `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,duration` 로 해상도, 60/1 고정, 전체 길이 3:00 이하, 오디오 48kHz.
2. SHOT 경계마다 프레임 한 장씩 뽑아 contact sheet 를 만들고 이미지로 직접 봐: 앱 글자가 선명한지, 자막이 잘리거나 앱 화면을 가리지 않는지, 주소창의 결과 ID/쿠키가 안 보이는지, 합성 예제 배너가 보이는지.
3. 문서 9절 체크리스트 전 항목을 하나씩 확인해 final/qa.md 에 [x]/[ ] 와 근거로 기록. 만족하지 못한 항목은 고친 뒤 다시 출력하고, 시간이 없으면 [ ] 로 남기고 보고해.
4. 영상 속 날짜(3. 31. → 4. 3.)와 한국어 인용이 녹화 결과 화면과 같은지 정지 이미지와 비교.
5. 소리가 끊기거나 겹치지 않는지 구간별로 확인(음량 그래프나 ffmpeg ebur128 로 -14 LUFS 근처인지).

# 9. 마무리
- final/ 폴더에 둘 것: 최종 mp4(들), safe_1080p60.mp4, audio/, 사용한 ASS, build 스크립트, qa.md, inventory.md, description.txt(문서 10-1절 유튜브 설명란 그대로).
- 작은 스크립트만 공개해도 되는 내용이면 저장소 scripts/video/ 에 모아 커밋하고 현재 브랜치(claude/compassionate-albattani-fwxaqv)에만 push 해(키/쿠키/세션 없음 확인). push 권한이 없으면 건너뛰어.
- 마지막에 한국어로 짧게 보고: ① 어떤 파일을 사람이 올리면 되는지(전체 경로와 해상도, 길이, 크기) ② 체크포인트별 달성 여부와 실제 시각 ③ 대체안으로 내려간 부분과 이유 ④ 검수에서 못 지킨 항목 ⑤ 사람이 해야 할 일(업로드, 제출 폼 입력, 테이크 세션 결과 삭제).
- 보고에는 성공을 부풀리지 마. 4K가 안 됐으면 1080p라고, 도입/엔딩이 제목 카드면 제목 카드라고 써.
```

---

## 자료 위치 (자료가 있을 때만 해당)

- 녹화 자료는 공개 저장소에 없습니다. 원래 PC의 `~/stillvalid-video/handoff/` 폴더(zip 두 개와 `HANDOFF.md`)를 새 PC의 `~/stillvalid-video/`로 옮깁니다(USB, 클라우드 드라이브 등).
  - `stillvalid-handoff.zip` (436MB): 영상, 정지 이미지, 기록, 스크립트
  - `stillvalid-frames.zip` (2.1GB): 원본 프레임. 영상이 정상이면 없어도 됩니다
- 자료가 새 PC에 없으면 프롬프트의 3-2절대로 Demo card 를 만들고 프로덕션에서 직접 녹화합니다(모델 호출 테이크당 최대 4회, 최대 3테이크).
- 녹화 시 사람이 할 일: 끝난 뒤 앱의 Privacy 에서 "Delete all results in this session"을 직접 누르거나, 24시간 만료를 기다립니다(자동화는 삭제하지 않습니다).
- TTS 키가 없어도 무료 음성(`edge-tts`)으로 진행하도록 되어 있습니다. 목소리 품질이 중요하면 키를 환경 변수로 미리 설정해 두세요.
