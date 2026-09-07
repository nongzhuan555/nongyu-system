#!/usr/bin/env node
/**
 * afterFileEdit: mark that this conversation edited source code,
 * so the stop hook can request a code-reviewer pass once.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CODE_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|go|sql|py|rs|css|scss|less|vue|svelte|kt|java|swift|m|mm|c|cc|cpp|h|hpp)$/i;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, "state");
const PENDING_PATH = path.join(STATE_DIR, "pending-review.json");

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function isSourceEdit(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/.cursor/hooks/")) return false;
  if (normalized.includes("/node_modules/")) return false;
  return CODE_EXT.test(normalized);
}

const raw = await readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.stdout.write("{}\n");
  process.exit(0);
}

const filePath = payload.file_path || "";
if (!isSourceEdit(filePath)) {
  process.stdout.write("{}\n");
  process.exit(0);
}

fs.mkdirSync(STATE_DIR, { recursive: true });

let pending = { conversation_id: null, files: [], updated_at: null };
try {
  if (fs.existsSync(PENDING_PATH)) {
    pending = JSON.parse(fs.readFileSync(PENDING_PATH, "utf8"));
  }
} catch {
  // reset below
}

const conversationId = payload.conversation_id || "unknown";
if (pending.conversation_id && pending.conversation_id !== conversationId) {
  pending = { conversation_id: conversationId, files: [], updated_at: null };
}

pending.conversation_id = conversationId;
pending.updated_at = new Date().toISOString();
const rel = path.relative(process.cwd(), filePath) || filePath;
if (!pending.files.includes(rel)) {
  pending.files.push(rel);
}
// keep marker small
if (pending.files.length > 80) {
  pending.files = pending.files.slice(-80);
}

fs.writeFileSync(PENDING_PATH, JSON.stringify(pending, null, 2), "utf8");
process.stdout.write("{}\n");
process.exit(0);
