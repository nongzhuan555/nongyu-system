import bcrypt from "bcryptjs";
import { getEnv } from "../config/env.js";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, getEnv().BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
