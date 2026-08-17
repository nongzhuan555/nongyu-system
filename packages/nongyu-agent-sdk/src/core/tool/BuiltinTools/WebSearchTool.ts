/**
 * WebSearchTool — 互联网搜索工具
 *
 * 主源：Bing 中国站 HTML；备源：搜狗 HTML。
 * 无需 API Key。国内网络下 DuckDuckGo 常不可达，故不再作为主路径。
 */
import { z } from "zod";
import { tool } from "../index";

/** 单条搜索结果 */
interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

type SearchProvider = "bing" | "sogou";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
} as const;

/** RN / 部分环境可能没有 AbortSignal.timeout */
function buildAbortSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

/** 去除 HTML 标签和常见空白实体 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&ensp;/g, " ")
    .replace(/&emsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(raw: string, baseOrigin: string): string | null {
  let url = raw.trim();
  if (!url || url.startsWith("javascript:") || url.startsWith("#")) return null;
  if (url.startsWith("//")) url = "https:" + url;
  if (url.startsWith("/")) url = baseOrigin + url;
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    return decodeURIComponent(url.replace(/&amp;/g, "&"));
  } catch {
    return url.replace(/&amp;/g, "&");
  }
}

/**
 * 解析 Bing 中国站结果块：`<li class="b_algo">` → h2 > a + caption
 */
function parseBingResults(html: string): SearchResultItem[] {
  const results: SearchResultItem[] = [];
  const blockRegex = /<li\s+class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1];
    const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!h2) continue;

    const linkMatch = h2[1].match(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const url = normalizeUrl(linkMatch[1], "https://cn.bing.com");
    if (!url) continue;

    const snippetMatch =
      block.match(/class="b_caption"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
      block.match(/class="b_lineclamp\d+"[^>]*>([\s\S]*?)<\/(?:p|div)>/i);

    const title = stripHtml(linkMatch[2]);
    if (!title) continue;

    results.push({
      title,
      url,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "",
    });
  }

  return results;
}

/**
 * 解析搜狗结果：按 `vrwrap` 切块；优先 `linkurl=` 真实地址，其次 href
 */
function parseSogouResults(html: string): SearchResultItem[] {
  const results: SearchResultItem[] = [];
  const blocks = html.split(/<div\s+class="vrwrap"/i).slice(1);

  for (const raw of blocks) {
    const block = raw.slice(0, 6000);
    const h3 = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (!h3) continue;

    const anchor = h3[1].match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;

    const attrs = anchor[1];
    const linkurlAttr = attrs.match(/\blinkurl=(["']?)([^"'>\s]+)\1/i);
    const hrefAttr = attrs.match(/\bhref=(["'])([^"']+)\1/i);
    const rawUrl = linkurlAttr?.[2] ?? hrefAttr?.[2];
    if (!rawUrl) continue;

    const url = normalizeUrl(rawUrl, "https://www.sogou.com");
    if (!url) continue;

    const snippetMatch =
      block.match(/class="[^"]*star-wiki[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      block.match(/class="[^"]*space-txt[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      block.match(/class="[^"]*str-text[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/i) ||
      block.match(/class="[^"]*fz-mid[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/i);

    const title = stripHtml(anchor[2]);
    if (!title) continue;

    results.push({
      title,
      url,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 300) : "",
    });
  }

  return results;
}

async function fetchProviderHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: buildAbortSignal(12_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function searchWithProvider(
  provider: SearchProvider,
  query: string,
): Promise<SearchResultItem[]> {
  if (provider === "bing") {
    const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN`;
    const html = await fetchProviderHtml(url);
    return parseBingResults(html);
  }

  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
  const html = await fetchProviderHtml(url);
  return parseSogouResults(html);
}

export const webSearchTool = tool({
  name: "web_search",
  description:
    "搜索互联网，返回标题、URL 与摘要片段（主源 Bing 中国站，失败时自动改用搜狗）。仅用于尚无具体 URL 时的关键词检索（找新闻/找资料）。用户已给出链接或需要某页正文详情时，应改用 web_detail，不要用本工具代替。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，支持中文和英文"),
    maxResults: z.number().optional().default(10).describe("最大返回结果数，默认 10"),
  }),
  async execute({ query, maxResults }) {
    const errors: string[] = [];
    const providers: SearchProvider[] = ["bing", "sogou"];

    for (const provider of providers) {
      try {
        const allResults = await searchWithProvider(provider, query);
        const results = allResults.slice(0, maxResults);
        if (results.length > 0) {
          return {
            query,
            resultCount: results.length,
            results,
            source: provider,
          };
        }
        errors.push(`${provider}: 解析到 0 条结果`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${provider}: ${msg}`);
      }
    }

    return {
      query,
      resultCount: 0,
      results: [] as SearchResultItem[],
      source: null,
      error: `搜索失败（已尝试 Bing → 搜狗）: ${errors.join("; ")}`,
    };
  },
});
