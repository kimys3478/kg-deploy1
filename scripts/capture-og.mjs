// 링크 공유용 OG 이미지(1200×630) 캡처
// 사용법: 미리보기 서버(localhost:5173)를 켠 상태에서  node scripts/capture-og.mjs
// Playwright는 전역 설치본을 사용 (npm install -g playwright)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const globalRoot = execSync("npm root -g").toString().trim();
const { chromium } = createRequire(path.join(globalRoot, "/"))("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "og-image.jpg");

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 렌더 패스 창 6개가 모두 쌓인 분석 장면으로 이동
await page.evaluate(() => window.__seek(5.3));
await page.waitForTimeout(2500);

// 캡처용 편집: HUD를 숨기고, 창들을 오른쪽으로 밀고, 왼쪽에 제목 영역을 얹음
await page.evaluate(() => {
  document.querySelectorAll(".hud, #intro").forEach(el => (el.style.display = "none"));
  const shift = "translateX(230px)";
  document.querySelector("#windows").style.transform = shift;
  document.querySelector(".win--beauty").style.translate = "230px 0";

  const og = document.createElement("div");
  og.innerHTML = `
    <div class="og-shade"></div>
    <div class="og-text">
      <p class="og-meta">SPECIMEN No. KG-0001<br>37°29'06.7"N 126°59'44.5"E</p>
      <h1 class="og-title">KIGLE<br>Excavation</h1>
      <p class="og-kr">기록되지 않은 원석이 발견되었다.</p>
      <p class="og-layers">LAYER 01–08 · KIGLE &amp; GLOBAL TEAM</p>
    </div>`;
  const css = document.createElement("style");
  css.textContent = `
    .og-shade { position: fixed; inset: 0; z-index: 90;
      background: linear-gradient(90deg, #050505 0%, #050505 34%, rgba(5,5,5,.85) 46%, rgba(5,5,5,0) 62%); }
    .og-text { position: fixed; left: 64px; top: 0; bottom: 0; z-index: 91; width: 460px;
      display: flex; flex-direction: column; justify-content: center; gap: 22px; color: #f4f1ea; }
    .og-meta { font: 400 15px/1.6 "JetBrains Mono", monospace; letter-spacing: .06em; color: #ffb347; margin: 0; }
    .og-title { font: 900 92px/.9 "Archivo", sans-serif; letter-spacing: -.04em; margin: 0; }
    .og-kr { font: 700 30px/1.35 "HG Cosmos", "Noto Sans KR", sans-serif; margin: 0; }
    .og-layers { font: 400 14px "JetBrains Mono", monospace; letter-spacing: .1em; color: rgba(244,241,234,.6); margin: 0;
      padding-top: 18px; border-top: 1px solid rgba(244,241,234,.25); }`;
  document.head.append(css);
  document.body.append(og);
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

await page.screenshot({ path: out, type: "jpeg", quality: 90 });
await browser.close();
console.log("저장:", out);
