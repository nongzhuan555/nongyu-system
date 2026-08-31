import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { parseAppToken } from "../auth/jwt.js";
import { writeFail } from "./respond.js";
import { Limiter, clientIP } from "./rateLimit.js";

export type AppAuth = { userId: number; studentNo: string };

declare module "fastify" {
  interface FastifyRequest {
    appAuth?: AppAuth;
    requestId?: string;
  }
}

function tokenEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function bearer(req: FastifyRequest): string {
  const h = req.headers.authorization ?? "";
  if (!h.toLowerCase().startsWith("bearer ")) return "";
  return h.slice(7).trim();
}

export function buildAuthPlugins(opts: {
  jwtSecret: string;
  internalToken: string;
  webSiteKey: string;
  ipLimiter: Limiter;
  userLimiter: Limiter;
}) {
  // fastify-plugin 打破封装，使 hook 作用于同级 register 的路由
  const requestIdPlugin = fp(async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      const id =
        (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim()) ||
        new Date().toISOString();
      req.requestId = id;
      void reply.header("X-Request-Id", id);
    });
  });

  const ipRatePlugin = fp(async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      const ip = clientIP(req.headers as Record<string, unknown>, req.socket.remoteAddress);
      if (!opts.ipLimiter.allow(`ip:${ip}`)) {
        writeFail(reply, 429, "RATE_LIMITED", "too many requests");
        throw new Error("rate_limited");
      }
    });
  });

  const appJwtPlugin = fp(async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      const raw = bearer(req);
      if (!raw) {
        writeFail(reply, 401, "UNAUTHORIZED", "missing bearer token");
        throw new Error("unauthorized");
      }
      try {
        const claims = await parseAppToken(raw, opts.jwtSecret);
        req.appAuth = { userId: claims.uid, studentNo: claims.studentNo };
      } catch {
        writeFail(reply, 401, "UNAUTHORIZED", "invalid token");
        throw new Error("unauthorized");
      }
    });
  });

  const userRatePlugin = fp(async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      const uid = req.appAuth?.userId ?? 0;
      if (uid > 0 && !opts.userLimiter.allow(`u:${uid}`)) {
        writeFail(reply, 429, "RATE_LIMITED", "too many requests");
        throw new Error("rate_limited");
      }
    });
  });

  const internalTokenPlugin = fp(async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      const got = String(req.headers["x-internal-token"] ?? "");
      if (!tokenEqual(got, opts.internalToken)) {
        writeFail(reply, 403, "FORBIDDEN", "invalid internal token");
        throw new Error("forbidden");
      }
    });
  });

  const webSiteKeyPlugin = fp(async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      if (!opts.webSiteKey) {
        writeFail(reply, 403, "FORBIDDEN", "web ingest disabled");
        throw new Error("forbidden");
      }
      const got = String(req.headers["x-site-key"] ?? "");
      if (!tokenEqual(got, opts.webSiteKey)) {
        writeFail(reply, 401, "UNAUTHORIZED", "invalid site key");
        throw new Error("unauthorized");
      }
    });
  });

  return {
    requestIdPlugin,
    ipRatePlugin,
    appJwtPlugin,
    userRatePlugin,
    internalTokenPlugin,
    webSiteKeyPlugin,
  };
}
