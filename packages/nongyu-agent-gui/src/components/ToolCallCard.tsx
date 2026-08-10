import type { ToolCallRecord } from "nongyu-agent-sdk";
import { useState } from "react";

interface ToolCallCardProps {
  toolCalls: ToolCallRecord[];
}

/**
 * 工具调用卡片（可折叠）
 */
export function ToolCallCard({ toolCalls }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  return (
    <div className="mt-3 border border-amber-200 bg-amber-50/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100/50 transition-colors"
      >
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>
          已调用 {toolCalls.length} 个工具
          {toolCalls.some((tc) => tc.duration !== undefined) &&
            ` · ${toolCalls.reduce((sum, tc) => sum + (tc.duration ?? 0), 0)}ms`}
        </span>
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-amber-200 px-3 py-2 space-y-2">
          {toolCalls.map((tc, idx) => (
            <div key={idx} className="text-sm">
              <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                {tc.toolName}
                {tc.duration !== undefined && (
                  <span className="text-amber-500 font-normal text-xs">{tc.duration}ms</span>
                )}
              </div>
              {tc.output !== undefined && (
                <div className="mt-1 ml-3 text-slate-600 text-xs font-mono bg-white rounded-lg p-2 max-h-32 overflow-auto">
                  {typeof tc.output === "string" ? tc.output : JSON.stringify(tc.output, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
