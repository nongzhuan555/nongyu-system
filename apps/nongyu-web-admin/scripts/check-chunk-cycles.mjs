import fs from "node:fs";
import path from "node:path";

const dir = "dist/assets";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
let bad = 0;
for (const f of files) {
  if (f.startsWith("index-")) continue;
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  const hits = [...s.matchAll(/from"(\.\/index-[^"]+)"/g)].map((m) => m[1]);
  if (hits.length) {
    bad += 1;
    console.log("BAD", f, "->", hits.join(","));
  }
}
console.log(
  bad === 0 ? "OK: no non-entry chunk imports entry" : `FAIL: ${bad} chunks import entry`,
);

const html = fs.readFileSync("dist/index.html", "utf8");
console.log(
  "entry preloads:\n",
  [...html.matchAll(/href="([^"]*assets[^"]+)"/g)].map((m) => m[1]).join("\n"),
);
const entry = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
if (entry) {
  const size = fs.statSync(path.join(dir, entry)).size;
  console.log("entry", entry, Math.round(size / 1024) + "KB");
}
