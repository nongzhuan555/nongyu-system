import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "../../config/env.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";

function deriveKey(): Buffer {
  const secret = getEnv().LLM_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new AppError(ErrorCodes.LLM_POOL_UNAVAILABLE, "平台模型密钥加密未配置", 503);
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

/**
 * AES-256-GCM；存储格式 v1:iv:tag:ciphertext（各段 base64）
 */
export function encryptApiKey(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptApiKey(stored: string): string {
  const key = deriveKey();
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new AppError(ErrorCodes.INTERNAL, "密钥密文格式无效", 500);
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64!, "base64");
  const tag = Buffer.from(tagB64!, "base64");
  const data = Buffer.from(dataB64!, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function suffixOf(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 4) return trimmed.padStart(4, "*");
  return trimmed.slice(-4);
}
