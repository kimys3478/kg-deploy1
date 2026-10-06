import * as THREE from "three";
import { COORD, SPECIMEN, INTRO_QUOTE, LEGEND, FINALE, PASSES, SECTIONS } from "./content.js";

/* =========================================================
   공통 유틸
   ========================================================= */
const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const range = (u, a, b) => clamp((u - a) / (b - a));
const isNarrow = () => innerWidth < 760;

/* =========================================================
   스크롤 타임라인 (가상 스크롤 단위)
   0 ~ 5   : 렌더 패스 창이 하나씩 쌓임 (분석 단계)
   5.5~6.7 : 전설 한 줄
   6.6~7.8 : 최종 렌더 창이 화면 전체로 열리며 씬 전환
   8 ~ 15  : 섹션 01 ~ 08 (한 칸씩 스냅)
   15 ~ 16 : 피날레 (노을 → 새벽, 돌이 빛을 내뿜음)
   ========================================================= */
const T = { winStart: 0.3, winGap: 0.85, winDur: 0.5, legendA: 5.5, legendB: 6.7, transA: 6.6, transB: 7.8, sec: 8, max: 16 };
const winStartAt = i => T.winStart + i * T.winGap;

/* =========================================================
   돌 모양 (JS 노이즈로 조약돌 형태를 만듦)
   ========================================================= */
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1;
}
// 단위 구 위의 점 → 조약돌 표면의 점
function stonePoint(x, y, z) {
  const n = vnoise(x * 1.3 + 3, y * 1.3, z * 1.3) * 0.1 + vnoise(x * 3.1, y * 3.1 + 7, z * 3.1) * 0.035;
  let px = x * (1 + n), py = y * (1 + n), pz = z * (1 + n);
  px *= 0.78; py *= 1.55; pz *= 0.62;
  px *= 1 - 0.08 * (py / 1.55);
  return [px, py, pz];
}
function makeStone(seg) {
  const g = new THREE.SphereGeometry(1, seg, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, ...stonePoint(p.getX(i), p.getY(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}
const stoneGeo = makeStone(160);
const wireGeo = makeStone(40);

/* =========================================================
   셰이더 조각
   ========================================================= */
const NOISE = /* glsl */`
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.02; a *= 0.5; } return s; }
`;
const STONE_VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vPos;
  void main(){
    vUv = uv; vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// 최종 렌더(beauty): 광물 텍스처가 표면 위에서 천천히 흐름. 섹션이 바뀌면 A→B로 섞임
const beautyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTexA: { value: null }, uTexB: { value: null }, uHasA: { value: 0 }, uHasB: { value: 0 },
    uColA: { value: new THREE.Color() }, uColA2: { value: new THREE.Color() },
    uColB: { value: new THREE.Color() }, uColB2: { value: new THREE.Color() },
    uMix: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0 },
    uRim: { value: new THREE.Color("#ffd2a0") }, uLight: { value: new THREE.Vector3(-0.5, 0.8, 0.6) },
  },
  vertexShader: STONE_VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D uTexA, uTexB; uniform float uHasA, uHasB, uMix, uTime, uGlow;
    uniform vec3 uColA, uColA2, uColB, uColB2, uRim, uLight;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vPos;
    ${NOISE}
    vec3 mineral(sampler2D t, float has, vec3 c1, vec3 c2){
      float tt = uTime * 0.04;
      vec3 q = vPos * 1.6;
      vec2 warp = vec2(fbm(q + vec3(0.0, tt, 0.0)), fbm(q + vec3(5.2, -tt, 1.3))) - 0.5;
      vec2 uv = vec2(vUv.x * 2.0, vUv.y * 1.2) + warp * 0.35 + vec2(0.0, tt);
      vec3 tx = texture2D(t, uv).rgb;
      vec3 pr = mix(c2, c1, smoothstep(0.25, 0.75, fbm(q * 1.5 + vec3(warp * 2.0, tt))));
      return mix(pr, tx, has);
    }
    void main(){
      vec3 col = mix(mineral(uTexA, uHasA, uColA, uColA2), mineral(uTexB, uHasB, uColB, uColB2), uMix);
      vec3 N = normalize(vN);
      float d = max(dot(N, normalize(uLight)), 0.0);
      float fres = pow(1.0 - max(dot(N, normalize(vV)), 0.0), 2.2);
      col = col * (0.45 + 0.75 * d) + uRim * fres * 0.8;
      col += col * uGlow * 1.6 + vec3(1.0, 0.95, 0.9) * uGlow * uGlow * (0.4 + fres);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
});

// 렌더 패스용 재질
const PASS_MATS = {
  wireframe: new THREE.MeshBasicMaterial({ color: 0xe8e8e8, wireframe: true, transparent: true, opacity: 0.55 }),
  grid: new THREE.ShaderMaterial({
    uniforms: { uLight: { value: new THREE.Vector3(-0.5, 0.8, 0.6) } },
    vertexShader: STONE_VERT,
    fragmentShader: /* glsl */`
      uniform vec3 uLight; varying vec2 vUv; varying vec3 vN;
      void main(){
        vec2 c = floor(vUv * vec2(24.0, 16.0));
        float k = mod(c.x + c.y, 2.0);
        vec3 col = mix(vec3(0.07), vec3(0.93), k) * (0.55 + 0.45 * max(dot(normalize(vN), normalize(uLight)), 0.0));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }),
  normals: new THREE.MeshNormalMaterial(),
  clay: new THREE.MeshStandardMaterial({ color: 0xbab5ad, roughness: 0.95, metalness: 0 }),
  core: new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uC1: { value: new THREE.Color(SECTIONS[3].colors[0]) },
      uC2: { value: new THREE.Color(SECTIONS[4].colors[0]) },
      uC3: { value: new THREE.Color(SECTIONS[5].colors[0]) },
    },
    vertexShader: STONE_VERT,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uC1, uC2, uC3;
      varying vec3 vN; varying vec3 vV; varying vec3 vPos;
      ${NOISE}
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
        float band = vPos.y * 2.2 + fbm(vPos * 2.0 + uTime * 0.15) * 1.6;
        vec3 inner = uC1 * pow(0.5 + 0.5 * sin(band * 3.0), 4.0)
                   + uC2 * pow(0.5 + 0.5 * sin(band * 3.0 + 2.09), 4.0)
                   + uC3 * pow(0.5 + 0.5 * sin(band * 3.0 + 4.18), 4.0);
        vec3 col = inner * (1.0 - fres) * 1.1 + vec3(0.85, 0.9, 1.0) * fres * 1.2;
        gl_FragColor = vec4(col, 0.35 + fres * 0.65);
        #include <colorspace_fragment>
      }
    `,
  }),
};
const PASS_BG = { wireframe: 0x050505, grid: 0x0a0a0a, normals: 0x4a2380, clay: 0x8f8b85, core: 0x040508 };

/* =========================================================
   텍스처 로드 (없으면 절차적 색으로 대체)
   ========================================================= */
const loader = new THREE.TextureLoader();
function loadTex(url, onOk) {
  loader.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    onOk(t);
  }, undefined, () => {});
}
const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
blank.needsUpdate = true;
const minTex = SECTIONS.map(() => null);
SECTIONS.forEach((s, i) => loadTex(s.tex, t => (minTex[i] = t)));
const worldTex = { dusk: null, dawn: null };
loadTex("assets/world-dusk.png", t => (worldTex.dusk = t));
loadTex("assets/world-dawn.png", t => (worldTex.dawn = t));

