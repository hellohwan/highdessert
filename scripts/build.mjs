// Build situs untuk deploy:
//   1. Minify style.css, script.js, motion.js, i18n.js -> *.min.*
//   2. Salin situs ke _site/
//   3. Tambahkan ?v=<hash isi file> ke setiap referensi CSS/JS/gambar/font/video
//      supaya pengunjung langsung dapat file baru setelah deploy (tidak tertahan cache).
//
// Pakai lokal: npm install && npm run build   (hasil di _site/, file .min.* di root ikut diperbarui)

import { build } from "esbuild";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "_site");

// 1. Minify
const sources = ["style.css", "script.js", "motion.js", "i18n.js"];
for (const src of sources) {
  const ext = path.extname(src);
  const out = src.replace(ext, ".min" + ext);
  await build({
    entryPoints: [path.join(ROOT, src)],
    outfile: path.join(ROOT, out),
    minify: true,
    bundle: false,
    target: ext === ".css" ? ["chrome90", "safari14", "firefox90"] : "es2018",
    logLevel: "error",
  });
  console.log(`minify  ${src} -> ${out}`);
}

// 2. Salin ke _site (tanpa file pengembangan)
const SKIP = new Set([".git", ".github", ".vscode", "node_modules", "_site", "scripts",
  "package.json", "package-lock.json", ".gitignore", ".DS_Store", "README.md",
  ...sources]);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const name of fs.readdirSync(ROOT)) {
  if (SKIP.has(name)) continue;
  fs.cpSync(path.join(ROOT, name), path.join(OUT, name), {
    recursive: true,
    filter: (p) => path.basename(p) !== ".DS_Store",
  });
}
// .nojekyll: file disajikan apa adanya
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// 3. Versi otomatis berdasarkan isi file
const hashCache = new Map();
function versionOf(rel) {
  if (hashCache.has(rel)) return hashCache.get(rel);
  const file = path.join(OUT, rel);
  let v = null;
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    v = createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
  }
  hashCache.set(rel, v);
  return v;
}

// cocokkan path lokal: assets/... atau file *.min.css/js di root, dengan ?query lama opsional
const REF = /((?:\.\/)?(?:assets\/[A-Za-z0-9_\-./%]+|[A-Za-z0-9_\-]+\.min\.(?:css|js)))(\?v=[A-Za-z0-9_.\-]*)?/g;

function stamp(text) {
  return text.replace(REF, (m, p) => {
    const rel = decodeURIComponent(p.replace(/^\.\//, ""));
    const v = versionOf(rel);
    return v ? `${p}?v=${v}` : m;
  });
}

// CSS & JS dulu (hash-nya berubah setelah di-stamp, jadi HTML dihitung sesudahnya)
const minFiles = fs.readdirSync(OUT).filter((f) => /\.min\.(css|js)$/.test(f));
for (const f of minFiles) {
  const p = path.join(OUT, f);
  fs.writeFileSync(p, stamp(fs.readFileSync(p, "utf8")));
}
hashCache.clear();

let count = 0;
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith(".html"))) {
  const p = path.join(OUT, f);
  const before = fs.readFileSync(p, "utf8");
  const after = stamp(before);
  if (after !== before) { fs.writeFileSync(p, after); count++; }
}
console.log(`versi   ${count} halaman HTML diberi ?v=hash`);
console.log(`selesai -> ${path.relative(process.cwd(), OUT) || OUT}`);
