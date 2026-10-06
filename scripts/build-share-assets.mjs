// 링크 공유용 이미지 만들기
//  1) og-image.jpg  : assets/og-bg.png(이미지 모델 생성) 위에 제목·좌표·문구를 얹어 1200×630으로
//  2) 파비콘        : assets/favicon-src.png → favicon.ico(16·32·48), favicon-32.png, apple-touch-icon.png(180), icon-512.png
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

/* ---------- 1. OG 이미지 ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(BASE + "fonts/"); // 같은 출처의 HTML 페이지(폴더 목록)를 열어 폰트·이미지를 상대 경로로 사용
  await page.setContent(`<!doctype html><html><head><base href="${BASE}">
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
    <style>
      @font-face { font-family: "HG Cosmos"; src: url("fonts/HG-Cosmos.otf") format("opentype"); }
      html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #050505; }
      .bg { position: absolute; inset: 0; background: url("assets/og-bg.png") 78% 12% / cover no-repeat; }
      .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5,5,5,.92) 0%, rgba(5,5,5,.75) 38%, rgba(5,5,5,0) 58%); }
      .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 520px; display: flex; flex-direction: column; justify-content: center; gap: 22px; color: #f4f1ea; }
      .meta { font: 400 15px/1.6 "JetBrains Mono", monospace; letter-spacing: .06em; color: #ffb347; margin: 0; }
      .title { font: 900 96px/.9 "Archivo", sans-serif; letter-spacing: -.04em; margin: 0; }
      .kr { font: 700 30px/1.35 "HG Cosmos", "Noto Sans KR", sans-serif; margin: 0; }
      .layers { font: 400 14px "JetBrains Mono", monospace; letter-spacing: .1em; color: rgba(244,241,234,.65); margin: 0;
        padding-top: 18px; border-top: 1px solid rgba(244,241,234,.25); width: 440px; }
    </style></head><body>
      <div class="bg"></div><div class="shade"></div>
      <div class="text">
        <p class="meta">SPECIMEN No. KG-0001<br>37°29'06.7"N 126°59'44.5"E</p>
        <h1 class="title">KIGLE<br>Excavation</h1>
        <p class="kr">기록되지 않은 원석이 발견되었다.</p>
        <p class="layers">LAYER 01–08 · KIGLE &amp; GLOBAL TEAM</p>
      </div>
    </body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, "og-image.jpg"), type: "jpeg", quality: 90 });
  await page.close();
  console.log("✓ og-image.jpg");
}

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
