/**
 * 农屿 Agent SDK - 控制台调试 CLI
 *
 * 当前默认接入智谱 AI (GLM-4.7-Flash)，集成了完整的教务工具集。
 *
 * 用法：
 *   pnpm debug
 */

import {
  createAgent,
  Gateway,
  OpenAIProvider,
  type Agent,
  type AgentStreamChunk,
  type OutboundEnvelope,
} from '../src/index';
import { buildSystemPrompt } from '../src/core/prompt/buildSystemPrompt';
import { StdioChannel } from '../src/core/channel/builtin/stdio';
import { jiaowuTools } from '../src/core/tool/ExternalTools/jiaowu-tools';

const systemPrompt = buildSystemPrompt({
  roleDefinition: '你是专属于四川农业大学的智慧教务助手，能够通过封装好的系列教务工具进行教务相关数据的查询，以此帮助四川农业大学的学生便捷的获取教务相关信息。',
  canExecute: '你可以通过正确使用下方提供的系列教务工具回复用户关于四川农业大学教务相关数据的查询。',
  cannotExecute: '作为一个专职于四川农业大学的教务助手，你不能回复用户关于四川农业大学以外的教务相关数据的查询。若用户提起，请你提示用户你无法回答。',
  principles: '请严格遵守下方系列教务工具的使用方式，按照所要求的参数数量和格式进行工具调用。',
  workflow: '请严格按照教务系统的操作流程进行，不进行任何修改。',
  outputFormat: '请严格按照教务系统的输出格式进行，不进行任何修改。',
  // few_shots: '请严格按照教务系统的示例进行，不进行任何修改。',
  // tools: jiaowuTools,
});



// 将 Agent 流式块映射为通道出站封包
async function* mapChunksToEnvelopes(
  stream: AsyncIterable<AgentStreamChunk>,
  conversationId: string,
): AsyncIterable<OutboundEnvelope> {
  for await (const chunk of stream) {
    switch (chunk.type) {
      case 'text:delta':
        yield { conversationId, content: chunk.delta, chunkType: 'text:delta' };
        break;
      case 'tool:call': {
        const inputStr = JSON.stringify(chunk.input);
        const display = inputStr.length > 100 ? inputStr.slice(0, 100) + '...' : inputStr;
        yield { conversationId, content: `${chunk.toolName}(${display})`, chunkType: 'tool:call' };
        break;
      }
      case 'tool:result':
        yield { conversationId, content: `${chunk.toolName} (${chunk.duration}ms)`, chunkType: 'tool:result' };
        break;
      case 'step:start':
        yield { conversationId, content: `[Step ${chunk.stepNumber}]`, chunkType: 'info' };
        break;
      case 'agent:error':
        throw chunk.error;
      case 'agent:complete':
      case 'step:complete':
        // 完成事件由 text:delta 和 tool:call 覆盖，跳过
        break;
    }
  }
}

// ===== 主函数 =====

async function main() {
  // ===== 智谱 AI 配置 =====
  // const model = new OpenAIProvider({
  //   apiKey: '7a2158a374964d93a92674a7902bb4f0.Tb5Tv132jVsl7XQB',
  //   baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  //   model: 'glm-4.7-flash',
  // });

  const model = new OpenAIProvider({
    apiKey: 'sk-8c051b961b6b4a62a7cb69fb20caeea6',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
  });

  console.log(`\n农屿 Agent SDK - 调试控制台`);
  console.log(`  模型: glm-4.7-flash (智谱 AI)`);
  console.log(`  端点: https://open.bigmodel.cn/api/paas/v4`);
  console.log(`  已加载教务工具: ${Object.keys(jiaowuTools).length} 个\n`);

  // 创建 Agent
  const agent: Agent = createAgent({
    name: 'nongyu-jiaowu-assistant',
    description: '农屿教务助手，集成了完整的教务系统查询能力',
    systemPrompt,
    model,
    tools: jiaowuTools,
    runConfig: {
      maxSteps: 15,
      temperature: 0.1,
    },
  });

  // 监听 Agent 事件（仅处理流式块覆盖不到的错误/状态）
  agent.on('tool:error', ({ toolName, error }) => {
    process.stdout.write(`\n  [❌ 工具错误] ${toolName}: ${error.message}\n`);
  });

  // 创建通道 & 网关
  const stdioChannel = new StdioChannel({
    id: 'debug-console',
    name: '调试控制台',
    prompt: '\n👤 你: ',
    agentPrefix: '\n🤖 Agent: ',
  });

  const gateway = new Gateway();
  gateway.registerChannel(stdioChannel);

  const conversationId = 'debug-console:main';

  // 注册消息处理器：流式调用 Agent + 流式输出到控制台
  gateway.onMessage(async (envelope) => {
    try {
      const stream = agent.stream({ prompt: envelope.text });
      await gateway.sendStream(conversationId, mapChunksToEnvelopes(stream, conversationId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await gateway.send({ conversationId, content: `处理出错: ${msg}` });
    }
  });

  // 启动
  await gateway.start();
}

main().catch((err) => {
  console.error('CLI 启动失败:', err);
  process.exit(1);
});
