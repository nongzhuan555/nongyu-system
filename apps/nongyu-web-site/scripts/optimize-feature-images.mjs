/**
 * 构建前：assets/feature-screens 源图 → public/features/*.webp（限宽 + 压缩）
 * 站点只引用 webp；换图请改源文件后重新 build。
 */
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets", "feature-screens");
const outDir = path.join(root, "public", "features");

const MAX_WIDTH = 900;
const WEBP_QUALITY = 82;

const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png"]);

async function main() {
  await mkdir(outDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const sources = entries.filter(
    (e) => e.isFile() && SOURCE_EXT.has(path.extname(e.name).toLowerCase()),
  );

  if (sources.length === 0) {
    console.warn("[optimize-feature-images] no sources in assets/feature-screens");
    return;
  }

  for (const entry of sources) {
    const base = path.basename(entry.name, path.extname(entry.name));
    const input = path.join(sourceDir, entry.name);
    const output = path.join(outDir, `${base}.webp`);
    await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(output);
    const { size } = await stat(output);
    console.log(
      `[optimize-feature-images] ${entry.name} → features/${base}.webp (${Math.round(size / 1024)} KB)`,
    );
  }
}

main().catch((err) => {
  console.error("[optimize-feature-images] failed:", err);
  process.exit(1);
});
