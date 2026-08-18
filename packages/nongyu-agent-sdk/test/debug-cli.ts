/**
 * 农屿 Agent SDK - 控制台调试 CLI
 *
 * 用法：
 *   1. 复制 packages/nongyu-agent-sdk/.env.example 为 .env 并填写 AGENT_API_KEY
 *   2. pnpm debug
 *
 * 真实 Key 仅放本机 .env（已 gitignore），禁止入库。
 */

import {
  createAgent,
  Gateway,
  OpenAIProvider,
  type Agent,
  type AgentStreamChunk,
  type OutboundEnvelope,
} from "../src/index";
import { buildSystemPrompt } from "../src/core/prompt/buildSystemPrompt";
import { StdioChannel } from "../src/stdio";
import { jiaowuTools } from "../src/core/tool/ExternalTools/jiaowu-tools";

const systemPrompt = buildSystemPrompt({
  roleDefinition:
    "你是专属于四川农业大学的智慧教务助手，能够通过封装好的系列教务工具进行教务相关数据的查询，以此帮助四川农业大学的学生便捷的获取教务相关信息。",
  canExecute:
    "你可以通过正确使用下方提供的系列教务工具回复用户关于四川农业大学教务相关数据的查询。",
  cannotExecute:
    "作为一个专职于四川农业大学的教务助手，你不能回复用户关于四川农业大学以外的教务相关数据的查询。若用户提起，请你提示用户你无法回答。",
  principles: "请严格遵守下方系列教务工具的使用方式，按照所要求的参数数量和格式进行工具调用。",
  workflow: "请严格按照教务系统的操作流程进行，不进行任何修改。",
  outputFormat: "请严格按照教务系统的输出格式进行，不进行任何修改。",
});

/** 调试 CLI 必填环境变量；缺省则启动失败 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `缺少环境变量 ${name}。请复制 packages/nongyu-agent-sdk/.env.example 为 .env 后填写，或在 shell 中导出该变量；勿提交真实 Key。`,
    );
  }
  return value;
}

// 将 Agent 流式块映射为通道出站封包
async function* mapChunksToEnvelopes(
  stream: AsyncIterable<AgentStreamChunk>,
  conversationId: string,
): AsyncIterable<OutboundEnvelope> {
  for await (const chunk of stream) {
    switch (chunk.type) {
      case "text:delta":
        yield { conversationId, content: chunk.delta, chunkType: "text:delta" };
        break;
      case "tool:call": {
        const inputStr = JSON.stringify(chunk.input);
        const display = inputStr.length > 100 ? inputStr.slice(0, 100) + "..." : inputStr;
        yield { conversationId, content: `${chunk.toolName}(${display})`, chunkType: "tool:call" };
        break;
      }
      case "tool:result":
        yield {
          conversationId,
          content: `${chunk.toolName} (${chunk.duration}ms)`,
          chunkType: "tool:result",
        };
        break;
      case "step:start":
        yield { conversationId, content: `[Step ${chunk.stepNumber}]`, chunkType: "info" };
        break;
      case "agent:error":
        throw chunk.error;
      case "agent:complete":
      case "step:complete":
        // 完成事件由 text:delta 和 tool:call 覆盖，跳过
        break;
    }
  }
}

async function main() {
  const apiKey = requireEnv("AGENT_API_KEY");
  const baseURL = process.env.AGENT_BASE_URL?.trim() || "https://api.deepseek.com";
  const model = process.env.AGENT_MODEL?.trim() || "deepseek-v4-flash";

  const modelProvider = new OpenAIProvider({
    apiKey,
    baseURL,
    model,
  });

  console.log(`\n农屿 Agent SDK - 调试控制台`);
  console.log(`  模型: ${model}`);
  console.log(`  端点: ${baseURL}`);
  console.log(`  已加载教务工具: ${Object.keys(jiaowuTools).length} 个\n`);

  const agent: Agent = createAgent({
    name: "nongyu-jiaowu-assistant",
    description: "农屿教务助手，集成了完整的教务系统查询能力",
    systemPrompt,
    model: modelProvider,
    tools: jiaowuTools,
    runConfig: {
      maxSteps: 15,
      temperature: 0.1,
    },
  });

  agent.on("tool:error", ({ toolName, error }) => {
    process.stdout.write(`\n  [工具错误] ${toolName}: ${error.message}\n`);
  });

  const stdioChannel = new StdioChannel({
    id: "debug-console",
    name: "调试控制台",
    prompt: "\n你: ",
    agentPrefix: "\nAgent: ",
  });

  const gateway = new Gateway();
  gateway.registerChannel(stdioChannel);

  const conversationId = "debug-console:main";

  gateway.onMessage(async (envelope) => {
    try {
      const stream = agent.stream({ prompt: envelope.text });
      await gateway.sendStream(conversationId, mapChunksToEnvelopes(stream, conversationId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await gateway.send({ conversationId, content: `处理出错: ${msg}` });
    }
  });

  await gateway.start();
}

main().catch((err) => {
  console.error("CLI 启动失败:", err);
  process.exit(1);
});
