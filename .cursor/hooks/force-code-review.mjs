#!/usr/bin/env node
/**
 * stop: if this conversation edited source code, inject one follow-up that
 * forces the parent agent to launch subagent_type=code-reviewer.
 *
 * Hooks cannot spawn Task/subagents directly — only followup_message works.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_PATH = path.join(__dirname, "state", "pending-review.json");

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function clearPending() {
  try {
    if (fs.existsSync(PENDING_PATH)) fs.unlinkSync(PENDING_PATH);
  } catch {
    // ignore
  }
}

const raw = await readStdin();
let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.stdout.write("{}\n");
  process.exit(0);
}

const status = payload.status;
const loopCount = Number(payload.loop_count ?? 0);
const conversationId = payload.conversation_id || "unknown";

// Only auto-continue once after a successful coding turn.
if (status !== "completed" || loopCount !== 0) {
  if (loopCount > 0) clearPending();
  process.stdout.write("{}\n");
  process.exit(0);
}

let pending = null;
try {
  if (fs.existsSync(PENDING_PATH)) {
    pending = JSON.parse(fs.readFileSync(PENDING_PATH, "utf8"));
  }
} catch {
  pending = null;
}

if (
  !pending ||
  !Array.isArray(pending.files) ||
  pending.files.length === 0 ||
  (pending.conversation_id &&
    pending.conversation_id !== "unknown" &&
    conversationId !== "unknown" &&
    pending.conversation_id !== conversationId)
) {
  process.stdout.write("{}\n");
  process.exit(0);
}

const fileList = pending.files.slice(0, 40).join("\n- ");
clearPending();

const followup = `[Cursor Hook · post-coding AI review]

This turn edited source files. You MUST now launch exactly ONE Task tool call before doing anything else:

- subagent_type: "code-reviewer"
- description: "Code Review"
- run_in_background: false
- prompt: Review the uncommitted + staged changes vs HEAD for this coding turn (default scope). Follow the code-reviewer agent instructions and repo .cursor/BUGBOT.md. Load path-mapped skills. Readonly: do NOT edit files, do NOT commit/push. Return the standard ## AI Code Review report.

Edited files (hint, not exclusive scope):
- ${fileList}

After the subagent returns: summarize Critical/High findings to the user in Chinese, then STOP.
Do not start new features. Do not launch a second code-reviewer. Do not claim the review ran without calling Task.`;

process.stdout.write(JSON.stringify({ followup_message: followup }) + "\n");
process.exit(0);
