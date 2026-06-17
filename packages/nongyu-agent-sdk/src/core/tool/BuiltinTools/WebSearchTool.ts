/**
 * WebSearchTool — 互联网搜索工具
 *
 * 通过 DuckDuckGo 静态 HTML 端点搜索互联网内容，
 * 无需 API Key，返回标题、链接和摘要。
 */
import { z } from 'zod';
import { tool } from '../index';

/** 单条搜索结果 */
interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * 从 DuckDuckGo HTML 中解析搜索结果
 *
 * 目标页面: https://html.duckduckgo.com/html/?q=...
 * HTML 结构非常规整，使用正则提取即可，无需引入 HTML 解析库。
 */
function parseResults(html: string): SearchResultItem[] {
  const results: SearchResultItem[] = [];

  // 匹配每个结果块: <div class="result__body"> ... </div>
  const blockRegex = /<div\s+class=["']result__body["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  // 匹配链接: <a class="result__a" href="...">title</a>
  const linkRegex = /<a\s+class=["']result__a["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i;
  // 匹配摘要: <span class="result__snippet">snippet</span> 或 <a class="result__snippet">
  const snippetRegex = /<(?:span|a)\s+class=["']result__snippet["'][^>]*>([\s\S]*?)<\/(?:span|a)>/i;

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1];
    const linkMatch = linkRegex.exec(block);
    const snippetMatch = snippetRegex.exec(block);

    if (!linkMatch) continue;

    // DDG 使用协议相对 URL: //example.com → https://example.com
    let url = linkMatch[1];
    if (url.startsWith('//')) url = 'https:' + url;

    const title = stripHtml(linkMatch[2]).trim();
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]).trim() : '';

    if (title) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

/** 去除 HTML 标签和常见空白实体 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

export const webSearchTool = tool({
  name: 'web_search',
  description:
    '通过 DuckDuckGo 搜索引擎搜索互联网内容。返回标题、URL 和网页摘要片段。适用于获取实时信息、新闻、资讯等。',
  inputSchema: z.object({
    query: z.string().describe('搜索关键词，支持中文和英文'),
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe('最大返回结果数，默认 10'),
  }),
  async execute({ query, maxResults }) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`搜索请求失败: ${msg}`);
    }

    if (!response.ok) {
      throw new Error(`搜索请求失败 HTTP ${response.status}`);
    }

    const html = await response.text();
    const allResults = parseResults(html);

    // 截取指定数量
    const results = allResults.slice(0, maxResults);

    return {
      query,
      resultCount: results.length,
      results,
    };
  },
});
