import type { AgentInput, AgentOutput, StepContext, RunConfig, ToolApprovalConfig, ToolCallRecord } from '../../../types/agent';
import type { Message } from '../../../types/message';
import type { ModelProvider, ToolSchema } from '../../../types/model';
import type { Tool } from '../../../types/tool';
import type { AgentStreamChunk } from '../../../types/stream';
import { EventBus } from '../../events';
import { stopConditions, type StopCondition } from './stop-conditions';

/**
 * Agent 运行循环引擎
 *
 * 参考 Vercel AI SDK 的 ToolLoopAgent 和 OpenAI Agents SDK 的 Runner。
 *
 * 执行流程：
 * 1. prepareStep(ctx) - 每步前钩子
 * 2. model.generateText/streamText - 调用 LLM
 * 3. parseResponse - 解析返回：纯文本 / tool_call
 * 4. 分支处理：纯文本 → 继续循环；tool_call → 执行工具 → 回到步骤 1
 * 5. stopWhen() - 检查停止条件
 * 6. 超过 maxSteps → 强制终止
 */
export class AgentLoop {
  private model: ModelProvider;
  private tools: Map<string, Tool>;
  private toolSchemas: ToolSchema[];
  private maxSteps: number;
  private stopWhen: StopCondition;
  private prepareStepHook: (ctx: StepContext) => Promise<StepContext>;
  private events: EventBus;
  private agentName: string;
  private systemPrompt: string;

  // 运行时状态
  private abortController: AbortController | null = null;
  private stopped = false;
  private _runConfig: RunConfig | undefined;
  private toolApproval: ToolApprovalConfig | undefined;

