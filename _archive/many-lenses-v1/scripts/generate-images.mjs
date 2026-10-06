// 사용법: node scripts/generate-images.mjs            (없는 이미지만 생성)
//         node scripts/generate-images.mjs --force    (전부 다시 생성)
//         node scripts/generate-images.mjs hero field (특정 이미지만)
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 보관 폴더(_archive/many-lenses-v1)로 옮겨졌으므로 AI_Week1 루트의 .env도 찾아봄
for (const dir of [root, path.resolve(root, "..", "..")]) {
  try { process.loadEnvFile(path.join(dir, ".env")); break; } catch {}
}

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
if (!KEY) { console.error("✗ .env 파일에 OPENAI_API_KEY를 넣어주세요."); process.exit(1); }

const STYLE = "minimal editorial photography, soft even studio light, muted desaturated tones, clean light grey background, high detail, no text, no logos, no watermark";
const BW = "black and white fine-art photograph, high contrast, deep blacks, grain, no text, no logos";

// 히어로: hero-0을 먼저 만든 뒤, 같은 인물에서 안경만 바꾼 편집본(hero-1~5)을 만듭니다
const SAME = "Keep the exact same person, face, hair, pose, clothing, framing, lighting and background. Change ONLY the eyewear to";
const IMAGES = {
  "hero-0":    { size: "1024x1536", prompt: `Head-and-shoulders studio portrait of a fictional friendly professional in their early 30s, dark hair, black crew-neck top, calm confident half-smile, looking straight at camera, wearing thin round gold wire-frame glasses, centered, ${STYLE}` },
  "hero-1":    { size: "1024x1536", edit: "hero-0", prompt: `${SAME} thick black rectangular acetate glasses.` },
  "hero-2":    { size: "1024x1536", edit: "hero-0", prompt: `${SAME} red cat-eye glasses.` },
  "hero-3":    { size: "1024x1536", edit: "hero-0", prompt: `${SAME} large round tortoiseshell glasses.` },
  "hero-4":    { size: "1024x1536", edit: "hero-0", prompt: `${SAME} silver aviator glasses with light blue tinted lenses.` },
  "hero-5":    { size: "1024x1536", edit: "hero-0", prompt: `${SAME} bold oversized white futuristic shield sunglasses.` },
  "card-1":    { size: "1024x1536", prompt: `Top view of a planning board with blank sticky notes and index cards arranged in columns, ${STYLE}` },
  "card-2":    { size: "1024x1536", prompt: `A neat stack of printed script pages held by a black binder clip, text blurred and unreadable, ${STYLE}` },
  "card-3":    { size: "1024x1536", prompt: `A wooden card catalog drawer filled with blank index cards with alphabet tab dividers, ${STYLE}` },
  "card-4":    { size: "1024x1536", prompt: `Two printed documents side by side on a desk with a pen between them, text blurred and unreadable, ${STYLE}` },
  "card-5":    { size: "1024x1536", prompt: `A red pen and a magnifying loupe resting on printed pages, text blurred and unreadable, ${STYLE}` },
  "card-6":    { size: "1024x1536", prompt: `A small vintage desk globe beside a closed laptop, still life, ${STYLE}` },
  "hero":      { size: "1024x1536", prompt: `Studio portrait of a fictional young creative person wearing a black jacket and bold oversized black sunglasses, playful expression, centered, ${STYLE}` },
  "thing-1":   { size: "1024x1536", prompt: `A stack of well-read hardcover books with a bookmark, still life, ${STYLE}` },
  "thing-2":   { size: "1024x1536", prompt: `A vintage-style film camera without branding on a plain surface, still life, ${STYLE}` },
  "thing-3":   { size: "1024x1536", prompt: `An open sketchbook with pencil line drawings of circles and grids, a pencil beside it, ${STYLE}` },
  "thing-4":   { size: "1024x1536", prompt: `A minimalist mechanical keyboard with blank keycaps, top view, ${STYLE}` },
  "thing-5":   { size: "1024x1536", prompt: `A small potted green plant in a white ceramic pot, still life, ${STYLE}` },
  "thing-6":   { size: "1024x1536", prompt: `A ceramic cup of black coffee with steam on a saucer, still life, ${STYLE}` },
  "strip-1":   { size: "1024x1536", prompt: `Faded old childhood photograph of building blocks on a wooden floor, warm vintage film look, no people, no text` },
  "strip-2":   { size: "1024x1536", prompt: `Faded vintage photograph of a disassembled radio with tiny screws and parts, warm film look, no text` },
  "strip-3":   { size: "1024x1536", prompt: `Faded vintage photograph of crayon drawings pinned on a wall, warm film look, no text` },
  "field":     { size: "1536x1024", prompt: `Wide field of dandelion seed heads at night, shallow depth of field, ${BW}` },
  "project-1": { size: "1024x1024", prompt: `A laptop on a desk showing an abstract minimal website layout with grey blocks, ${STYLE}` },
  "project-2": { size: "1024x1024", prompt: `Brand identity mockup with blank coffee cups, paper bags and business cards in cream and black, no readable text, ${STYLE}` },
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter(a => !a.startsWith("--"));
const names = only.length ? only : Object.keys(IMAGES);
const outDir = path.join(root, "assets");
await mkdir(outDir, { recursive: true });

const exists = f => access(f).then(() => true, () => false);

async function generate(name) {
  const spec = IMAGES[name];
  if (!spec) { console.warn(`? 알 수 없는 이미지: ${name}`); return; }
  const file = path.join(outDir, `${name}.png`);
  if (!force && await exists(file)) { console.log(`- ${name} (이미 있음, 건너뜀)`); return; }

  let res;
  if (spec.edit) {
    // 기존 이미지를 바탕으로 일부만 바꾸는 편집 요청
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", spec.prompt);
    form.append("size", spec.size);
    form.append("image", new Blob([await readFile(path.join(outDir, `${spec.edit}.png`))], { type: "image/png" }), `${spec.edit}.png`);
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
    });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, prompt: spec.prompt, size: spec.size, n: 1 }),
    });
  }
  const json = await res.json();
  if (!res.ok) throw new Error(`${name}: ${json.error?.message || res.status}`);

  const item = json.data?.[0];
  let buf;
  if (item?.b64_json) buf = Buffer.from(item.b64_json, "base64");
  else if (item?.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  else throw new Error(`${name}: 응답에 이미지가 없어요`);

  await writeFile(file, buf);
  console.log(`✓ ${name}`);
}

console.log(`모델: ${MODEL} · ${names.length}개 이미지`);
let failed = 0;
async function runAll(list) {
  const queue = [...list];
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const n = queue.shift();
      try { await generate(n); } catch (e) { failed++; console.error(`✗ ${e.message}`); }
    }
  }));
}
// 편집본은 원본 이미지가 준비된 다음에 실행
await runAll(names.filter(n => !IMAGES[n]?.edit));
await runAll(names.filter(n => IMAGES[n]?.edit));
console.log(failed ? `완료 (실패 ${failed}개)` : "완료");
process.exit(failed ? 1 : 0);