/* =========================================================
   씬 A : 최종 렌더 / 세계 (전체 화면 캔버스)
   ========================================================= */
const canvasA = $("#scene");
const rA = new THREE.WebGLRenderer({ canvas: canvasA, antialias: true });
rA.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const sceneA = new THREE.Scene();
const camA = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
camA.position.set(0, 0.2, 9);

// 배경: 노을/새벽 풍경 + 섹션별 색 보정
const backdropMat = new THREE.ShaderMaterial({
  depthWrite: false,
  uniforms: {
    uDusk: { value: blank }, uDawn: { value: blank }, uHasDusk: { value: 0 }, uHasDawn: { value: 0 },
    uDawnMix: { value: 0 }, uTint: { value: new THREE.Color("#ffffff") }, uTintAmt: { value: 0 },
    uPar: { value: new THREE.Vector2() },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D uDusk, uDawn; uniform float uHasDusk, uHasDawn, uDawnMix, uTintAmt; uniform vec3 uTint; uniform vec2 uPar;
    varying vec2 vUv;
    vec3 sky(vec2 uv, float dawn){
      vec3 top = mix(vec3(0.16, 0.04, 0.03), vec3(0.45, 0.62, 0.95), dawn);
      vec3 hor = mix(vec3(0.95, 0.40, 0.14), vec3(1.0, 0.78, 0.72), dawn);
      vec3 gnd = mix(vec3(0.10, 0.04, 0.02), vec3(0.55, 0.45, 0.45), dawn);
      return uv.y > 0.42 ? mix(hor, top, smoothstep(0.42, 1.0, uv.y)) : mix(gnd, hor, smoothstep(0.2, 0.42, uv.y));
    }
    void main(){
      vec2 uv = vUv * 0.92 + 0.04 + uPar * 0.015;
      vec3 dusk = mix(sky(uv, 0.0), texture2D(uDusk, uv).rgb, uHasDusk);
      vec3 dawn = mix(sky(uv, 1.0), texture2D(uDawn, uv).rgb, uHasDawn);
      vec3 c = mix(dusk, dawn, uDawnMix);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, l * uTint * 1.3, uTintAmt);
      c *= 0.72 + 0.28 * smoothstep(1.1, 0.25, length(vUv - 0.5) * 1.4);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }
  `,
});
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMat);
backdrop.position.set(0, 0, -30);
backdrop.renderOrder = -1;
sceneA.add(backdrop);

// 땅: 돌이 서 있는 언덕
const groundGeo = new THREE.PlaneGeometry(70, 40, 140, 80);
{
  const p = groundGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const dist = Math.hypot(x, y + 6);
    const hill = vnoise(x * 0.12, y * 0.12, 1) * 1.6 + vnoise(x * 0.4, y * 0.4, 2) * 0.35;
    p.setZ(i, hill * smooth(clamp(dist / 9)) - 0.15 * Math.exp(-dist * 0.3));
  }
  groundGeo.computeVertexNormals();
}
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a140c, roughness: 1, flatShading: true });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -1.72, -6);
sceneA.add(ground);
sceneA.fog = new THREE.Fog(0x5a2a18, 8, 34);

const sun = new THREE.DirectionalLight(0xffd0a0, 2.2);
sun.position.set(-3, 5, 4);
sceneA.add(sun, new THREE.HemisphereLight(0xffb070, 0x1a0a06, 0.7));

const stoneA = new THREE.Mesh(stoneGeo, beautyMat);
sceneA.add(stoneA);

// 돌 뒤의 빛 번짐
const glowTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.2 }));
glow.position.set(0, 0.1, -1);
glow.scale.set(7, 9, 1);
sceneA.add(glow);

/* =========================================================
   씬 B : 렌더 패스 창 (화면 밖 렌더러 → 각 창의 2D 캔버스로 복사)
   ========================================================= */
const rB = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
rB.setPixelRatio(1);
rB.autoClear = false;
const sceneB = new THREE.Scene();
const camB = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camB.position.set(0, 0, 7.4);
const stoneB = new THREE.Mesh(stoneGeo, PASS_MATS.clay);
const wireB = new THREE.Mesh(wireGeo, PASS_MATS.wireframe);
const lightB = new THREE.DirectionalLight(0xffffff, 2.4);
lightB.position.set(-3, 4, 5);
sceneB.add(stoneB, wireB, lightB, new THREE.AmbientLight(0xffffff, 0.5));

// GRID 패스 배경: 발굴 좌표 격자
const gridBgScene = new THREE.Scene();
const gridBgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const gridBgMat = new THREE.ShaderMaterial({
  depthWrite: false, depthTest: false,
  uniforms: { uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform vec2 uRes; varying vec2 vUv;
    float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; return 1.0 - smoothstep(0.0, 1.2, min(g.x, g.y)); }
    void main(){
      vec2 p = vUv * uRes;
      float l = grid(p, 24.0) * 0.18 + grid(p, 120.0) * 0.45;
      vec2 c = abs(p - uRes * 0.5);
      l = max(l, (1.0 - smoothstep(0.0, 1.0, min(c.x, c.y))) * 0.7);
      gl_FragColor = vec4(vec3(0.04) + vec3(0.55, 0.8, 1.0) * l * 0.5, 1.0);
    }
  `,
});
gridBgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gridBgMat));

