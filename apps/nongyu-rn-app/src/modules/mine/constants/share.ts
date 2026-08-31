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
  "无广告课表、教务二课数据集成、智能AI助手，在农屿都能得到~";

/** iOS 点击微信好友 / 朋友圈时的说明（本期仅支持复制链接） */
export const SHARE_IOS_WECHAT_UNSUPPORTED = "iOS 暂不支持分享到微信和朋友圈，请使用「复制链接」";
