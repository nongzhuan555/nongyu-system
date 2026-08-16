import { Router } from "express";
import { asyncHandler } from "../../middlewares/common.js";
import { handleChatCompletions } from "./proxy.js";
import { reportLlmProxyFailFromRequest } from "./reportFail.js";

export const appLlmRouter = Router();

appLlmRouter.post(
  "/chat/completions",
  asyncHandler(async (req, res) => {
    try {
      await handleChatCompletions(req, res);
    } catch (err) {
      reportLlmProxyFailFromRequest(req, err);
      throw err;
    }
  }),
);
