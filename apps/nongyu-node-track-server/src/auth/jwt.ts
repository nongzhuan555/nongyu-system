import { jwtVerify } from "jose";

/** 一期只强制 uid + typ=app；不校验 tokenVersion。 */
export type AppClaims = {
  uid: number;
  studentNo: string;
};

function asInt64(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 校验 HS256 签名、exp、typ=app，并解析数字 uid。 */
export async function parseAppToken(tokenString: string, secret: string): Promise<AppClaims> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(tokenString, key, {
    algorithms: ["HS256"],
  });
  if (payload.typ !== "app") {
    throw new Error("invalid token typ");
  }
  const uid = asInt64(payload.uid);
  if (uid === null || uid <= 0) {
    throw new Error("invalid uid");
  }
  const studentNo = typeof payload.studentNo === "string" ? payload.studentNo : "";
  return { uid, studentNo };
}
