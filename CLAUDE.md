# KIGLE Excavation — 회사·팀 소개 페이지

"각기 다른 결을 품은 하나의 원석이, 세계로 나아간다."
guillaumecolombel.fr의 연출 구조(창 쌓기 · 렌더 패스 · 씬 전환 · 섹션별 재질 변화 · 가상 스크롤)를 참고해 Three.js로 처음부터 구현. 레퍼런스의 코드·이미지·문구는 쓰지 않음.

> 이 파일은 공개 저장소에 올라감 → 이메일·계정 ID·API 키 등 개인 정보는 적지 않기

---

## 0. 다른 컴퓨터에서 이어서 하기 (가장 먼저 읽기)

**가져오는 법 (추천: GitHub)** — 저장소가 공개라 키 없이 받을 수 있음
```bash
git clone https://github.com/kimys3478/kg-deploy1.git AI_Week1
```
그다음 Claude 데스크톱 앱 Code 탭 → 새 세션 → 폴더로 `AI_Week1` 선택 → "KIGLE 페이지 이어서 하자"

**GitHub에 없는 것 (컴퓨터마다 따로 준비)**
| 항목 | 필요할 때 | 준비 방법 |
|---|---|---|
| Node.js(LTS) · Python | 미리보기, 스크립트 실행 | winget으로 설치 (Claude에게 "설치해줘") |
| `.env` (OpenAI 키, `OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst`) | 이미지 새로 생성할 때만 | 루트에 직접 만들기. 절대 커밋하지 않기 |
| GitHub에 올리기(push) 권한 | 수정 후 올릴 때 | 그 컴퓨터용 배포 키를 새로 만들어 저장소 Settings → Deploy keys에 추가(Allow write access 체크) |
| Wrangler 로그인 | Cloudflare에 직접 배포할 때만 | `npx wrangler login` (자동 배포 연결 후에는 불필요) |
| `my-first-worker/` | Hello World 연습 프로젝트 | GitHub에 없음. 바탕화면 백업 zip에만 있음 |
| `_backup/` | 예전 백업 zip | 원래 노트북에만 있음 |

**원래 노트북 기준 위치**: `C:\Users\kimys\Projects\AI_Week1` (2026-10-06 OneDrive에서 이전. OneDrive 쪽 `문서\AI_Week1`은 예전 사본이라 사용하지 않음)
**전체 백업(2026-10-06)**: 원래 노트북 바탕화면 `AI_Week1-백업-2026-10-06.zip` (node_modules·_backup·.env 제외, 두 프로젝트의 git 기록 포함)

---

## 1. 공개 주소 · 배포

| 주소 | 용도 | 갱신 |
|---|---|---|
| https://kimys3478.github.io/kg-deploy1/ | GitHub Pages. 링크 공유용 (og:url이 이 주소) | main 푸시 시 자동 (1~2분) |
| https://kigle-excavation.kimys3478.workers.dev | Cloudflare Workers (정적 자산) | main 푸시 시 자동 — Workers Builds 연결 후 (아래 참고) |
| https://github.com/kimys3478/kg-deploy1 | 저장소 (공개, main) | — |
| claude.ai 비공개 아티팩트 `6zvKvihgQqzX7HdfZtt2Fd` | 본인 계정 열람용 | 수동 재게시 필요 (2026-10-06 버전 2가 최신) |

**Cloudflare 배포 구조**
- `wrangler.jsonc`: name `kigle-excavation`, assets directory `./dist`
- `scripts/build-dist.mjs`: 사이트 파일만 **허용 목록**으로 `dist/`에 복사 (.env 등은 절대 포함 안 됨)
- Workers Builds 설정값: branch `main` · root `/` · build `node scripts/build-dist.mjs` · deploy `npx wrangler deploy`
- **확인 필요(2026-10-06)**: 사용자가 대시보드에서 Builds → Connect(GitHub)까지 마쳤는지. 마쳤으면 작은 변경을 푸시해 자동 배포 검증
- 직접 배포: `node scripts/build-dist.mjs` → `my-first-worker` 폴더에서 `npx wrangler deploy --config ../wrangler.jsonc` (그 폴더에 wrangler가 설치돼 있음)

**GitHub 올리기 규칙**
- 원래 노트북: 배포 키 `~/.ssh/kg-deploy1` (repo의 core.sshCommand에 설정됨)
- 커밋 메시지는 `.git/COMMIT_MSG_TMP` 파일로 넘기기 (PowerShell 여러 줄 인자 문제)
- 올리지 않는 것: `.env`, `_backup/`, `.claude/`, `dist/`, `.wrangler/`, `my-first-worker/`

**링크 미리보기**
- `og-image.jpg`(1200×630, 왼쪽 제목·오른쪽 원석) = 대표, `og-image-square.jpg`(1200×1200) = 두 번째 og:image
- 이미지 주소에 `?v=4` — 바꾸면 숫자를 올려 메신저 캐시 무효화. 카카오는 공유 디버거로 캐시 초기화
- 다시 만들기: 미리보기 서버 켠 상태에서 `node scripts/build-share-assets.mjs` (배경 `assets/og-bg.png`·`og-bg-center.png`, 아이콘 `assets/favicon-src.png`는 이미지 모델 생성)
- 파비콘: `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png`

