// 사용법: node scripts/generate-images.mjs            (없는 이미지만 생성)
//         node scripts/generate-images.mjs --force    (전부 다시 생성)
//         node scripts/generate-images.mjs hero field (특정 이미지만)
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(root, ".env")); } catch {}

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
if (!KEY) { console.error("✗ .env 파일에 OPENAI_API_KEY를 넣어주세요."); process.exit(1); }

// 광물 텍스처: 3D 돌 표면에 감싸서 흐르게 만드는 용도 (가장자리가 자연스럽게 이어지도록)
const TEX = "full-frame macro photograph of a polished mineral surface, flat texture filling the entire frame edge to edge, no object outline, no background, seamless tileable texture, rich detail, no text, no watermark";
// 배경: 돌이 서 있는 세계. world-dawn은 world-dusk를 편집해 같은 풍경의 새벽으로 만듦
const WORLD = "wide cinematic landscape matte painting, empty gentle rolling hill in the center foreground where an object will stand, distant low mountains, sparse dry shrubs and small rocks, no people, no buildings, no text, soft atmospheric haze, high detail";
const IMAGES = {
  "min-01-solare":   { size: "1024x1024", prompt: `${TEX}. Amber crystal with trapped golden sunlight, honey and orange swirls, tiny bright inclusions, warm glow` },
  "min-02-strata":   { size: "1024x1024", prompt: `${TEX}. Pink sandstone strata, soft horizontal layered bands of rose, peach and cream sand, gentle wavy lines` },
  "min-03-nebulite": { size: "1024x1024", prompt: `${TEX}. Deep violet and indigo stone with nebula-like clouds, sparkling star-like specks, many overlapping translucent layers` },
  "min-04-ember":    { size: "1024x1024", prompt: `${TEX}. Volcanic lava ore, black basalt cracked with glowing molten orange and red veins` },
  "min-05-tidal":    { size: "1024x1024", prompt: `${TEX}. Teal and turquoise stone with flowing wave-like bands, like ocean currents frozen in rock, white foam streaks` },
  "min-06-verdan":   { size: "1024x1024", prompt: `${TEX}. Moss agate, deep green and olive organic dendrite patterns spreading like ink diffusing in water` },
  "min-07-lumen":    { size: "1024x1024", prompt: `${TEX}. Silvery blue labradorite with iridescent sheen, soft blended streaks of orange, teal and green beginning to mix` },
  "min-08-aurora":   { size: "1024x1024", prompt: `${TEX}. Opal-like stone holding an aurora: interwoven glowing bands of molten orange, turquoise teal and moss green with dawn pink and sunset gold highlights, iridescent` },
  "world-dusk":      { size: "1536x1024", prompt: `${WORLD}. Sunset at golden hour, deep orange and crimson sky, sun just below the horizon, warm dusty desert hills, long shadows, slightly dark moody tones` },
  "world-dawn":      { size: "1536x1024", edit: "world-dusk", prompt: "Keep the exact same landscape composition, hills, mountains, shrubs and framing. Change ONLY the time of day to early dawn: bright pastel sky in soft pink, peach and pale blue, fresh cool morning light, clear and hopeful." },
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
