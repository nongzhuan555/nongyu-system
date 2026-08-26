import { describe, expect, it } from "vitest";
import { DEV_CORS_ORIGINS, parseCorsOriginEnv, resolveCorsOrigins } from "../src/config/cors.js";

describe("cors config", () => {
  it("parseCorsOriginEnv treats * as allow-all", () => {
    expect(parseCorsOriginEnv("*")).toBe("allow-all");
  });

  it("parseCorsOriginEnv treats empty as use-defaults", () => {
    expect(parseCorsOriginEnv("")).toBe("use-defaults");
    expect(parseCorsOriginEnv("   ")).toBe("use-defaults");
  });

  it("parseCorsOriginEnv splits comma-separated whitelist", () => {
    expect(parseCorsOriginEnv("http://localhost:5173, https://8.137.82.17")).toEqual([
      "http://localhost:5173",
      "https://8.137.82.17",
    ]);
  });

  it("parseCorsOriginEnv rejects invalid origin", () => {
    expect(() => parseCorsOriginEnv("not-a-url")).toThrow(/Invalid CORS_ORIGIN/);
  });

  it("resolveCorsOrigins uses dev defaults when empty in development", () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGIN: "",
        NODE_ENV: "development",
      }),
    ).toEqual([...DEV_CORS_ORIGINS]);
  });

  it("resolveCorsOrigins denies cross-origin when empty in production", () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGIN: "",
        NODE_ENV: "production",
      }),
    ).toEqual([]);
  });

  it("resolveCorsOrigins honors explicit whitelist in production", () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGIN: "http://101.43.34.229",
        NODE_ENV: "production",
      }),
    ).toEqual(["http://101.43.34.229"]);
  });
});
