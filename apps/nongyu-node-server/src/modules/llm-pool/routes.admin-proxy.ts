import { Router } from "express";
import { asyncHandler } from "../../middlewares/common.js";
import { requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { handleChatCompletions } from "./proxy.js";
import { reportLlmProxyFailFromRequest } from "./reportFail.js";

/** 管理端平台 LLM 代理，与 App completions 共用调度。 */
export const adminLlmChatRouter = Router();

adminLlmChatRouter.post(
  "/chat/completions",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      await handleChatCompletions(req, res);
    } catch (err) {
      reportLlmProxyFailFromRequest(req, err);
      throw err;
    }
  }),
);
