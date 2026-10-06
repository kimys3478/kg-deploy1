// 아카이브에 들어갈 작업 기록 (임시 내용 — 실제 프로젝트로 바꿔주세요)
const PROJECTS = [
  { name: "Global Launch", year: "01", tag: "Content · Simultaneous release", img: "assets/card-6.png", desc: "여러 언어로 같은 날 출시한 대형 업데이트. 언어별 일정과 분량을 역산해 동시 출시를 맞췄어요." },
  { name: "Style Guide", year: "02", tag: "L10n · Tone & voice", img: "assets/card-2.png", desc: "언어별 톤앤매너와 표기 규칙을 정리한 스타일 가이드. 번역사가 바뀌어도 목소리는 그대로 유지돼요." },
  { name: "Glossary", year: "03", tag: "L10n · Terminology", img: "assets/card-3.png", desc: "수천 개의 고유 용어를 언어별로 관리하는 용어집. 같은 단어가 어디서나 같은 뜻으로 읽히게 해요." },
  { name: "Event Content", year: "04", tag: "Content · Planning", img: "assets/card-1.png", desc: "시즌 이벤트 콘텐츠 기획. 지역마다 다른 기념일과 문화를 반영해 현지 맞춤 버전을 만들었어요." },
  { name: "LQA Process", year: "05", tag: "Quality · Review", img: "assets/card-5.png", desc: "화면 위에서 직접 확인하는 언어 품질 검수 프로세스. 잘림, 오역, 문맥 오류를 출시 전에 잡아요." },
  { name: "Vendor Ops", year: "06", tag: "Ops · Collaboration", img: "assets/card-4.png", desc: "외부 번역 파트너와의 협업 체계. 질문과 답변을 한곳에 모아 같은 질문이 반복되지 않게 했어요." },
  { name: "Store Pages", year: "07", tag: "Content · Marketing", img: "assets/project-1.png", desc: "언어별 스토어 페이지와 소개 문구. 직역 대신 각 시장에서 검색되고 클릭되는 표현을 찾았어요." },
  { name: "Next", year: "08", tag: "Coming soon", img: "assets/thing-1.png", desc: "다음은 어떤 언어, 어떤 이야기일까요. 함께 만들 사람을 기다리고 있어요." },
];

// 마지막 화면에 흐르는 언어별 인사
const GREETINGS = [
  ["Hello", "EN"], ["안녕하세요", "KO"], ["こんにちは", "JA"], ["你好", "ZH-CN"], ["Hola", "ES"],
  ["Bonjour", "FR"], ["Hallo", "DE"], ["Olá", "PT-BR"], ["Ciao", "IT"], ["Привет", "RU"],
  ["สวัสดี", "TH"], ["Xin chào", "VI"], ["Merhaba", "TR"], ["Halo", "ID"],
];

// 히어로 안경마다 붙는 언어 코드
const LENS_CODES = ["EN", "JA", "KO", "ES", "FR", "DE"];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 3);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 이미지가 아직 없으면 회색 자리 표시 ---------- */
function markPlaceholder(img) { img.classList.add("ph"); img.removeAttribute("src"); }
function watchImages(root = document) {
  $$("img[data-ph]", root).forEach(img => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markPlaceholder(img);
    img.addEventListener("error", () => markPlaceholder(img), { once: true });
  });
}

/* ---------- 아카이브 · 마퀴 생성 ---------- */
const thumbs = $("[data-archive-thumbs]");
const years = $("[data-archive-years]");
PROJECTS.forEach((p, i) => {
  thumbs.insertAdjacentHTML("beforeend", `<li data-i="${i}"><img src="${p.img}" alt="${p.name}" data-ph></li>`);
  years.insertAdjacentHTML("beforeend", `<span>${p.year}</span>`);
});
const marquee = $("[data-marquee]");
const tiles = GREETINGS.map(([hi, code]) => `<figure><div class="marquee__hi">${hi}</div><figcaption>${code}</figcaption></figure>`).join("");
marquee.innerHTML = tiles.repeat(2);
watchImages();

/* ---------- 히어로: 마우스를 움직이면 안경이 바뀜 ---------- */
{
  const photo = $("[data-lens-swap]");
  const frames = $$("img", photo);
  const code = $("[data-lens-code]");
  let idx = 0, travel = 0, last = null;
  const show = i => {
    frames[idx].classList.remove("is-on");
    idx = i;
    frames[idx].classList.add("is-on");
    code.textContent = LENS_CODES[idx] || "";
  };
  const STEP = 90; // 이 거리(px)만큼 움직일 때마다 다음 안경
  const onMove = (x, y) => {
    if (last) travel += Math.hypot(x - last[0], y - last[1]);
    last = [x, y];
    if (travel > STEP) { travel = 0; show((idx + 1) % frames.length); }
  };
  addEventListener("pointermove", e => { if (scrollY < innerHeight * 1.2) onMove(e.clientX, e.clientY); }, { passive: true });
  // 터치 기기는 마우스가 없으니 사진을 탭하면 바뀜
  photo.addEventListener("click", () => show((idx + 1) % frames.length));
}

