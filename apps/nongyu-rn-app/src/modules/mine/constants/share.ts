/**
 * 分享农屿：文案与微信开放平台配置（与旧版 ShareSheet 对齐）
 */
import { ABOUT_URL } from "./services";

/** 微信开放平台移动应用 AppID */
export const WECHAT_APP_ID = "wx174b5a4d92447b73";

/** iOS Universal Link（registerApp；本期 Android 优先验收） */
export const WECHAT_UNIVERSAL_LINK = "https://nongyu.app/";

/** 分享落地页（与「关于农屿」同源） */
export const SHARE_WEBPAGE_URL = ABOUT_URL;

export const SHARE_WEBPAGE_TITLE = "农屿 - 专属川农er的校园助手";

export const SHARE_WEBPAGE_DESCRIPTION =
  "在农屿，无广告课表、便捷教务信息查询、i川农二课接入，你想要的，农屿都能做到！";
