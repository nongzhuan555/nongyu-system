import { z } from "zod";
import { tool } from "../src/core/tool";
import {
  SHOW_UI_DESCRIPTION,
  SHOW_UI_PARAM,
  extractAndStripShowUI,
  injectShowUIIntoJsonSchema,
  resolveShowUI,
  shouldShowToolUI,
} from "../src/core/tool/show-ui";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// --- resolveShowUI ---
assert(resolveShowUI(undefined) === true, "undefined → true");
assert(resolveShowUI(null) === true, "null → true");
assert(resolveShowUI("x") === true, "invalid → true");
assert(resolveShowUI(true) === true, "true → true");
assert(resolveShowUI(false) === false, "false → false");

// --- extractAndStripShowUI ---
{
  const a = extractAndStripShowUI({ keyword: "a", showUI: false });
  assert(a.showUI === false, "extract false");
  assert(
    JSON.stringify(a.input) === JSON.stringify({ keyword: "a" }),
    `strip showUI, got ${JSON.stringify(a.input)}`,
  );
}
{
  const b = extractAndStripShowUI({ keyword: "b" });
  assert(b.showUI === true, "omit → true");
  assert(JSON.stringify(b.input) === JSON.stringify({ keyword: "b" }), "omit keeps input");
}
{
  const c = extractAndStripShowUI({ showUI: "nope", x: 1 });
  assert(c.showUI === true, "invalid showUI → true");
  assert(!(SHOW_UI_PARAM in (c.input as object)), "still stripped");
}

// --- inject / tool.toJSONSchema ---
{
  const withRender = tool({
    name: "demo_card",
    description: "demo",
    inputSchema: z.object({ q: z.string() }),
    render: { component: "DemoCard" },
    async execute() {
      return { ok: true };
    },
  });
  const schema = withRender.toJSONSchema();
  const props = schema.properties as Record<string, Record<string, unknown>>;
  assert(props.q?.type === "string", "business field kept");
  assert(props[SHOW_UI_PARAM]?.type === "boolean", "showUI injected");
  assert(props[SHOW_UI_PARAM]?.description === SHOW_UI_DESCRIPTION, "showUI describe");
  const required = schema.required as string[] | undefined;
  assert(!required?.includes(SHOW_UI_PARAM), "showUI not required");
}

{
  const plain = tool({
    name: "demo_plain",
    description: "no render",
    inputSchema: z.object({ q: z.string() }),
    async execute() {
      return { ok: true };
    },
  });
  const schema = plain.toJSONSchema();
  const props = schema.properties as Record<string, unknown>;
  assert(!(SHOW_UI_PARAM in props), "no inject without render");
}

{
  const conflict = injectShowUIIntoJsonSchema(
    {
      type: "object",
      properties: {
        showUI: { type: "string", description: "business" },
      },
    },
    { toolName: "conflict_tool" },
  );
  const props = conflict.properties as Record<string, Record<string, unknown>>;
  assert(props.showUI.type === "string", "conflict skip inject");
}

// --- shouldShowToolUI ---
assert(shouldShowToolUI({}) === true, "missing → show");
assert(shouldShowToolUI({ showUI: true }) === true, "true → show");
assert(shouldShowToolUI({ showUI: false }) === false, "false → hide");

// --- execute 收不到 showUI ---
{
  let seen: unknown;
  const t = tool({
    name: "exec_check",
    description: "d",
    inputSchema: z.object({ q: z.string() }),
    render: { component: "X" },
    async execute(input) {
      seen = input;
      return input;
    },
  });
  const { showUI, input } = extractAndStripShowUI({ q: "hi", showUI: false });
  assert(showUI === false, "pre-strip false");
  void (await t.execute(input as { q: string }, {
    abortSignal: new AbortController().signal,
    emit: () => {},
    agentName: "test",
  }));
  assert(JSON.stringify(seen) === JSON.stringify({ q: "hi" }), "execute no showUI");
}

console.log("show-ui.test.ts passed");