/* ---------- 단어 단위 등장 ---------- */
$$("[data-reveal]").forEach(el => {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(part);
          else { const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.append(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("scramble") && n.tagName !== "BR") {
        if (n.tagName === "I") n.classList.add("w"); else walk(n);
      } else if (n.nodeType === 1 && n.classList.contains("scramble")) n.classList.add("w");
    });
  };
  walk(el);
  $$(".w", el).forEach((w, i) => (w.style.transitionDelay = `${i * 28}ms`));
});

/* ---------- 점자 스크램블 ---------- */
const BRAILLE = "⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵";
function scramble(el) {
  if (el.dataset.run) return;
  el.dataset.run = 1;
  const target = el.dataset.word || el.textContent;
  el.dataset.word = target;
  let frame = 0;
  const total = 26;
  const tick = () => {
    frame++;
    const done = Math.floor((frame / total) * target.length);
    el.textContent = target.split("").map((c, i) => (i < done ? c : BRAILLE[(Math.random() * BRAILLE.length) | 0])).join("");
    if (frame < total) setTimeout(tick, 60);
    else { el.textContent = target; el.classList.add("is-done"); }
  };
  tick();
}
$$("[data-scramble]").forEach(el => {
  el.dataset.word = el.textContent;
  el.textContent = el.textContent.split("").map(() => BRAILLE[(Math.random() * BRAILLE.length) | 0]).join("");
});

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (el.matches("[data-reveal]")) el.classList.add("is-in");
    if (el.matches("[data-scramble]")) setTimeout(() => scramble(el), 500);
    io.unobserve(el);
  });
}, { threshold: 0.35 });
$$("[data-reveal], [data-scramble]").forEach(el => io.observe(el));

/* ---------- 스크롤 진행도 헬퍼 ---------- */
// 요소가 화면 아래에서 들어와 위로 나갈 때 0→1
const through = el => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); };
// 고정(pin) 구간 진행도 0→1
const pinned = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };

/* ---------- 각 섹션 애니메이션 ---------- */
const heroRows = $$("[data-hero-row]");
const rings = $(".hero__rings");
const heroPhoto = $(".hero__photo");

const rootsPin = $("[data-pin]");
const strip = $("[data-strip]");
const stripImgs = $$("img", strip);
const lensParts = $$("[data-lens]");
const quote = $("[data-quote]");

const spread = $("[data-spread]");
const spreadLetters = $$(".spread__word span");
const spreadRing = $(".spread__ring");

const skillsPin = $("[data-skills]");
const skillCards = $$(".skill");
const skillIdx = $$(".skills__index li");
const skillYears = $$(".skills__years li");

const poster = $("[data-poster]");
const posterLetters = $$(".poster__word span");

const draw = $("[data-draw]");
const drawPaths = $$(".draw__art *");
drawPaths.forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 0; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L; });

const field = $("[data-field]");
const fieldBg = $(".field__bg");

const archive = $("[data-archive]");
const archiveHero = $("[data-archive-hero]");
const archivePortrait = $("[data-archive-portrait]");
const archiveTitle = $("[data-archive-title]");
const archiveDesc = $("[data-archive-desc]");
const archiveTag = $("[data-archive-tag]");
const archiveDial = $(".archive__dial");
const thumbItems = $$("li", thumbs);
const yearItems = $$("span", years);

const outro = $("[data-outro]");
const outroBlur = $("[data-outro-blur]");

const progress = $(".progress");
const progressFill = $(".progress__fill");

let archiveIdx = -1;
function setArchive(i) {
  if (i === archiveIdx) return;
  archiveIdx = i;
  const p = PROJECTS[i];
  archiveHero.classList.add("is-swap");
  setTimeout(() => {
    archiveHero.classList.remove("ph");
    archiveHero.src = p.img;
    archivePortrait.classList.remove("ph");
    archivePortrait.src = p.img;
    archiveHero.classList.remove("is-swap");
  }, 250);
  archiveTitle.textContent = p.name;
  archiveTag.textContent = p.tag;
  archiveDesc.textContent = p.desc;
  archiveDial.style.transform = `rotate(${i * 45}deg)`;
  thumbItems.forEach((t, k) => t.classList.toggle("is-on", k === i));
  yearItems.forEach((t, k) => t.classList.toggle("is-on", k === i));
}
thumbItems.forEach((t, i) => t.addEventListener("click", () => {
  const top = archive.offsetTop + (archive.offsetHeight - innerHeight) * ((i + 0.5) / PROJECTS.length);
  scrollTo({ top, behavior: "smooth" });
}));