/* =========================================================
   창 만들기
   ========================================================= */
const LAYOUT_WIDE = [
  [0.33, 0.10, 0.24, 0.34], [0.20, 0.30, 0.21, 0.42], [0.42, 0.05, 0.22, 0.30],
  [0.31, 0.52, 0.26, 0.32], [0.43, 0.20, 0.22, 0.44], [0.59, 0.30, 0.37, 0.50],
];
const LAYOUT_NARROW = [
  [0.05, 0.10, 0.62, 0.22], [0.32, 0.20, 0.62, 0.24], [0.04, 0.34, 0.60, 0.20],
  [0.34, 0.46, 0.60, 0.22], [0.06, 0.58, 0.64, 0.20], [0.14, 0.30, 0.80, 0.40],
];
const wrap = $("#windows");
const wins = PASSES.map((pass, i) => {
  const el = document.createElement("div");
  el.className = `win win--${pass.key}`;
  el.style.zIndex = 10 + i;
  el.innerHTML = `
    <div class="win__bar"><i></i><i></i><i></i><b>${pass.file}</b><em>${pass.step}</em></div>
    <div class="win__body">
      ${pass.key === "beauty" ? '<span class="win__corner c1"></span><span class="win__corner c2"></span><span class="win__corner c3"></span><span class="win__corner c4"></span>' : "<canvas></canvas>"}
      <span class="win__tag">${pass.label || pass.key} · ${pass.note}</span>
    </div>`;
  (pass.key === "beauty" ? document.body : wrap).appendChild(el);
  const canvas = el.querySelector("canvas");
  return { pass, el, body: el.querySelector(".win__body"), bar: el.querySelector(".win__bar"), tag: el.querySelector(".win__tag"), canvas, ctx: canvas?.getContext("2d"), base: [0, 0, 0, 0], px: [1, 1] };
});
const beautyWin = wins[5];

