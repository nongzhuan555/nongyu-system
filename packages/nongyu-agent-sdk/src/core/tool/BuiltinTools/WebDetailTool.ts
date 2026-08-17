/**
 * WebDetailTool — 网页可读详情抓取
 *
 * 按 URL 拉取页面、自动适配编码，抽取可读正文；疑似鉴权/无意义内容时返回无权限。
 * RN 环境必须显式使用 `buffer` polyfill，iconv-lite 才能正确解 GBK（与教务工具一致）。
 */
import { Buffer } from "buffer";
import { z } from "zod";
import iconv from "iconv-lite";
import { tool } from "../index";

const MAX_TEXT_LENGTH = 30_000;
/** 有效可读字符过短时视为无意义（可能登录墙 / 空壳） */
const MIN_MEANINGFUL_CHARS = 80;

const NO_PERMISSION_MESSAGE = "无此权限查看该页面内容";

/** 强特征：命中即视为登录墙 */
const AUTH_WALL_STRONG = [
  "请先登录",
  "请登录",
  "未登录",
  "无权访问",
  "没有权限",
  "未授权",
  "身份认证",
  "统一身份认证",
  "access denied",
  "unauthorized",
  "login required",
];

/**
 * 弱特征：导航栏常含「登录」，仅在正文偏短时才判无权限，降低误伤公共站。
 */
const AUTH_WALL_WEAK = ["登陆", "登录", "sign in", "log in", "sso"];

function extractCharsetFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const match = contentType.match(/charset\s*=\s*([^\s;]+)/i);
  return match ? match[1].trim().replace(/^"|"$/g, "") : null;
}

/**
 * 从原始字节用 latin1 嗅探 meta charset（ASCII 声明不依赖正确解码）。
 */
function extractCharsetFromBuffer(buffer: Buffer): string | null {
  const head = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("latin1");
  const charsetMeta = head.match(/<meta[^>]+charset\s*=\s*["']?([^"'>\s/;]+)/i);
  if (charsetMeta?.[1]) return charsetMeta[1].trim();

  const httpEquiv = head.match(
    /<meta[^>]+http-equiv\s*=\s*["']?content-type["']?[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^"'>\s/;]+)/i,
  );
  if (httpEquiv?.[1]) return httpEquiv[1].trim();

  const httpEquivAlt = head.match(
    /<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^"'>\s/;]+)[^"']*["'][^>]*http-equiv\s*=\s*["']?content-type/i,
  );
  return httpEquivAlt?.[1]?.trim() ?? null;
}

function detectBomEncoding(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8";
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return "utf-16le";
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return "utf-16be";
  return null;
}

function normalizeEncoding(enc: string): string {
  const lower = enc.toLowerCase().replace(/[-_]/g, "");
  const alias: Record<string, string> = {
    gb2312: "gbk",
    gb18030: "gb18030",
    gbk: "gbk",
    ansi: "gbk",
    utf8: "utf-8",
    utf16: "utf-16le",
    utf16le: "utf-16le",
    utf16be: "utf-16be",
    big5: "big5",
  };
  return alias[lower] || enc.toLowerCase();
}

function isGbFamily(enc: string): boolean {
  const n = normalizeEncoding(enc);
  return n === "gbk" || n === "gb18030";
}

/** 解码质量分：CJK 加分，替换符/典型乱码扣分。 */
function scoreDecodedHtml(html: string): number {
  const sample = html.slice(0, 24_000);
  const cjk = sample.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const fffd = sample.match(/\uFFFD/g)?.length ?? 0;
  const mojibake =
    sample.match(
      /锟斤拷|烫烫烫|屯屯屯|Ã[\u0080-\u00bf]|å[\u0080-\u00bf]|æ[\u0080-\u00bf]|ä[\u0080-\u00bf]/g,
    )?.length ?? 0;
  const weirdControls = sample.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g)?.length ?? 0;
  return cjk * 4 - fffd * 80 - mojibake * 40 - weirdControls * 10;
}

function tryDecode(buffer: Buffer, encoding: string): string | null {
  try {
    // 不预检 encodingExists：部分 RN 打包下该检查不可靠，直接 try 与教务工具一致
    return iconv.decode(buffer, encoding);
  } catch {
    return null;
  }
}

/**
 * 解析 HTML 编码：用户指定 > BOM > 声明 gb* 优先信任 > 多候选评分。
 */
