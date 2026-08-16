import type { Response } from "express";
import { ErrorCodes } from "./errors.js";

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T | null;
};

export function ok<T>(res: Response, data: T, message = "ok") {
  const body: ApiResponse<T> = { code: ErrorCodes.OK, message, data };
  return res.status(200).json(body);
}

export function fail(
  res: Response,
  httpStatus: number,
  code: number,
  message: string,
  data: unknown | null = null,
) {
  const body: ApiResponse<unknown> = { code, message, data };
  return res.status(httpStatus).json(body);
}