function layoutWindows() {
  const L = isNarrow() ? LAYOUT_NARROW : LAYOUT_WIDE;
  let maxW = 1, maxH = 1;
  wins.forEach((w, i) => {
    const [x, y, ww, hh] = L[i];
    w.base = [x * innerWidth, y * innerHeight, ww * innerWidth, hh * innerHeight];
    if (w.canvas) {
      const dpr = Math.min(devicePixelRatio, 1.5);
      const pw = Math.max(1, Math.round(w.base[2] * dpr)), ph = Math.max(1, Math.round((w.base[3] - 22) * dpr));
      w.canvas.width = pw; w.canvas.height = ph; w.px = [pw, ph];
      maxW = Math.max(maxW, pw); maxH = Math.max(maxH, ph);
    }
  });
  rB.setSize(maxW, maxH, false);
}

/* =========================================================
   제목 링 (섹션)
   ========================================================= */
const ring = $("#ring");
const ringItems = SECTIONS.map(s => {
  const el = document.createElement("div");
  el.className = "ring__item";
  el.innerHTML = `<small>${s.no} — ${s.mineral.toUpperCase()}</small>` + [...s.title].map(c => `<span class="ch"><span>${c}</span></span>`).join("");
  ring.appendChild(el);
  return el;
});
const info = $(".info");
const infoEls = Object.fromEntries([...document.querySelectorAll("[data-info]")].map(e => [e.dataset.info, e]));
let activeSec = -1;
function setActive(i) {
  if (i === activeSec) return;
  activeSec = i;
  const s = SECTIONS[i];
  ringItems.forEach((el, k) => el.classList.toggle("is-active", k === i));
  // 활성 제목은 글자가 한 글자씩 아래에서 올라옴
  const el = ringItems[i];
  el.classList.add("is-enter");
  void el.offsetWidth;
  el.classList.remove("is-enter");
  el.querySelectorAll(".ch > span").forEach((c, k) => (c.style.transitionDelay = `${k * 45}ms`));
  info.classList.add("is-swap");
  setTimeout(() => {
    infoEls.no.textContent = s.no; infoEls.part.textContent = s.mineral.toUpperCase();
    infoEls.kind.textContent = `${s.mineral} · ${s.kind}`;
    infoEls.myth.textContent = s.myth; infoEls.team.textContent = s.team;
    info.classList.remove("is-swap");
  }, 260);
  document.documentElement.style.setProperty("--accent", s.colors[0]);
}

