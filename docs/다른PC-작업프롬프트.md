# 다른 PC에서 영상을 끝까지 만드는 작업 프롬프트

아래 코드 블록 전체를 다른 PC의 Claude Code 세션에 그대로 붙여넣습니다. 그 PC가 자료 확인, 설치, 내레이션 생성, 합성, 검수, 출력까지 스스로 합니다.
미리 해 둘 것 (사람이 할 일): ① 그 PC에 Claude Code 설치와 로그인, ② `~/stillvalid-video/` 폴더에 녹화 자료 두기(아래 "자료 위치" 참고), ③ 인터넷 연결.

```text
너는 StillValid 해커톤 시연영상을 이 컴퓨터에서 끝까지 만든다. 사람에게 되묻지 말고 아래 규칙으로 직접 판단해 진행해.
막히면 대체안으로 내려가고, 대체안도 안 되면 그때만 멈추고 정확한 사유를 보고해.

# 0. 시간
- 제출 마감: 2026-11-05 11:00 KST. 목표 업로드 완료 10:00~10:25.
- 시작하자마자 `date`로 현재 KST 시각을 확인하고 남은 시간을 기록해.
- 체크포인트(KST): 09:30 안전판 1080p60 완성 · 09:50 도입/엔딩 완성 또는 제목 카드로 대체 · 10:10 4K60 완성 또는 1080p60으로 확정 · 10:25 사람이 업로드할 수 있는 최종 파일 준비.
- 이미 체크포인트를 지난 상태로 시작하면, 지난 단계는 건너뛰고 가장 가까운 대체안부터 만들어. 항상 "지금 제출 가능한 파일"이 하나는 디스크에 있게 해.

# 1. 절대 규칙
1. 프로덕션 앱(https://stillvalid-beta.vercel.app)의 /api/extract, /api/checks 를 호출하지 마. 모델 호출 0회. 녹화는 이미 끝났다.
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
작업 폴더 ~/stillvalid-video/ 안에서 찾아:
- takes/take-2/capture.mp4 (1170x2532, 60fps, 약 173초), takes/take-2/take.json (단계별 시각, 정지 이미지 촬영 구간), takes/take-2/stills/ (2340x5064 PNG 10장)
- 없으면 handoff/ 의 stillvalid-handoff.zip(SHA-256 6e4e7455e03335da63c39ddfae820e28e982dab3efe88cf3e8c001c4bf1ed8a5)을 ~/stillvalid-video/ 에 풀어. HANDOFF.md 가 있으면 읽어.
  (stillvalid-frames.zip, SHA-256 30fd7df12bbb9dff871e3c8b4b1469f21bc106cff77a4d926ef14c8b664eff04 는 원본 프레임 6,725장이다. capture.mp4 가 멀쩡하면 풀 필요 없다.)
- 해시가 다르거나 capture.mp4 가 없거나 ffprobe 로 못 읽으면: 프레임 zip 에서 take.json 의 타임스탬프로 60fps 격자 재구성을 해(문서 19절 방법: 프레임마다 실제 타임스탬프를 가장 가까운 1/60초 칸에 놓고 빈 칸은 직전 프레임으로 채운 뒤 -framerate 60 으로 인코딩).
- 그래도 자료가 없으면 여기서 멈추고 "어떤 파일이 없는지"만 보고해. 새로 녹화하지 마(모델 호출 금지).
확인: `ffprobe`로 해상도·프레임율·길이, take.json 을 읽어 단계 이름과 시각, stills 파일 이름을 표로 정리해 ~/stillvalid-video/final/inventory.md 에 저장. 정지 이미지는 이미지 읽기 도구로 직접 열어 어떤 화면인지 확인해.

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
- 시간이 모자라면(09:50 체크포인트) 정지 제목 카드(도입 3초, 엔딩 6초)로 대체. 3D/지구본/위성 영상은 쓰지 마.
## 6-4. 자막
- ASS 파일 하나로: 내레이션 자막(하단, 최대 2줄, 글자 높이 약 96px), 정직성 주석(약 64px), 장면 제목/핵심 값. 문서 5절의 표를 그대로 구현하고 유지 시간을 지켜.
- 내레이션 자막 문구는 N01~N11 원문 그대로.
## 6-5. 소리
- 각 WAV 를 해당 SHOT 시작 시각에 adelay 로 놓고 합쳐. 전체 loudnorm 으로 -14 LUFS, 피크 -1 dBTP. 효과음/음악은 쓰지 않거나, 만든다면 직접 합성한 짧은 톤만(저작권 문제 없게).

# 7. 출력 단계 (이 순서로, 각 단계가 끝날 때마다 파일을 남겨)
A. 안전판 `final/safe_1080p60.mp4`: 1920x1080 60fps, SHOT 02~10 + 제목 카드, 자막, 내레이션. 09:30까지.
B. 완성본 `final/stillvalid_demo_4k60.mp4`: 3840x2160 60fps, H.264 High, yuv420p, BT.709(`-color_primaries bt709 -color_trc bt709 -colorspace bt709`), 약 60Mbps(`-b:v 60M -maxrate 70M -bufsize 120M`), AAC 48kHz 320kbps, `-movflags +faststart`. 입력의 JPEG 전체 범위 색은 먼저 scale 필터에서 `in_range=pc:out_range=tv` 로 변환.
   4K 인코딩이 10:10까지 끝나지 않거나 메모리/속도가 안 되면 `final/stillvalid_demo_1080p60.mp4` 로 확정(같은 파이프라인, 해상도만 낮춤).
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

## 자료 위치 (사람이 미리 확인)

- 녹화 자료는 공개 저장소에 없습니다. 원래 PC의 `~/stillvalid-video/handoff/` 폴더(zip 두 개와 `HANDOFF.md`)를 새 PC의 `~/stillvalid-video/`로 옮깁니다(USB, 클라우드 드라이브 등).
  - `stillvalid-handoff.zip` (436MB): 영상, 정지 이미지, 기록, 스크립트
  - `stillvalid-frames.zip` (2.1GB): 원본 프레임. 영상이 정상이면 없어도 됩니다
- 자료가 새 PC에 없으면 위 프롬프트는 "없는 파일"만 보고하고 멈춥니다. 새로 녹화하지 않습니다.
- TTS 키가 없어도 무료 음성(`edge-tts`)으로 진행하도록 되어 있습니다. 목소리 품질이 중요하면 키를 환경 변수로 미리 설정해 두세요.
