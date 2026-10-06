// 페이지에 들어가는 글과 색은 모두 여기서 고치면 됩니다.
// 문구 안의 \n 은 줄바꿈입니다.

export const COORD = `37°29'06.7"N 126°59'44.5"E`;
export const SPECIMEN = "SPECIMEN No. KG-0001";

export const INTRO_QUOTE = "기록되지 않은 원석이 발견되었다.";
export const LEGEND = ""; // 비워 두면 전설 한 줄이 나오지 않아요
export const FINALE = { coord: "COORDINATES: EVERYWHERE", line: "What's next?" };

// 렌더 패스 창 6개 = 분석 단계
export const PASSES = [
  { key: "wireframe",  step: "SCAN",      file: "scan_01.log",              note: "3D 스캔 · 형태 파악" },
  { key: "grid",       step: "GRID",      file: "excavation_grid.map",      note: "발굴 좌표 격자" },
  { key: "normals",    step: "ANALYSIS",  file: "spectral_analysis.csv",    note: "성분 분석" },
  { key: "clay",       step: "RESTORE",   file: "restore_form.obj",         note: "원형 복원" },
  { key: "core",       step: "CORE",      file: "core_analysis.exe",        note: "내부 투시 · 여러 결 감지" },
  { key: "beauty",     step: "EXCAVATED", file: "specimen_KG-0001.render",  note: "발굴 완료" },
];

// 섹션 8개
//   title: 화면 아래 큰 제목 / mineral: 부제에 들어가는 광물 이름 / kind: 광물 종류
//   myth: 광물 문구 / team: 팀 소개
//   layer: 오른쪽 위에 표시되는 층 이름 (핵 → 표면 순서)
//   colors: [밝은색, 어두운색] 돌 색 / tint: 하늘 색 보정
export const SECTIONS = [
  { no: "01", layer: "CORE", title: "KIGLE",    mineral: "Solare",   kind: "호박색 결정", tex: "assets/min-01-solare.png",
    myth: "햇빛이 굳어 생긴 돌.\n모든 이야기는 이 빛에서 시작되었다.",
    team: "Kids' First Playground",
    colors: ["#ffb347", "#7a3b0a"], tint: "#ffb066" },
  { no: "02", layer: "BEDROCK", title: "COCOBI",   mineral: "Strata",   kind: "분홍 모래층", tex: "assets/min-02-strata.png",
    myth: "분홍빛 모래가 겹겹이 쌓여\n가장 단단한 층이 되었다.",
    team: "KIGLE의 첫 캐릭터 IP",
    colors: ["#ffb6c1", "#8c4a5a"], tint: "#ff9fb0" },
  { no: "03", layer: "NEBULA", title: "GLOBAL",   mineral: "Nebulite", kind: "성운의 돌", tex: "assets/min-03-nebulite.png",
    myth: "멀리서 온 빛들이 모여\n하나의 성운이 되었다.",
    team: "COCOBI를 전 세계 아이들에게",
    colors: ["#9b7bff", "#1d1446"], tint: "#8f7dff" },
  { no: "04", layer: "VEIN I", title: "CONTENT",  mineral: "Ember",    kind: "용암 광석", tex: "assets/min-04-ember.png",
    myth: "빛을 머금은 결.\n어둠 속에서 깨어난 가장 밝은 이야기.",
    team: "아이들의 상상을 이야기로",
    colors: ["#ff6a2a", "#2a0a05"], tint: "#ff6a3a" },
  { no: "05", layer: "VEIN II", title: "SOUND",    mineral: "Tidal",    kind: "청록석", tex: "assets/min-05-tidal.png",
    myth: "멈추지 않고 흐르는 물결.\n파동이 노래가 된다.",
    team: "아이들이 처음 만나는 멜로디",
    colors: ["#35e0d0", "#063c3c"], tint: "#3fd6cc" },
  { no: "06", layer: "VEIN III", title: "MD",       mineral: "Verdan",   kind: "이끼 암석", tex: "assets/min-06-verdan.png",
    myth: "닿는 곳마다 짙어지는 빛깔.\n어디로든 퍼져 나간다.",
    team: "COCOBI를 아이들의 손 안에",
    colors: ["#8fd16a", "#1f3317"], tint: "#9ad870" },
  { no: "07", layer: "BOUNDARY", title: "SYNERGY",  mineral: "Lumen",    kind: "은청 광물", tex: "assets/min-07-lumen.png",
    myth: "서로 다른 빛이 스며들어\n하나의 결을 만든다.",
    team: "다름이 모여 하나의 웃음이 되는 곳",
    colors: ["#cfe0ff", "#4a5a78"], tint: "#b8cfff" },
  { no: "08", layer: "SURFACE", title: "FUTURE",   mineral: "Aurora",   kind: "새벽과 노을", tex: "assets/min-08-aurora.png",
    myth: "여덟 개의 결을 품은 돌.\n세계를 비추다.",
    team: "전 세계 아이들에게 닿을 KIGLE의 다음 이야기",
    colors: ["#ffd9a8", "#3a2a5a"], tint: "#ffffff" },
];
