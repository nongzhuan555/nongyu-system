import { useEffect } from "react";
import { registerWechatApp } from "@/lib/wechat";

/**
 * 冷启动注册微信 SDK（失败仅 warn，不渲染 UI）
 */
export function WechatBootstrapHost() {
  useEffect(() => {
    void registerWechatApp();
  }, []);

  return null;
}