/* =========================================================
   인트로: 윤곽선 그리기 + 좌표 타이핑
   ========================================================= */
const outlinePath = $("#outline path");
{
  let d = "";
  for (let k = 0; k <= 180; k++) {
    const a = (k / 180) * Math.PI * 2;
    const [x, y] = stonePoint(Math.cos(a), Math.sin(a), 0);
    d += `${k ? "L" : "M"}${(200 + x * 120).toFixed(1)} ${(300 - y * 170).toFixed(1)}`;
  }
  outlinePath.setAttribute("d", d + "Z");
  const len = outlinePath.getTotalLength();
  outlinePath.style.strokeDasharray = len;
  outlinePath.style.strokeDashoffset = len;
}
const typeInto = (el, text, speed) => new Promise(res => {
  let i = 0;
  const tick = () => { el.textContent = text.slice(0, ++i); i < text.length ? setTimeout(tick, speed) : res(); };
  tick();
});
let locked = true;
async function runIntro() {
  await new Promise(r => setTimeout(r, 300));
  outlinePath.style.transition = "stroke-dashoffset 2.6s cubic-bezier(.6,0,.2,1)";
  outlinePath.style.strokeDashoffset = 0;
  await new Promise(r => setTimeout(r, 1200));
  await typeInto($('[data-type="coord"]'), `${COORD} · ${SPECIMEN}`, 28);
  await typeInto($('[data-type="quote"]'), INTRO_QUOTE, 55);
  $("#coord").textContent = COORD;
  locked = false;
}
$("#specimen").textContent = SPECIMEN;
$("#legend").textContent = LEGEND;
$("#finale").innerHTML = `<span class="mono" style="display:block;font-size:.42em;letter-spacing:.12em;margin-bottom:.5em" data-fin-coord></span>${FINALE.line}`;

/* =========================================================
   좌표 문자 교체 (스크램블)
   ========================================================= */
const GLYPHS = "0123456789°'\".NE—ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function scrambleTo(el, text, dur = 700) {
  const from = el.textContent, t0 = performance.now();
  const len = Math.max(from.length, text.length);
  cancelAnimationFrame(el._raf);
  const tick = now => {
    const k = clamp((now - t0) / dur);
    let out = "";
    for (let i = 0; i < len; i++) {
      if (i < Math.floor(k * len)) out += text[i] || "";
      else out += Math.random() < 0.5 ? (from[i] || "") : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (k < 1) el._raf = requestAnimationFrame(tick); else el.textContent = text;
  };
  el._raf = requestAnimationFrame(tick);
}
let finaleOn = false;

/* =========================================================
   입력: 휠 · 터치 · 키보드 → 가상 스크롤
   ========================================================= */
let target = 0, cur = 0, lastInput = 0;
const nudge = d => { if (locked) return; target = clamp(target + d, 0, T.max); lastInput = performance.now(); };
addEventListener("wheel", e => {
  e.preventDefault();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  nudge(clamp(dy, -120, 120) * 0.0025);
}, { passive: false });
let touchY = null;
addEventListener("touchstart", e => (touchY = e.touches[0].clientY), { passive: true });
addEventListener("touchmove", e => { if (touchY == null) return; const y = e.touches[0].clientY; nudge((touchY - y) * 0.008); touchY = y; }, { passive: true });
addEventListener("touchend", () => (touchY = null));
addEventListener("keydown", e => {
  if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); nudge(1); }
  if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); nudge(-1); }
});
$(".brand").addEventListener("click", e => { e.preventDefault(); if (!locked) target = 0; });
let mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

/* =========================================================
   리사이즈
   ========================================================= */
function resize() {
  rA.setSize(innerWidth, innerHeight, false);
  camA.aspect = innerWidth / innerHeight;
  camA.updateProjectionMatrix();
  layoutWindows();
  fitRing();
}