function decodeHtml(
  buffer: Buffer,
  headerCharset: string | null,
  userEncoding: string | null,
): { html: string; encoding: string } {
  if (userEncoding) {
    const enc = normalizeEncoding(userEncoding);
    const html = tryDecode(buffer, enc) ?? iconv.decode(buffer, "utf-8");
    return { html, encoding: enc };
  }

  const bom = detectBomEncoding(buffer);
  if (bom) {
    const html = tryDecode(buffer, bom);
    if (html != null) return { html, encoding: bom };
  }

  const metaCharset = extractCharsetFromBuffer(buffer);
  // 校园站常见：meta 写 gb2312，必须优先按 GBK 解（与教务工具默认策略一致）
  const declared = metaCharset || headerCharset;
  if (declared && isGbFamily(declared)) {
    const enc = normalizeEncoding(declared);
    const html = tryDecode(buffer, enc);
    if (html != null && scoreDecodedHtml(html) > 0) {
      return { html, encoding: enc };
    }
  }

  const candidates: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const n = normalizeEncoding(raw);
    if (!candidates.includes(n)) candidates.push(n);
  };
  push(metaCharset);
  push(headerCharset);
  push("utf-8");
  push("gbk");
  push("gb18030");
  push("big5");

  let bestEnc = "utf-8";
  let bestHtml = tryDecode(buffer, "utf-8") ?? "";
  let bestScore = scoreDecodedHtml(bestHtml);

  for (const enc of candidates) {
    const html = tryDecode(buffer, enc);
    if (html == null) continue;
    const score = scoreDecodedHtml(html);
    const declaredBonus =
      (metaCharset && normalizeEncoding(metaCharset) === enc) ||
      (headerCharset && normalizeEncoding(headerCharset) === enc)
        ? isGbFamily(enc)
          ? 500
          : 80
        : 0;
    const total = score + declaredBonus;
    if (total > bestScore) {
      bestScore = total;
      bestEnc = enc;
      bestHtml = html;
    }
  }

  return { html: bestHtml, encoding: bestEnc };
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return undefined;
  const title = stripTags(match[1]).trim();
  return title || undefined;
}

function stripTags(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 去除脚本样式后抽取可读纯文本 */
function extractReadableText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return stripTags(cleaned);
}

const MAX_LINKS = 40;

/**
 * 从 HTML 抽取站内可跟进链接（绝对 URL），供 Agent 逐步深挖导航。
 */
function extractLinks(html: string, baseUrl: string): { text: string; url: string }[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const links: { text: string; url: string }[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(cleaned)) !== null && links.length < MAX_LINKS) {
    const rawHref = match[1]?.trim() ?? "";
    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("mailto:")
    ) {
      continue;
    }
    let absolute: string;
    try {
      absolute = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(absolute)) continue;
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    const text = stripTags(match[2] ?? "").trim();
    if (!text) continue;
    links.push({ text: text.slice(0, 80), url: absolute });
  }
  return links;
}

function looksLikeAuthWall(title: string | undefined, text: string): boolean {
  const haystack = `${title ?? ""} ${text}`.toLowerCase();
  if (AUTH_WALL_STRONG.some((kw) => haystack.includes(kw.toLowerCase()))) {
    return true;
  }
  const meaningful = countMeaningfulChars(text);
  if (meaningful >= 300) return false;
  return AUTH_WALL_WEAK.some((kw) => haystack.includes(kw.toLowerCase()));
}

function countMeaningfulChars(text: string): number {
  return text.replace(/\s+/g, "").length;
}

function noPermissionResult(url: string) {
  return {
    ok: false as const,
    url,
    reason: "no_permission" as const,
    message: NO_PERMISSION_MESSAGE,
  };
}

function buildAbortSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(15_000);
  }
  return undefined;
}

export const webDetailTool = tool({
  name: "web_detail",
  description:
    "抓取指定 URL 的网页可读正文与页面内链接列表（自动适配 GBK/UTF-8）。用于阅读详情，或根据 links 的锚文本挑选下一级 URL 再调用本工具继续探索。不要用 web_search 代替本工具读正文。仅公共可匿名页面可靠。",
  inputSchema: z.object({
    url: z.string().describe("要抓取的网页 URL，必须是完整链接，如 https://example.com"),
    encoding: z
      .string()
      .optional()
      .describe(
        "可选，手动指定网页编码（如 gbk、utf-8、gb18030）。不填则自动嗅探（Content-Type / meta / BOM）并多编码评分择优",
      ),
  }),
  async execute({ url, encoding }) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        signal: buildAbortSignal(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        ok: false as const,
        url,
        reason: "fetch_error" as const,
        message: `网页请求失败: ${msg}`,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return noPermissionResult(url);
    }

    if (!response.ok) {
      return {
        ok: false as const,
        url,
        reason: "fetch_error" as const,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    try {
      // 先读二进制；RN 须用 buffer polyfill 才能正确解 GBK
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const headerCharset = extractCharsetFromContentType(response.headers.get("content-type"));
      const { html, encoding: targetEncoding } = decodeHtml(
        buffer,
        headerCharset,
        encoding ?? null,
      );

      const title = extractTitle(html);
      let text = extractReadableText(html);
      const truncated = text.length > MAX_TEXT_LENGTH;
      if (truncated) {
        text = text.slice(0, MAX_TEXT_LENGTH);
      }
      const links = extractLinks(html, url);

      // 解码后几乎无 CJK 且分数极差 → 视为编码失败，勿当成功正文回灌
      if (scoreDecodedHtml(html) < 50 && countMeaningfulChars(text) > 0) {
        const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
        if (cjk < 8) {
          return {
            ok: false as const,
            url,
            reason: "fetch_error" as const,
            message: "网页内容解码失败（可能编码不兼容），请稍后重试或手动指定 encoding=gbk",
          };
        }
      }

      const meaningful = countMeaningfulChars(text);
      const tooShort = meaningful < MIN_MEANINGFUL_CHARS && !title && links.length === 0;
      if (tooShort || looksLikeAuthWall(title, text)) {
        return noPermissionResult(url);
      }

      return {
        ok: true as const,
        url,
        encoding: targetEncoding,
        title,
        text,
        links,
        truncated,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        ok: false as const,
        url,
        reason: "fetch_error" as const,
        message: `网页内容解析失败: ${msg}`,
      };
    }
  },
});