function frame() {
  const y = scrollY;

  // 1. 히어로: 글자가 위아래로 흩어지며 사라짐
  heroRows.forEach((row, r) => {
    const letters = $$(".chart__word span", row);
    const mid = (letters.length - 1) / 2;
    const t = clamp(y / (innerHeight * 0.9));
    letters.forEach((l, i) => {
      const dir = i - mid;
      l.style.transform = `translate(${dir * t * 30 * (r + 1)}px, ${-t * (60 + Math.abs(dir) * 40)}px)`;
      l.style.opacity = 1 - t * 0.9;
    });
  });
  rings.style.transform = `rotate(${y * 0.02}deg) scale(${1 + y * 0.0003})`;
  heroPhoto.style.transform = `translateY(${-y * 0.15}px)`;

  // 4. 시작점: 렌즈 조각이 벌어지고, 사진 띠가 가로로 흐름
  {
    const t = pinned(rootsPin);
    const maxX = strip.scrollWidth - innerWidth;
    strip.style.transform = `translate(${-lerp(-innerWidth * 0.3, maxX + innerWidth * 0.3, t)}px, -50%)`;
    const cx = innerWidth / 2;
    stripImgs.forEach(img => { const r = img.getBoundingClientRect(); img.classList.toggle("is-focus", Math.abs(r.left + r.width / 2 - cx) < r.width * 0.7); });
    lensParts.forEach((p, i) => { p.style.transform = `translateY(${(i - 1.5) * ease(t) * 70}px)`; });
    quote.style.opacity = clamp((t - 0.25) * 3);
    quote.style.transform = `translateY(${(1 - clamp((t - 0.25) * 3)) * 40}px)`;
    progress.classList.toggle("is-on", t > 0 && t < 1);
    progressFill.style.width = `${t * 100}%`;
  }

  // 5. 큰 단어: 흩어진 글자가 제자리로 모임
  {
    const t = ease(clamp(through(spread) * 1.8));
    spreadLetters.forEach((l, i) => {
      const off = ((i * 37) % 7 - 3) * 60;
      l.style.transform = `translateY(${(1 - t) * off}px)`;
      l.style.opacity = 0.15 + t * 0.85;
    });
    spreadRing.style.transform = `rotate(${t * 180}deg)`;
  }

  // 6. 스킬: 카드가 아래에서 차례로 올라와 쌓임
  {
    const t = pinned(skillsPin);
    const n = skillCards.length;
    let active = 0;
    skillCards.forEach((c, i) => {
      const local = clamp(t * n - i);
      const k = i === 0 ? 1 : ease(clamp(local * 1.6));
      const depth = clamp(t * n - i - 1);
      c.style.transform = `translateY(${(1 - k) * 110}vh) scale(${1 - depth * 0.06})`;
      c.style.filter = `brightness(${1 - depth * 0.25})`;
      if (k > 0.5) active = i;
    });
    skillIdx.forEach((li, i) => li.classList.toggle("is-on", i === active));
    skillYears.forEach((li, i) => li.classList.toggle("is-on", i === active));
  }

  // 7. 포스터: 글자가 아래에서 솟아오르며 커짐
  {
    const t = clamp(through(poster) * 2.2 - 0.2);
    posterLetters.forEach((l, i) => {
      const k = ease(clamp(t * 1.4 - i * 0.04));
      l.style.transform = `translateY(${(1 - k) * 80}px) scaleY(${0.4 + k * 0.6})`;
      l.style.opacity = k;
    });
  }

  // 8. 선 드로잉: 스크롤에 맞춰 선이 그려짐
  {
    const t = clamp(through(draw) * 2 - 0.35);
    drawPaths.forEach((p, i) => { const k = clamp(t * 1.5 - i * 0.04); p.style.strokeDashoffset = p.dataset.len * (1 - k); });
  }

  // 9. 풀블리드 사진: 패럴랙스
  fieldBg.style.transform = `translateY(${(through(field) - 0.5) * 140}px)`;

  // 11. 아카이브: 스크롤 위치에 따라 프로젝트 전환
  {
    const t = pinned(archive);
    setArchive(Math.min(PROJECTS.length - 1, Math.floor(t * PROJECTS.length)));
  }

  // 12. 마무리: 흐릿한 문장이 선명해짐
  {
    // 마지막 섹션이라 화면 위쪽에 닿을 때 완전히 선명해지도록 계산
    const t = ease(clamp(1 - outro.getBoundingClientRect().top / (innerHeight * 0.6)));
    outroBlur.style.filter = `blur(${(1 - t) * 14}px)`;
    outroBlur.style.opacity = 0.4 + t * 0.6;
  }
}

let ticking = false;
const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } };
if (!reduced) { addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); }
frame();

/* ---------- 메뉴 ---------- */
const menuBtn = $(".menu__btn");
const panel = $("#menu-panel");
menuBtn.addEventListener("click", () => {
  const open = panel.hidden;
  panel.hidden = !open;
  menuBtn.setAttribute("aria-expanded", open);
});
$$("a", panel).forEach(a => a.addEventListener("click", () => { panel.hidden = true; menuBtn.setAttribute("aria-expanded", false); }));
$(".menu__dots").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
