import { z } from 'zod';
import type { Agent } from '../../types/agent';
import type { Tool } from '../../types/tool';
import { tool } from '../tool';

/**
 * 将子 Agent 封装为一个 Tool（Agent-as-Tool 模式）
 *
 * 主 Agent 通过调用该 Tool 来调度子 Agent 完成独立子任务，
 * 子 Agent 独立运行完成后返回结果。
 */
export function agentAsTool(agent: Agent): Tool {
  return tool({
    name: agent.name,
    description: agent.description,
    inputSchema: z.object({
      query: z.string().describe(`传递给 ${agent.name} 的任务描述`),
    }),
    async execute(input, _ctx) {
      const result = await agent.complete({
        prompt: input.query,
        context: undefined,
      });
      return result.content;
    },
  });
}