  constructor(
    agentName: string,
    systemPrompt: string,
    model: ModelProvider,
    tools: Map<string, Tool>,
    events: EventBus,
    runConfig?: RunConfig,
  ) {
    this.agentName = agentName;
    this.systemPrompt = systemPrompt;
    this.model = model;
    this.tools = tools;
    this.events = events;
    this._runConfig = runConfig;
    this.toolApproval = runConfig?.toolApproval;
    this.maxSteps = runConfig?.maxSteps ?? 20;
    this.prepareStepHook = runConfig?.prepareStep ?? (async (ctx) => ctx);
    this.stopWhen = runConfig?.stopWhen ?? stopConditions.any(
      stopConditions.modelFinished(),
      stopConditions.stepCountIs(this.maxSteps),
    );
    this.toolSchemas = Array.from(tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.toJSONSchema(),
      },
    }));
  }

  stop(): void {
    this.stopped = true;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /** 完整执行循环 */
  async run(input: AgentInput): Promise<AgentOutput> {
    this.stopped = false;
    this.abortController = new AbortController();

    const messages = this.buildInitialMessages(input.prompt);
    const toolCallRecords: ToolCallRecord[] = [];
    let totalTokens = 0;
    let stepNumber = 0;

    this.events.emit('agent:start', { agentName: this.agentName, input });

    try {
      while (!this.stopped) {
        stepNumber++;
        let ctx: StepContext = {
          stepNumber,
          messages: [...messages],
          toolCalls: [...toolCallRecords],
          totalTokens,
        };

        // prepareStep 钩子
        ctx = await this.prepareStepHook(ctx);
        const model = ctx.model ?? this.model;

        // 发射 step:start
        this.events.emit('step:start', {
          agentName: this.agentName,
          stepNumber,
          messages: ctx.messages,
        });

        // 构建系统提示词
        const systemMessages = [
          { role: 'system' as const, content: this.systemPrompt },
        ];

        // 调用 LLM
        const result = await model.generateText({
          model: model.model,
          messages: [...systemMessages, ...ctx.messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'tool',
            content: m.content,
            tool_call_id: m.toolCallId,
            name: m.name,
            tool_calls: m.toolCalls,
          }))],
          tools: this.toolSchemas,
          temperature: this._runConfig?.temperature,
        });

        totalTokens += result.usage.total_tokens;

        // 添加 assistant 消息
        const assistantMsg: Message = {
          id: this.generateId(),
          role: 'assistant',
          content: result.content ?? '',
          timestamp: Date.now(),
          toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
        };
        messages.push(assistantMsg);

        // 判断是否有工具调用
        if (result.toolCalls.length > 0) {
          // 工具调用路径
          this.events.emit('step:complete', {
            agentName: this.agentName,
            stepNumber,
            type: 'tool_call',
            tokensUsed: result.usage.total_tokens,
          });

          for (const tc of result.toolCalls) {
            if (this.stopped) break;

            const tool = this.tools.get(tc.function.name);
            // 解析工具入参
            let input: unknown;
            try {
              input = JSON.parse(tc.function.arguments);
            } catch {
              input = tc.function.arguments;
            }

            // 未找到工具则把无工具提示作为工具结果
            if (!tool) {
              const toolResult = `错误：未找到工具 "${tc.function.name}"`;
              messages.push({
                id: this.generateId(),
                role: 'tool',
                content: toolResult,
                toolCallId: tc.id,
                timestamp: Date.now(),
              });
              continue;
            }

            // 检查审批——在 tool:call 事件之前
            if (tool.needsApproval(input)) {
              this.events.emit('tool:approval-required', {
                agentName: this.agentName,
                toolName: tc.function.name,
                input,
              });

              // 等待外部审批决策
              const approved = await this.waitForApproval(tc.function.name, input);
              if (!approved) {
                const skipResult = `工具 "${tc.function.name}" 调用已被拒绝`;
                messages.push({
                  id: this.generateId(),
                  role: 'tool',
                  content: skipResult,
                  toolCallId: tc.id,
                  timestamp: Date.now(),
                });
                continue;
              }
            }

            // 审批通过后，emit tool:call
            this.events.emit('tool:call', {
              agentName: this.agentName,
              toolName: tc.function.name,
              input,
            });

            const startTime = Date.now();
            try {
              const output = await tool.execute(input, {
                abortSignal: this.abortController!.signal,
                emit: (event, data) => {
                  this.events.emit('tool:result' as any, {
                    agentName: this.agentName,
                    toolName: tc.function.name,
                    output: { event, data },
                    duration: Date.now() - startTime,
                  });
                },
                agentName: this.agentName,
              });

              const duration = Date.now() - startTime;
              this.events.emit('tool:result', {
                agentName: this.agentName,
                toolName: tc.function.name,
                output,
                duration,
              });

              toolCallRecords.push({
                toolName: tc.function.name,
                input,
                output,
                duration,
              });

              messages.push({
                id: this.generateId(),
                role: 'tool',
                content: typeof output === 'string' ? output : JSON.stringify(output),
                toolCallId: tc.id,
                name: tc.function.name,
                timestamp: Date.now(),
              });
            } catch (error) {
              this.events.emit('tool:error', {
                agentName: this.agentName,
                toolName: tc.function.name,
                error: error instanceof Error ? error : new Error(String(error)),
              });

              messages.push({
                id: this.generateId(),
                role: 'tool',
                content: `工具执行出错: ${error instanceof Error ? error.message : String(error)}`,
                toolCallId: tc.id,
                name: tc.function.name,
                timestamp: Date.now(),
              });
            }
          }

          // 工具执行完后继续循环
          continue;
        }

        // 纯文本路径 - 完成
        this.events.emit('step:complete', {
          agentName: this.agentName,
          stepNumber,
          type: 'text',
          tokensUsed: result.usage.total_tokens,
        });
        this.events.emit('text:complete', {
          agentName: this.agentName,
          text: result.content ?? '',
        });

        const output: AgentOutput = {
          content: result.content ?? '',
          steps: stepNumber,
          tokensUsed: totalTokens,
          messages,
          toolCalls: toolCallRecords,
        };

        this.events.emit('agent:complete', {
          agentName: this.agentName,
          output,
          totalSteps: stepNumber,
          totalTokens,
        });

        return output;
      }

      // 被停止
      this.events.emit('agent:stop', {
        agentName: this.agentName,
        stepNumber,
      });

      return {
        content: '',
        steps: stepNumber,
        tokensUsed: totalTokens,
        messages,
        toolCalls: toolCallRecords,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.emit('agent:error', {
        agentName: this.agentName,
        error: err,
        stepNumber,
      });

      throw err;
    }
  }

  /** 流式执行循环 */
  async *runStream(input: AgentInput): AsyncIterable<AgentStreamChunk> {
    this.stopped = false;
    this.abortController = new AbortController();

    const messages = this.buildInitialMessages(input.prompt);
    const toolCallRecords: ToolCallRecord[] = [];
    let totalTokens = 0;
    let stepNumber = 0;

    yield { type: 'step:start', stepNumber: 0 };

    try {
      let currentResponseContent: string | null = null;

      while (!this.stopped) {
        stepNumber++;
        // 构造执行上下文
        let ctx: StepContext = {
          stepNumber,
          messages: [...messages],
          toolCalls: [...toolCallRecords],
          totalTokens,
        };

        ctx = await this.prepareStepHook(ctx);
        const model = ctx.model ?? this.model;

        yield { type: 'step:start', stepNumber };

        const systemMessages = [
          { role: 'system' as const, content: this.systemPrompt },
        ];

        // 流式调用
        let fullText = '';
        let toolCallsAccum: any[] = [];

        for await (const delta of model.streamText({
          model: model.model,
          messages: [...systemMessages, ...ctx.messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant' | 'tool',
            content: m.content,
            tool_call_id: m.toolCallId,
            name: m.name,
            tool_calls: m.toolCalls,
          }))],
          tools: this.toolSchemas,
          temperature: this._runConfig?.temperature,
        })) {
          if (this.stopped) break;

          if (delta.content) {
            fullText += delta.content;
            yield {
              type: 'text:delta' as const,
              delta: delta.content,
              fullText,
            };
          }

          if (delta.toolCalls) {
            toolCallsAccum = delta.toolCalls;
          }

          if (delta.finishReason) {
            ctx.finishReason = delta.finishReason;
          }
        }

        totalTokens += 100; // 流式模式下 usage 可能不精确，估算

        if (toolCallsAccum.length > 0) {
          // 执行工具调用（含审批检查）
          for (const tc of toolCallsAccum) {
            if (!tc.function?.name) continue;

            const tool = this.tools.get(tc.function.name);
            let input: unknown;
            try {
              input = JSON.parse(tc.function.arguments ?? '{}');
            } catch {
              input = tc.function.arguments;
            }

            if (!tool) continue;

            // 检查审批——在 tool:call 之前
            if (tool.needsApproval(input)) {
              this.events.emit('tool:approval-required', {
                agentName: this.agentName,
                toolName: tc.function.name,
                input,
              });

              const approved = await this.waitForApproval(tc.function.name, input);
              if (!approved) {
                messages.push({
                  id: this.generateId(),
                  role: 'tool',
                  content: `工具 "${tc.function.name}" 调用已被拒绝`,
                  toolCallId: tc.id,
                  timestamp: Date.now(),
                });
                continue;
              }
            }

            // 审批通过后，emit tool:call
            yield {
              type: 'tool:call',
              toolName: tc.function.name,
              input,
            };

            try {
              const startTime = Date.now();
              const output = await tool.execute(input, {
                abortSignal: this.abortController!.signal,
                emit: () => {},
                agentName: this.agentName,
              });

              const duration = Date.now() - startTime;
              yield {
                type: 'tool:result',
                toolName: tc.function.name,
                output,
                duration,
              };

              toolCallRecords.push({
                toolName: tc.function.name,
                input,
                output,
                duration,
              });

              messages.push({
                id: this.generateId(),
                role: 'tool',
                content: typeof output === 'string' ? output : JSON.stringify(output),
                toolCallId: tc.id,
                name: tc.function.name,
                timestamp: Date.now(),
              });
            } catch (error) {
              yield {
                type: 'agent:error',
                error: error instanceof Error ? error : new Error(String(error)),
              };
            }
          }

          // 检查停止条件
          if (await this.stopWhen(ctx)) break;
          continue;
        }

        // 完成
        currentResponseContent = fullText;
        yield {
          type: 'agent:complete',
          content: fullText,
          totalSteps: stepNumber,
          totalTokens,
        };

        return;
      }

      yield {
        type: 'agent:complete',
        content: currentResponseContent ?? '',
        totalSteps: stepNumber,
        totalTokens,
      };
    } catch (error) {
      yield {
        type: 'agent:error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private buildInitialMessages(prompt: string): Message[] {
    return [
      {
        id: this.generateId(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      },
    ];
  }

  /** 等待审批决策：优先使用 onApprove 回调，否则 fallback 到 defaultApproval */
  private async waitForApproval(toolName: string, input: unknown): Promise<boolean> {
    if (this.toolApproval?.onApprove) {
      return this.toolApproval.onApprove(toolName, input);
    }
    return this.toolApproval?.defaultApproval ?? false;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
