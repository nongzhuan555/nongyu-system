import fs from "node:fs";
import path from "node:path";

const dir = "dist/assets";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
const entry = files.find((f) => f.startsWith("index-"));
console.log("=== JS chunks ===");
for (const f of files.sort()) {
  const kb = Math.round(fs.statSync(path.join(dir, f)).size / 1024);
  console.log(String(kb).padStart(5) + "KB  " + f);
}
const html = fs.readFileSync("dist/index.html", "utf8");
console.log("\n=== index.html modulepreload / script ===");
for (const m of html.matchAll(/(?:src|href)="([^"]*assets[^"]+)"/g)) {
  console.log(m[1]);
}
if (entry) {
  console.log("\n=== non-entry → entry imports ===");
  let bad = 0;
  for (const f of files) {
    if (f === entry) continue;
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    if (s.includes(`from"./${entry}"`) || s.includes(`from'./${entry}'`)) {
      bad += 1;
      console.log("CIRCULAR", f, "→", entry);
    }
  }
  if (!bad) console.log("none");
}
