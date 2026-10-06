// 링크 공유용 이미지 만들기
//  1) og-image.jpg         : 대표 OG 이미지 1200×630 — assets/og-bg.png 위에 왼쪽 제목 구성
//  2) og-image-square.jpg  : 정사각형 1200×1200 — assets/og-bg-center.png 위에 가운데 정렬 구성
//  3) 파비콘               : assets/favicon-src.png → favicon.ico(16·32·48), favicon-32.png, apple-touch-icon.png(180), icon-512.png
// 사용법: 미리보기 서버(localhost:5173)를 켠 상태에서  node scripts/build-share-assets.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const globalRoot = execSync("npm root -g").toString().trim();
const { chromium } = createRequire(path.join(globalRoot, "/"))("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:5173/";

const browser = await chromium.launch();

/* ---------- 1·2. OG 이미지 ---------- */
const HEAD = `<base href="${BASE}">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <style>
    @font-face { font-family: "HG Cosmos"; src: url("fonts/HG-Cosmos.otf") format("opentype"); }
    html, body { margin: 0; overflow: hidden; background: #050505; color: #f4f1ea; }
    .bg, .shade { position: absolute; inset: 0; }
    p, h1 { margin: 0; }
    .meta { font: 400 15px/1.6 "JetBrains Mono", monospace; letter-spacing: .06em; color: #ffb347; }
    .title { font: 900 96px/.9 "Archivo", sans-serif; letter-spacing: -.04em; }
    .kr { font: 700 30px/1.35 "HG Cosmos", "Noto Sans KR", sans-serif; }
    .layers { font: 400 14px "JetBrains Mono", monospace; letter-spacing: .1em; color: rgba(244,241,234,.65); }
  </style>`;
const TEXT = {
  meta: `SPECIMEN No. KG-0001`, coord: `37°29'06.7"N 126°59'44.5"E`,
  kr: "기록되지 않은 원석이 발견되었다.", layers: "LAYER 01–08 · KIGLE &amp; GLOBAL TEAM",
};

async function compose(file, width, height, body) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(BASE + "fonts/"); // 같은 출처의 HTML 페이지(폴더 목록)를 열어 폰트·이미지를 상대 경로로 사용
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="width:${width}px;height:${height}px">${body}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, file), type: "jpeg", quality: 90 });
  await page.close();
  console.log(`✓ ${file}`);
}

// 대표(직사각형): 왼쪽에 제목, 오른쪽에 원석
await compose("og-image.jpg", 1200, 630, `
  <div class="bg" style="background: url('assets/og-bg.png') 78% 12% / cover no-repeat"></div>
  <div class="shade" style="background: linear-gradient(90deg, rgba(5,5,5,.92) 0%, rgba(5,5,5,.75) 38%, rgba(5,5,5,0) 58%)"></div>
  <div style="position:absolute; left:64px; top:0; bottom:0; width:520px; display:flex; flex-direction:column; justify-content:center; gap:22px">
    <p class="meta">${TEXT.meta}<br>${TEXT.coord}</p>
    <h1 class="title">KIGLE<br>Excavation</h1>
    <p class="kr">${TEXT.kr}</p>
    <p class="layers" style="padding-top:18px; border-top:1px solid rgba(244,241,234,.25); width:440px">${TEXT.layers}</p>
  </div>`);

// 정사각형: 원석 가운데, 아래에 제목
await compose("og-image-square.jpg", 1200, 1200, `
  <div class="bg" style="background: url('assets/og-bg-center.png') 50% 0% / cover no-repeat"></div>
  <div class="shade" style="background: linear-gradient(180deg, rgba(5,5,5,.5) 0%, rgba(5,5,5,0) 10%, rgba(5,5,5,0) 62%, rgba(5,5,5,.92) 76%, #050505 100%)"></div>
  <p class="meta" style="position:absolute; top:44px; left:0; right:0; text-align:center; font-size:22px; text-shadow:0 1px 10px #000">${TEXT.meta} · ${TEXT.coord}</p>
  <div style="position:absolute; left:0; right:0; bottom:80px; display:flex; flex-direction:column; align-items:center; gap:24px; text-align:center">
    <h1 class="title" style="font-size:118px; text-shadow:0 2px 24px rgba(0,0,0,.8)">KIGLE Excavation</h1>
    <p class="kr" style="font-size:46px">${TEXT.kr}</p>
    <p class="layers" style="font-size:20px; letter-spacing:.12em">${TEXT.layers}</p>
  </div>`);

/* ---------- 2. 파비콘 ---------- */
{
  const page = await browser.newPage();
  await page.goto(BASE + "assets/favicon-src.png");
  // 브라우저 캔버스로 크기를 줄여 PNG 데이터로 받음 (가장자리 여백을 조금 잘라 작은 크기에서도 크게 보이게)
  const pngs = await page.evaluate(async sizes => {
    const img = document.querySelector("img");
    await img.decode();
    const crop = img.naturalWidth * 0.12;
    const src = img.naturalWidth - crop * 2;
    const out = {};
    for (const s of sizes) {
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(img, crop, crop, src, src, 0, 0, s, s);
      out[s] = c.toDataURL("image/png").split(",")[1];
    }
    return out;
  }, [16, 32, 48, 180, 512]);
  const buf = s => Buffer.from(pngs[s], "base64");

  await writeFile(path.join(root, "favicon-32.png"), buf(32));
  await writeFile(path.join(root, "apple-touch-icon.png"), buf(180));
  await writeFile(path.join(root, "icon-512.png"), buf(512));

  // .ico: PNG를 그대로 담는 형식 (16·32·48)
  const parts = [16, 32, 48].map(s => ({ s, data: buf(s) }));
  const header = Buffer.alloc(6 + 16 * parts.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(parts.length, 4);
  let offset = header.length;
  parts.forEach(({ s, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(s, e); header.writeUInt8(s, e + 1);
    header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  await writeFile(path.join(root, "favicon.ico"), Buffer.concat([header, ...parts.map(p => p.data)]));
  await page.close();
  console.log("✓ favicon.ico · favicon-32.png · apple-touch-icon.png · icon-512.png");
}

await browser.close();
