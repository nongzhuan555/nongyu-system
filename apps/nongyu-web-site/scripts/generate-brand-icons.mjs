/**
 * 与农屿 App 同源：从 nongyu-rn-app/assets/icon.png 生成官网 favicon / apple-touch-icon
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconSrc = path.resolve(root, "../nongyu-rn-app/assets/icon.png");
const publicDir = path.join(root, "public");

async function main() {
  await sharp(iconSrc)
    .resize(48, 48, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "favicon.png"));

  await sharp(iconSrc)
    .resize(180, 180, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  console.log(
    "[generate-brand-icons] favicon.png (48) + apple-touch-icon.png (180) from RN icon.png",
  );
}

main().catch((err) => {
  console.error("[generate-brand-icons] failed:", err);
  process.exit(1);
});
