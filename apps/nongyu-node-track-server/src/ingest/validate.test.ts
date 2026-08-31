import { describe, expect, it } from "vitest";
import { validateOne } from "../ingest/validate.js";

describe("validateOne", () => {
  it("rejects bad type", () => {
    const r = validateOne({ event_id: "e1", event_type: "nope", event_name: "x" });
    expect(r.error?.code).toBe("INVALID_TYPE");
  });

  it("truncates huge props", () => {
    const s = "a".repeat(5000);
    const r = validateOne({
      event_id: "e1",
      event_type: "crash",
      event_name: "js",
      props: { message: s },
    });
    expect(r.error).toBeUndefined();
    expect(r.fields!.propsJson).toContain('"_truncated":true');
  });

  it("accepts ok event", () => {
    const r = validateOne({
      event_id: "550e8400-e29b-41d4-a716-446655440000",
      event_type: "screen_view",
      event_name: "home",
      platform: "android",
    });
    expect(r.error).toBeUndefined();
    expect(r.fields!.eventName).toBe("home");
  });

  it("accepts llm_proxy_fail", () => {
    const r = validateOne({
      event_id: "550e8400-e29b-41d4-a716-446655440001",
      event_type: "llm_proxy_fail",
      event_name: "50210",
    });
    expect(r.error).toBeUndefined();
    expect(r.fields!.eventType).toBe("llm_proxy_fail");
  });
});
