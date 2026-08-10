import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import type { MarkdownRendererProps } from "../types";

/**
 * 流式 Markdown 渲染组件
 *
 * - 基于 react-markdown + remark-gfm (表格/任务列表/删除线)
 * - rehype-highlight 代码块语法高亮
 * - rehype-sanitize XSS 安全过滤
 * - 预留 A2UI customComponents 扩展点
 *
 * 流式场景：content 逐 chunk 变化时 React 自动 re-render，
 * react-markdown 对不完整的 markdown 也能安全渲染。
 */
export function MarkdownRenderer({ content, customComponents }: MarkdownRendererProps) {
  return (
    <div
      className="prose prose-slate prose-sm max-w-none
      prose-headings:text-slate-800 prose-headings:font-semibold
      prose-p:text-slate-700 prose-p:leading-relaxed
      prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-slate-800
      prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal
      prose-pre:bg-slate-900 prose-pre:rounded-xl prose-pre:p-4 prose-pre:shadow-sm
      prose-pre:text-slate-100
      prose-ol:text-slate-700 prose-ul:text-slate-700
      prose-li:marker:text-slate-400
      prose-table:border-collapse prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-th:text-sm prose-th:font-medium prose-th:text-slate-600
      prose-td:px-3 prose-td:py-2 prose-td:text-sm prose-td:text-slate-700 prose-td:border-t prose-td:border-slate-100
      prose-blockquote:border-l-4 prose-blockquote:border-emerald-400 prose-blockquote:bg-emerald-50/30 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:text-slate-600
      prose-img:rounded-xl
    "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={customComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