// 제목 링을 "돌 아래쪽 끝"과 "하단 좌표" 사이 공간에 맞춤
// 카메라 기본 위치: 넓은 화면은 돌이 크게 가운데, 좁은 화면은 돌을 작게 위쪽으로
const camBase = { y: 0.2, z: 9, lookY: -0.1 };
function fitRing() {
  if (!stoneGeo.boundingBox) stoneGeo.computeBoundingBox();
  const stoneMinY = stoneGeo.boundingBox.min.y;
  Object.assign(camBase, isNarrow() ? { y: -1.4, z: 13.9, lookY: -1.75 } : { y: 0.2, z: 9, lookY: -0.1 });
  camA.position.set(0, camBase.y, camBase.z);
  camA.lookAt(0, camBase.lookY, 0);
  camA.updateMatrixWorld();
  const dist = camA.position.z - backdrop.position.z;
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(camA.fov / 2)) * dist * 1.12;
  backdrop.scale.set(Math.max(h * camA.aspect, h * 1.5), h, 1);

  const v = new THREE.Vector3(0, stoneMinY + 0.1, 0).project(camA);
  const stoneBottom = (1 - v.y) / 2 * innerHeight;
  const coordTop = $("#coord").getBoundingClientRect().top || innerHeight - 36;
  const bottom = coordTop - 12;
  const label = 24; // 부제 줄 높이
  const root = document.documentElement.style;
  let size;
  if (isNarrow()) {
    // 좁은 화면: 돌 → 설명 글 → 부제/제목 순서로 위에서부터 쌓음
    size = clamp(innerWidth * 0.16, 40, 80);
    const ringTop = bottom - size * 0.82 - label;
    root.setProperty("--info-top", `${stoneBottom + 16}px`);
    root.setProperty("--info-max", `${Math.max(60, ringTop - 14 - (stoneBottom + 16))}px`);
  } else {
    size = clamp((bottom - (stoneBottom + 14) - label) / 0.82, 40, 140);
  }
  root.setProperty("--ring-bottom", `${innerHeight - bottom}px`);
  root.setProperty("--ring-size", `${size}px`);
  root.setProperty("--ground-top", `${stoneBottom - 30}px`);
}
addEventListener("resize", resize);
resize();

/* =========================================================
   매 프레임
   ========================================================= */
