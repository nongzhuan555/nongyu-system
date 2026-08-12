import type { AppTokenClaims, AdminTokenClaims } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      appAuth?: AppTokenClaims;
      adminAuth?: AdminTokenClaims;
    }
  }
}

export {};
