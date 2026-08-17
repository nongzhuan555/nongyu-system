import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 对齐 RN AssistantMessage 完成后的 Markdown 观感 */
export function AssistantMarkdown({ content }: { content: string }) {
  if (!content.trim()) return null;
  return (
    <div className="assistant-md max-w-none text-[15px] leading-6 text-ink [&_a]:text-brand [&_a]:no-underline hover:[&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-line-soft [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code]:rounded [&_code]:bg-elev [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-2.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_p]:last:mb-0 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-elev [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
