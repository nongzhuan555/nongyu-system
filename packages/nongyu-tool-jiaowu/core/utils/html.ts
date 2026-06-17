/**
 * HTML 解析工具模块
 * 提供清洗标签、提取特定段落以及解析表格的通用方法
 */

/**
 * 解码常见的 HTML 实体
 * 
 * @param str 包含 HTML 实体的字符串
 * @returns 解码后的纯文本字符串
 * 
 * @example
 * decodeEntities('Hello&nbsp;World') // 'Hello World'
 */
export function decodeEntities(str: string): string {
  if (!str) return '';
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
  };
  return str
    .replace(/&nbsp;|&#160;|&lt;|&gt;|&amp;|&quot;|&#39;/gi, (match) => entities[match.toLowerCase()])
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

/**
 * 清除 HTML 标签、脚本和样式，保留纯文本内容
 * 
 * @param html 原始 HTML 字符串
 * @returns 清洗后的纯文本
 * 
 * @example
 * stripTags('<div>Hello<br/>World</div>') // 'Hello\nWorld'
 */
export function stripTags(html: string): string {
  if (!html) return '';

  let text = html
    .replace(/<br\s*\/?>/gi, '\n') // 将 <br> 替换为换行符
    .replace(/<script[\s\S]*?<\/script>/gi, '') // 移除脚本块
    .replace(/<style[\s\S]*?<\/style>/gi, '') // 移除样式块
    .replace(/<[^>]+>/g, ''); // 移除所有 HTML 标签

  text = decodeEntities(text);

  return text
    .replace(/[ \t]+\n/g, '\n') // 移除行尾空格
    .replace(/\n{3,}/g, '\n\n') // 压缩连续的多个换行符
    .trim();
}

/**
 * 提取指定标签包裹的 HTML 段落
 * 支持简单的标签嵌套匹配（如 table -> tr -> td）
 * 
 * @param html 原始 HTML 字符串
 * @param tagNames 需要匹配的标签名列表
 * @returns 提取出的 HTML 片段数组
 * 
 * @example
 * extractSegments(html, 'table') // 返回所有 <table>...</table> 片段
 */
export function extractSegments(html: string, ...tagNames: string[]): string[] {
  const pattern = tagNames.join('|');
  const re = new RegExp(`<\\/?(${pattern})\\b[^>]*>`, 'gi');
  const segments: string[] = [];
  let depth = 0;
  let start = -1;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const tag = m[0];
    const isClose = tag.startsWith('</');
    if (!isClose) {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start >= 0) {
        segments.push(html.slice(start, m.index + tag.length));
        start = -1;
      }
    }
  }
  return segments;
}

/**
 * 将 HTML 表格解析为二维字符串数组
 * 
 * @param tableHtml <table> 标签及其内部内容的 HTML 字符串
 * @returns 表示表格数据的二维数组
 * 
 * @example
 * parseTable('<table><tr><td>A</td><td>B</td></tr></table>') // [['A', 'B']]
 */
export function parseTable(tableHtml: string): string[][] {
  const rows = extractSegments(tableHtml, 'tr');
  return rows.map((rowHtml) => {
    const cells = extractSegments(rowHtml, 'td', 'th');
    return cells.map((cellHtml) => stripTags(cellHtml));
  });
}
