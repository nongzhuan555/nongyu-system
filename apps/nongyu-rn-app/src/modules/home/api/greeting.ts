import { appFetch } from "@/api/appClient";

export type HomeGreetingPayload = {
  id: number;
  message: string;
};

/**
 * GET /api/app/home/greeting —— 当前启用的首页第二句问候语
 */
export async function fetchHomeGreeting(): Promise<HomeGreetingPayload | null> {
  return appFetch<HomeGreetingPayload | null>("/api/app/home/greeting", {
    method: "GET",
    allowNullData: true,
  });
}
