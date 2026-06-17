/**
 * WebFetchTool — 网页内容抓取工具
 *
 * 根据提供的 URL 获取其 HTML 内容，自动识别并适配不同编码（GBK、UTF-8 等）。
 */
import { z } from 'zod';
import iconv from 'iconv-lite';
import { tool } from '../index';

/** 从 Content-Type 头中提取 charset */
function extractCharset(contentType: string | null): string | null {
  if (!contentType) return null;
  const match = contentType.match(/charset\s*=\s*([^\s;]+)/i);
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
}

/** 规范化编码名称为 iconv-lite 可识别的格式 */
function normalizeEncoding(enc: string): string {
  const lower = enc.toLowerCase().replace(/[-_]/g, '');
  // gb2312 → gbk（iconv-lite 中 gb2312 是 gbk 的别名）
  const alias: Record<string, string> = {
    'gb2312': 'gbk',
    'gb18030': 'gbk',
    'ansi': 'gbk',
  };
  return alias[lower] || enc;
}

export const webFetchTool = tool({
  name: 'web_fetch',
  description:
    '获取指定网页 URL 的 HTML 内容，自动适配不同编码（GBK、UTF-8 等）。适用于需要读取网页原始内容进行解析或分析。只适用于CSR客户端渲染的页面已经无需鉴权的公共页面,其他页面可能获取不到理想的结果',
  inputSchema: z.object({
    url: z.string().describe('要抓取的网页 URL，必须是完整链接，如 https://example.com'),
    encoding: z
      .string()
      .optional()
      .describe(
        '可选，手动指定网页编码（如 gbk、utf-8）。不填则自动从 Content-Type 响应头识别，识别不到默认按 UTF-8 处理',
      ),
  }),
  async execute({ url, encoding }) {
    // 1. 发起请求，获取 ArrayBuffer
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`网页请求失败: ${msg}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 2. 读取二进制数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. 确定编码
    let targetEncoding = encoding || extractCharset(response.headers.get('content-type'));
    if (!targetEncoding) {
      targetEncoding = 'utf-8';
    }
    targetEncoding = normalizeEncoding(targetEncoding);

    // 4. 解码
    let html: string;
    try {
      html = iconv.decode(buffer, targetEncoding);
    } catch {
      // iconv-lite 解码失败时尝试 UTF-8 兜底
      html = iconv.decode(buffer, 'utf-8');
    }

    // 5. 限制返回长度，避免 LLM 上下文爆炸
    const maxLength = 100_000;
    if (html.length > maxLength) {
      html = html.slice(0, maxLength) + '\n\n<!-- [内容已截断，原始长度: ' + html.length + ' 字符] -->';
    }

    return {
      url,
      encoding: targetEncoding,
      html,
    };
  },
});
