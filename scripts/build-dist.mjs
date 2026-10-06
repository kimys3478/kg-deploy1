// Cloudflare 배포용 dist 폴더 만들기
// 사이트에 필요한 파일만 "허용 목록"으로 복사합니다 (.env 등은 목록에 없으므로 절대 포함되지 않음)
// 사용법: node scripts/build-dist.mjs
import { cp, rm, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const FILES = [
  "index.html", "styles.css", "main.js", "content.js",
  "og-image.jpg", "og-image-square.jpg",
  "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-512.png",
  "fonts/HG-Cosmos.otf",
];
// assets 폴더에서는 사이트가 실제로 불러오는 이미지만
const ASSET_PATTERN = /^(min-\d\d-.+|world-(dusk|dawn))\.png$/;

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });
for (const f of FILES) await cp(path.join(root, f), path.join(dist, f), { recursive: true });
const assets = (await readdir(path.join(root, "assets"))).filter(f => ASSET_PATTERN.test(f));
for (const f of assets) await cp(path.join(root, "assets", f), path.join(dist, "assets", f));

console.log(`dist 준비 완료: 파일 ${FILES.length + assets.length}개 (assets ${assets.length}개)`);