const tmpA = new THREE.Color(), tmpB = new THREE.Color(), fogCol = new THREE.Color();
const clock = new THREE.Clock();
const stepEl = $("#step"), barEl = $("#bar"), hintEl = $("#hint"), coordEl = $("#coord");
const intro = $("#intro"), legend = $("#legend"), sections = $("#sections"), flash = $("#flash"), finale = $("#finale");
let lastStep = "";

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // 섹션 구간에서는 손을 떼면 가장 가까운 섹션으로 맞춤
  if (performance.now() - lastInput > 220 && target > T.transB && target < T.sec + 7.25) {
    target = lerp(target, clamp(Math.round(target), T.sec, T.sec + 7), 0.12);
  }
  cur = lerp(cur, target, 1 - Math.exp(-dt * 4.5));
  const u = cur;
  mouse.sx = lerp(mouse.sx, mouse.x, 0.05); mouse.sy = lerp(mouse.sy, mouse.y, 0.05);

  /* ----- 진행도 ----- */
  const winA = wins.map((_, i) => easeOut(range(u, winStartAt(i), winStartAt(i) + T.winDur)));
  // 전설 문구가 비어 있으면 창을 어둡게 하는 연출도 생략
  const legendK = LEGEND ? smooth(range(u, T.legendA, T.legendA + 0.4)) * (1 - smooth(range(u, T.legendB - 0.4, T.legendB))) : 0;
  const trans = smooth(range(u, T.transA, T.transB));
  const s = clamp(u - T.sec, 0, 7);
  const fin = range(u, 15, 16);
  const dawn = smooth(range(u, 15, 15.85));
  const burst = smooth(range(u, 15.45, 15.9));

  /* ----- 인트로 / 전설 ----- */
  intro.style.opacity = 1 - range(u, 0.15, 0.9);
  legend.style.opacity = legendK;
  legend.style.letterSpacing = `${lerp(0.04, -0.02, legendK)}em`;

  /* ----- 창 배치 ----- */
  wrap.style.opacity = (1 - legendK * 0.6) * (1 - trans);
  wrap.style.display = trans >= 1 ? "none" : "";
  wins.forEach((w, i) => {
    const a = winA[i];
    let [x, y, ww, hh] = w.base;
    const depth = (i + 1) * 6;
    x += mouse.sx * depth; y += mouse.sy * depth;
    if (w === beautyWin) {
      // 최종 렌더 창이 화면 전체로 열림
      x = lerp(x, -1, trans); y = lerp(y, -23, trans); ww = lerp(ww, innerWidth + 2, trans); hh = lerp(hh, innerHeight + 24, trans);
      w.el.style.opacity = a;
      w.el.style.transform = `translateY(${(1 - a) * 24}px)`;
      w.el.style.borderColor = `rgba(255,255,255,${0.18 * (1 - trans)})`;
      w.bar.style.opacity = 1 - trans;
      w.tag.style.opacity = 1 - trans;
      w.el.style.display = a <= 0.001 ? "none" : "";
    } else {
      // 나머지 창은 바깥으로 흩어지며 사라짐
      const cx = x + ww / 2 - innerWidth / 2, cy = y + hh / 2 - innerHeight / 2;
      x += cx * trans * 0.8; y += cy * trans * 0.8;
      w.el.style.opacity = a;
      w.el.style.transform = `translateY(${(1 - a) * 30}px) scale(${0.94 + 0.06 * a})`;
    }
    Object.assign(w.el.style, { left: `${x}px`, top: `${y}px`, width: `${ww}px`, height: `${hh}px` });
  });

  /* ----- 씬 A 상태 ----- */
  const i0 = Math.floor(s), i1 = Math.min(i0 + 1, 7), m = smooth(s - i0);
  const A = SECTIONS[i0], B = SECTIONS[i1];
  const U = beautyMat.uniforms;
  U.uTexA.value = minTex[i0] || blank; U.uHasA.value = minTex[i0] ? 1 : 0;
  U.uTexB.value = minTex[i1] || blank; U.uHasB.value = minTex[i1] ? 1 : 0;
  U.uColA.value.set(A.colors[0]); U.uColA2.value.set(A.colors[1]);
  U.uColB.value.set(B.colors[0]); U.uColB2.value.set(B.colors[1]);
  U.uMix.value = m; U.uTime.value = time;
  U.uGlow.value = burst * 1.1;
  U.uRim.value.copy(tmpA.set(A.colors[0]).lerp(tmpB.set(B.colors[0]), m)).lerp(new THREE.Color("#ffffff"), 0.35);

  const secK = range(u, T.transA, T.sec);
  const bU = backdropMat.uniforms;
  bU.uDusk.value = worldTex.dusk || blank; bU.uHasDusk.value = worldTex.dusk ? 1 : 0;
  bU.uDawn.value = worldTex.dawn || blank; bU.uHasDawn.value = worldTex.dawn ? 1 : 0;
  bU.uDawnMix.value = dawn;
  bU.uTint.value.copy(tmpA.set(A.tint).lerp(tmpB.set(B.tint), m));
  bU.uTintAmt.value = 0.38 * secK * (1 - dawn);
  bU.uPar.value.set(mouse.sx, -mouse.sy);

  fogCol.set("#5a2a18").lerp(bU.uTint.value, 0.3 * secK).lerp(new THREE.Color("#e9c9c4"), dawn);
  sceneA.fog.color.copy(fogCol);
  groundMat.color.set("#2a140c").lerp(new THREE.Color("#8a7a80"), dawn);

  glow.material.color.copy(U.uRim.value);
  glow.material.opacity = 0.18 + burst * 0.9;
  glow.scale.set(7 + burst * 10, 9 + burst * 10, 1);

  const rotY = time * 0.12 + u * 0.35;
  stoneA.rotation.set(0, rotY, Math.sin(time * 0.4) * 0.02);
  stoneA.position.y = 0.1 + Math.sin(time * 0.8) * 0.04;
  camA.position.x = mouse.sx * 0.6;
  camA.position.y = camBase.y - mouse.sy * 0.3;
  camA.position.z = camBase.z;
  camA.lookAt(0, camBase.lookY, 0);

  /* ----- 씬 A 그리기 (최종 렌더 창 영역만 보이게) ----- */
  const showA = winA[5] > 0.001;
  canvasA.style.opacity = winA[5];
  if (showA) {
    if (trans >= 1) canvasA.style.clipPath = "none";
    else {
      const r = beautyWin.body.getBoundingClientRect();
      canvasA.style.clipPath = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;
    }
    rA.render(sceneA, camA);
  }

  /* ----- 렌더 패스 창 그리기 ----- */
  if (trans < 1) {
    const H = rB.domElement.height;
    stoneB.rotation.y = wireB.rotation.y = rotY;
    PASS_MATS.core.uniforms.uTime.value = time;
    for (let i = 0; i < 5; i++) {
      const w = wins[i];
      if (winA[i] <= 0.001) continue;
      const [pw, ph] = w.px, key = w.pass.key;
      rB.setViewport(0, H - ph, pw, ph);
      rB.setScissor(0, H - ph, pw, ph);
      rB.setScissorTest(true);
      rB.setClearColor(PASS_BG[key], 1);
      rB.clear();
      camB.aspect = pw / ph; camB.updateProjectionMatrix();
      if (key === "grid") { gridBgMat.uniforms.uRes.value.set(pw, ph); rB.render(gridBgScene, gridBgCam); }
      stoneB.visible = key !== "wireframe"; wireB.visible = key === "wireframe";
      if (stoneB.visible) stoneB.material = PASS_MATS[key];
      rB.render(sceneB, camB);
      w.ctx.drawImage(rB.domElement, 0, 0, pw, ph, 0, 0, pw, ph);
    }
  }

  /* ----- 섹션 ----- */
  const secVis = range(u, 7.4, 7.95) * (1 - range(u, 15.35, 15.8) * 0.9);
  sections.style.opacity = secVis;
  if (u > 7.4) setActive(Math.round(s));
  const R = Math.max(innerWidth * 0.75, 520);
  ringItems.forEach((el, i) => {
    const a = (i - s) * 0.6;
    const vis = Math.abs(i - s) < 3.5;
    el.style.display = vis ? "" : "none";
    if (!vis) return;
    el.style.transform = `translateX(-50%) translate3d(${Math.sin(a) * R}px, 0, ${(Math.cos(a) - 1) * R}px) rotateY(${a}rad)`;
    el.style.opacity = clamp(1 - Math.abs(a) / 1.35);
  });

  /* ----- 피날레 ----- */
  flash.style.opacity = burst * (1 - smooth(range(u, 15.9, 16))) * 0.85 + burst * 0.15;
  finale.style.opacity = smooth(range(u, 15.65, 16));
  document.body.classList.toggle("is-dawn", dawn > 0.55);
  const wantFinale = u > 15.6;
  if (wantFinale !== finaleOn && !locked) {
    finaleOn = wantFinale;
    scrambleTo(coordEl, wantFinale ? FINALE.coord : COORD);
    scrambleTo(finale.querySelector("[data-fin-coord]"), wantFinale ? FINALE.coord : COORD);
  }

  /* ----- HUD ----- */
  let step;
  if (u < T.legendA) { const n = winA.filter(a => a > 0.5).length; step = n ? `${PASSES[n - 1].step} · ${String(n).padStart(2, "0")}/06` : "INITIALIZING"; }
  else if (u < T.transB) step = LEGEND ? "LEGEND" : "EXCAVATED";
  else if (u < 15.6) step = `LAYER ${SECTIONS[Math.round(s)].no} · ${SECTIONS[Math.round(s)].layer}`;
  else step = "COORDINATES: EVERYWHERE";
  if (step !== lastStep) { stepEl.textContent = step; lastStep = step; }
  barEl.style.width = `${(u / T.max) * 100}%`;
  hintEl.style.opacity = locked ? 0 : 1 - range(u, 0.2, 0.6) + range(u, 7.9, 8.2) * (1 - range(u, 8.6, 9)) ;

  requestAnimationFrame(frame);
}

// 개발용: 콘솔에서 __seek(8) 처럼 원하는 지점으로 바로 이동
window.__dbg = { camA, stoneA, THREE };
window.__seek = v => { locked = false; target = cur = clamp(v, 0, T.max); lastInput = performance.now() + 1e9; };

runIntro();
requestAnimationFrame(frame);
