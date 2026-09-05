/**
 * 官网 RUM 运行时配置（部署时复制为 /rum-config.js 并填入 siteKey）。
 * 与 Track 的 TRACK_WEB_SITE_KEY / WEB_SITE_KEY 保持一致。
 * url 可省略：客户端默认 /v1/track/web/events（官网 Nginx 反代 Track）。
 */
window.__NONGYU_RUM__ = {
  // url: "/v1/track/web/events",
  siteKey: "REPLACE_WITH_TRACK_WEB_SITE_KEY",
};
