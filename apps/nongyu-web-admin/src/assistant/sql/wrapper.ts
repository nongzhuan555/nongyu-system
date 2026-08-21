import { createAgent, tool, type Agent, type ModelProvider } from "nongyu-agent-sdk";
import { z } from "zod";
import { SQL_AGENT_DESCRIPTION, SQL_AGENT_SYSTEM_PROMPT } from "./prompt";
import { beginSqlAgentRun } from "./session";
import { sqlExecuteTool, sqlValidateTool } from "./tools";
import type { TrackSqlChartType, TrackSqlExecuteSuccess } from "./types";

const CHART_TYPES: readonly TrackSqlChartType[] = ["line", "bar", "pie", "table"];

function isExecuteSuccess(output: unknown): output is TrackSqlExecuteSuccess {
  if (output == null || typeof output !== "object") return false;
  const row = output as Record<string, unknown>;
  return typeof row.uiId === "string" && Array.isArray(row.columns) && Array.isArray(row.preview);
}

function parseChartType(content: string): TrackSqlChartType | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as { chartType?: unknown };
    if (typeof parsed.chartType !== "string") return null;
    return CHART_TYPES.includes(parsed.chartType as TrackSqlChartType)
      ? (parsed.chartType as TrackSqlChartType)
      : null;
  } catch {
    return null;
  }
}

function inferChartType(result: TrackSqlExecuteSuccess): TrackSqlChartType {
  if (result.columns.length < 2 || result.preview.length === 0) return "table";
  const first = result.columns[0] ?? "";
  if (/date|stat_date|day|time/i.test(first)) return "line";
  if (result.preview.length <= 8) return "pie";
  return "bar";
}

/** 创建 SQLAgent：内部只有校验与执行工具。 */
export function createSqlAgent(model: ModelProvider): Agent {
  return createAgent({
    name: "admin_sql_agent",
    description: SQL_AGENT_DESCRIPTION,
    systemPrompt: SQL_AGENT_SYSTEM_PROMPT,
    model,
    tools: {
      sql_validate: sqlValidateTool,
      sql_execute: sqlExecuteTool,
    },
    runConfig: { maxSteps: 10 },
  });
}

/**
 * 主 Agent 可见的包装 tool。内部跑 SQLAgent，把最后一次成功执行结果交给 AdminSqlBlock。
 */
export function createAdminSqlAgentTool(sqlAgent: Agent) {
  return tool({
    name: "admin_sql_agent",
    description: SQL_AGENT_DESCRIPTION,
    inputSchema: z.object({
      query: z.string().min(1).describe("传递给 SQLAgent 的自然语言问数任务"),
    }),
    render: { component: "AdminSqlBlock" },
    execute: async (input, ctx) => {
      beginSqlAgentRun();
      const onAbort = () => {
        sqlAgent.stop();
      };
      ctx.abortSignal.addEventListener("abort", onAbort);
      try {
        const result = await sqlAgent.complete({ prompt: input.query });
        const lastSuccess = [...result.toolCalls]
          .reverse()
          .find((call) => call.toolName === "sql_execute" && isExecuteSuccess(call.output));
        if (!lastSuccess || !isExecuteSuccess(lastSuccess.output)) {
          throw new Error(result.content.trim() || "问数失败：未能执行有效 SQL");
        }
        const executed = lastSuccess.output;
        return {
          ...executed,
          chartType: parseChartType(result.content) ?? inferChartType(executed),
        };
      } finally {
        ctx.abortSignal.removeEventListener("abort", onAbort);
      }
    },
  });
}