---

## 2. 스토리 (2026-10-03 확정)
- **원석 하나(SPECIMEN KG-0001), 결 여덟 개.** 원석이 여러 개 모이는 이야기가 아님
- 섹션 01~08은 같은 돌 하나의 서로 다른 결(회사 → IP → 팀 → 파트 → 협업 → 미래)을 차례로 읽는 구조. 돌은 하나, 재질만 바뀜
- 문구를 새로 쓸 때도 "돌들", "모여서 하나로" 같은 복수 원석 표현은 피하기
- 층 구조(핵 → 표면): 01 CORE · 02 BEDROCK · 03 NEBULA · 04~06 VEIN I~III · 07 BOUNDARY · 08 SURFACE
- "돌"은 S01(핵)과 S08(완성된 돌)에만, S04~S06은 "결/물결/빛깔" 등 결 단위 표현
- 광물 이름(Solare 등)은 실제 광물이 아닌 조어 — 의도된 설정
- 피날레: 좌표 → COORDINATES: EVERYWHERE ("한 지점에서 발굴된 원석이 이제 어디서든 발견된다"), 그 아래 "What's next?"

## 3. 파일
- `content.js` — 모든 문구·색 (좌표, 인트로/피날레 문장, 렌더 패스 6개, 섹션 8개). 글 수정은 여기서. `\n`은 줄바꿈
  - PASSES: `key`는 렌더 방식(바꾸지 않기), `label`은 창 꼬리표 표시 이름 (beauty → `complete`)
- `main.js` — Three.js 씬, 렌더 패스, 가상 스크롤 타임라인(`T`), 제목 링, 피날레, 화면 폭별 배치(`fitRing`)
- `styles.css`, `index.html` (제목·설명·OG·파비콘 태그 포함)
- `fonts/HG-Cosmos.otf` — 한글 디스플레이 폰트 (배포 가능한 라이선스, 사용자 확인)
- `scripts/` — `generate-images.mjs`(OpenAI 이미지), `build-share-assets.mjs`(OG·파비콘), `capture-og.mjs`(예전 캡처 방식), `build-dist.mjs`(Cloudflare용)
- `assets/` — 광물 텍스처 8장, `world-dusk/dawn.png`, OG 배경 2장, 파비콘 원본
- `미리보기-실행.bat` — 더블클릭하면 `python -m http.server 5173` + 브라우저
- `_archive/many-lenses-v1/` — 이전 자기소개 사이트 보관본. 건드리지 않기

## 4. 화면 · 글꼴
- 타임라인: 0~5 렌더 패스 창 6개 → 6.6~7.8 최종 렌더 창이 전체 화면으로 → 8~15 섹션 01~08(스냅) → 15~16 피날레
- 개발용: 브라우저 콘솔 `__seek(11)` 로 원하는 지점 이동
- 넓은 화면: 설명 글 왼쪽, 돌 가운데, 제목 링은 돌 아래~하단 좌표 사이 자동 맞춤 / 좁은 화면(≤760px): 돌 작게 위, 설명 글 돌 아래 가운데
- 한글 디스플레이(HG-코스모스): 인트로 2번째 줄, 광물 문구, 팀 소개, 창 꼬리표. 인트로 좌표 줄·영문은 원래 글꼴. "What's next?"는 로고와 같은 Archivo 900
- 섹션 제목 = 팀 이름(KIGLE/COCOBI/GLOBAL/CONTENT/SOUND/MD/SYNERGY/FUTURE), 부제 = 광물 이름
- 미리보기 패널의 화면 크기 흉내 기능은 값이 불안정 → 실제 크기 iframe을 띄워 측정

## 5. 원래 노트북 환경 메모
- Windows · PowerShell 5.1. Node 24 LTS, npm 12, Python 3.14, TypeScript, Playwright(전역), Git 설치됨
- OneDrive 개인 계정 용량 초과(바탕화면 195GB가 백업 대상이던 문제) → 프로젝트를 OneDrive 밖 `C:\Users\kimys\Projects\AI_Week1`로 옮김. 컴퓨터 간 이동은 GitHub로
- `my-first-worker/`: create-cloudflare로 만든 Hello World Worker (자체 git 저장소, 미배포). 그 안의 CLAUDE.md는 `@AGENTS.md` — Workers 작업 전 최신 Cloudflare 문서 확인

## 6. 남은 일 (2026-10-06)
- Cloudflare Workers Builds ↔ GitHub 연결 확인 후 자동 배포 테스트
- 대표 공유 주소를 Cloudflare로 할지 결정 → 그렇다면 og:url·og:image를 workers.dev 주소로 변경
- 팀 발표 방식 결정, 오프라인 대비(Three.js·폰트 로컬 번들) 여부
- 색 지정: 기획의 "04~06 = 보라·주황·청록"과 달리 현재는 광물 색 기준(주황·청록·초록)
- 이미지 압축(장당 1~3MB), 폰트 otf → woff2 변환 고려
