# Many Lenses — 개인 자기소개 페이지 (보관본 v1)

> 2026-10-03 보관. 새 버전을 처음부터 다시 만들기로 해서 `AI_Week1/_archive/many-lenses-v1`로 옮김.
> 다시 보려면 이 폴더에서 `python -m http.server 5173` 실행 후 http://localhost:5173 접속.
> 이미지 생성 스크립트는 이 폴더 또는 AI_Week1 루트의 `.env`를 읽음.

Global 팀 Contents 파트 Project Manager(콘텐츠 기획 · 다국어 Localization)의 자기소개용 원페이지.
readingstones.com의 섹션 구성 · 흑백 톤 · 스크롤 인터랙션을 참고했고, 글과 이미지는 모두 새로 만든 것 (원본 텍스트·이미지는 쓰지 않음).

## 구조
- `index.html` — 섹션 구조와 모든 문구
- `styles.css` — 디자인 (Inter / JetBrains Mono / Noto Sans KR)
- `main.js` — 스크롤 애니메이션. 맨 위 `PROJECTS`(아카이브 8개), `GREETINGS`(마지막 인사 띠), `LENS_CODES`(히어로 안경별 언어 코드)
- `scripts/generate-images.mjs` — OpenAI 이미지 생성. `.env`의 `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` 사용. 없는 이미지만 생성, `--force`로 전체 재생성, 이름을 넘기면 해당 이미지만. `edit` 항목은 원본 이미지를 편집(images/edits)
- `assets/` — 생성 이미지
- 빌드 없음. 미리보기: `python -m http.server 5173` (`.claude/launch.json`의 `landing`)

## 섹션 순서
1 Hero(HELLO/HOLA/안녕하세요 + 마우스 이동 시 안경 바뀌는 사진 hero-0~5) → 2 소개 문장/The role → 3 업무 카드 6장(호버 시 선명) → 4 One idea(고정 + 가로 스트립) → 5 LOCALIZE → 6 How I work(Plan/Localize/Deliver 카드 스택) → 7 ONE STORY MANY VOICES → 8 선 드로잉 → 9 민들레 풀블리드 → 10 문장 → 11 아카이브(고정, 8개 전환) → 12 반반 화면 + 언어 인사 띠

## 진행 상황 (2026-10-02 기준)
- 완료: 전체 페이지 1차 구현, 컨셉을 Global Contents PM으로 전환, 히어로 안경 교체 효과, 이미지 생성 연결
- 남은 일:
  - `PROJECTS` 아카이브 8개는 임시 예시 → 실제 프로젝트로 교체
  - 이름 `KIM`, 이메일 `hello@example.com`은 임시 (index.html 하단)
  - 안 쓰는 이미지 정리 여부 확인: `hero.png`, `thing-2/5`, `project-2`, `strip-1/2` 등
  - 이미지가 장당 약 2MB → 배포 전 압축 필요
  - 모바일 화면 점검

## 주의
- 사용자 기기는 Windows · PowerShell. Node 24 / Python 3.14 / TypeScript / Playwright 전역 설치됨. git 없음
- `.env`의 API 키는 사용자가 직접 관리. 키 값을 출력하거나 채팅에 쓰지 않기
