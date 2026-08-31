import type {
  AgentInput,
  AgentOutput,
  StepContext,
  RunConfig,
  ToolApprovalConfig,
  ToolCallRecord,
  ContextConfig,
} from "../../../types/agent";
import type { Message } from "../../../types/message";
import type { ModelProvider, ToolSchema } from "../../../types/model";
import type { Tool } from "../../../types/tool";
import type { AgentStreamChunk } from "../../../types/stream";
import { EventBus } from "../../events";
import { prepareConversationWindow } from "../../context/prepareWindow";
import { extractAndStripShowUI } from "../../tool/show-ui";
import { stopConditions, type StopCondition } from "./stop-conditions";

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
  private contextConfig: ContextConfig | undefined;

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
    contextConfig?: ContextConfig,
  ) {
    this.agentName = agentName;
    this.systemPrompt = systemPrompt;
    this.model = model;
    this.tools = tools;
    this.events = events;
    this._runConfig = runConfig;
    this.contextConfig = contextConfig;
    this.toolApproval = runConfig?.toolApproval;
    this.maxSteps = runConfig?.maxSteps ?? 20;
    this.prepareStepHook = runConfig?.prepareStep ?? (async (ctx) => ctx);
    this.stopWhen =
      runConfig?.stopWhen ??
      stopConditions.any(stopConditions.modelFinished(), stopConditions.stepCountIs(this.maxSteps));
    this.toolSchemas = Array.from(tools.values()).map((tool) => ({
      type: "function" as const,
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

    const prepared = await this.prepareTurn(input);
    if (prepared.compact) {
      this.events.emit("context:compact", {
        agentName: this.agentName,
        ...prepared.compact,
      });
    }
    const messages = [...prepared.messages];
    const toolCallRecords: ToolCallRecord[] = [];
    let totalTokens = 0;
    let stepNumber = 0;

    this.events.emit("agent:start", { agentName: this.agentName, input });

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
        this.events.emit("step:start", {
          agentName: this.agentName,
          stepNumber,
          messages: ctx.messages,
        });

        const result = await model.generateText({
          model: model.model,
          messages: this.toModelMessages(ctx.messages),
          tools: this.toolSchemas,
          temperature: this._runConfig?.temperature,
        });

        totalTokens += result.usage.total_tokens;

        // 添加 assistant 消息
        const assistantMsg: Message = {
          id: this.generateId(),
          role: "assistant",
          content: result.content ?? "",
          timestamp: Date.now(),
          toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
        };
        messages.push(assistantMsg);

        // 判断是否有工具调用
        if (result.toolCalls.length > 0) {
          // 工具调用路径
          this.events.emit("step:complete", {
            agentName: this.agentName,
            stepNumber,
            type: "tool_call",
            tokensUsed: result.usage.total_tokens,
          });

          for (const tc of result.toolCalls) {
            if (this.stopped) break;

            const tool = this.tools.get(tc.function.name);
            // 解析工具入参，剥离 A2UI 元参数 showUI
            let rawInput: unknown;
            try {
              rawInput = JSON.parse(tc.function.arguments);
            } catch {
              rawInput = tc.function.arguments;
            }
            const { showUI, input } = extractAndStripShowUI(rawInput);

            // 未找到工具则把无工具提示作为工具结果
            if (!tool) {
              const toolResult = `错误：未找到工具 "${tc.function.name}"`;
              messages.push({
                id: this.generateId(),
                role: "tool",
                content: toolResult,
                toolCallId: tc.id,
                timestamp: Date.now(),
              });
              continue;
            }

            // 检查审批——在 tool:call 事件之前（入参已无 showUI）
            if (tool.needsApproval(input)) {
              this.events.emit("tool:approval-required", {
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
                  role: "tool",
                  content: skipResult,
                  toolCallId: tc.id,
                  name: tc.function.name,
                  timestamp: Date.now(),
                });
                continue;
              }
            }

            // 审批通过后，emit tool:call
            this.events.emit("tool:call", {
              agentName: this.agentName,
              toolName: tc.function.name,
              input,
              callId: tc.id,
              renderComponent: tool.renderComponent,
              showUI,
            });

            const startTime = Date.now();
            try {
              const output = await tool.execute(input, {
                abortSignal: this.abortController!.signal,
                emit: (event, data) => {
                  this.events.emit("tool:result" as any, {
                    agentName: this.agentName,
                    toolName: tc.function.name,
                    output: { event, data },
                    duration: Date.now() - startTime,
                    callId: tc.id,
                  });
                },
                agentName: this.agentName,
              });

              const duration = Date.now() - startTime;
              this.events.emit("tool:result", {
                agentName: this.agentName,
                toolName: tc.function.name,
                output,
                duration,
                callId: tc.id,
              });

              toolCallRecords.push({
                callId: tc.id,
                toolName: tc.function.name,
                input,
                output,
                duration,
                status: "done",
                renderComponent: tool.renderComponent,
                showUI,
              });

              messages.push({
                id: this.generateId(),
                role: "tool",
                content: typeof output === "string" ? output : JSON.stringify(output),
                toolCallId: tc.id,
                name: tc.function.name,
                timestamp: Date.now(),
              });
            } catch (error) {
              this.events.emit("tool:error", {
                agentName: this.agentName,
                toolName: tc.function.name,
                error: error instanceof Error ? error : new Error(String(error)),
                callId: tc.id,
              });

              toolCallRecords.push({
                callId: tc.id,
                toolName: tc.function.name,
                input,
                duration: Date.now() - startTime,
                status: "error",
                error: error instanceof Error ? error.message : String(error),
                renderComponent: tool.renderComponent,
                showUI,
              });

              messages.push({
                id: this.generateId(),
                role: "tool",
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
        this.events.emit("step:complete", {
          agentName: this.agentName,
          stepNumber,
          type: "text",
          tokensUsed: result.usage.total_tokens,
        });
        this.events.emit("text:complete", {
          agentName: this.agentName,
          text: result.content ?? "",
        });

        const output: AgentOutput = {
          content: result.content ?? "",
          steps: stepNumber,
          tokensUsed: totalTokens,
          messages,
          toolCalls: toolCallRecords,
        };

        this.events.emit("agent:complete", {
          agentName: this.agentName,
          output,
          totalSteps: stepNumber,
          totalTokens,
        });

        return output;
      }

      // 被停止
      this.events.emit("agent:stop", {
        agentName: this.agentName,
        stepNumber,
      });

      return {
        content: "",
        steps: stepNumber,
        tokensUsed: totalTokens,
        messages,
        toolCalls: toolCallRecords,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.emit("agent:error", {
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

    const prepared = await this.prepareTurn(input);
    if (prepared.compact) {
      this.events.emit("context:compact", {
        agentName: this.agentName,
        ...prepared.compact,
      });
      yield { type: "context:compact", ...prepared.compact };
    }
    const messages = [...prepared.messages];
    const toolCallRecords: ToolCallRecord[] = [];
    let totalTokens = 0;
    let stepNumber = 0;

    yield { type: "step:start", stepNumber: 0 };

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

        yield { type: "step:start", stepNumber };

        // 流式调用
        let fullText = "";
        let toolCallsAccum: any[] = [];
        let stepPromptTokens = 0;

        for await (const delta of model.streamText({
          model: model.model,
          messages: this.toModelMessages(ctx.messages),
          tools: this.toolSchemas,
          temperature: this._runConfig?.temperature,
        })) {
          if (this.stopped) break;

          if (delta.content) {
            fullText += delta.content;
            yield {
              type: "text:delta" as const,
              delta: delta.content,
              fullText,
            };
          }

          if (delta.toolCalls) {
            // 流式 tool_call 分多个 delta 发送（先 name，后 arguments），按 index 合并
            for (const tc of delta.toolCalls) {
              const idx = tc.index ?? toolCallsAccum.length;
              if (!toolCallsAccum[idx]) {
                toolCallsAccum[idx] = { id: tc.id, type: tc.type, function: { ...tc.function } };
              } else {
                const cur = toolCallsAccum[idx];
                if (tc.id) cur.id = tc.id;
                if (tc.type) cur.type = tc.type;
                if (tc.function) {
                  if (!cur.function) cur.function = {};
                  if (tc.function.name) cur.function.name = tc.function.name;
                  if (tc.function.arguments) {
                    cur.function.arguments = (cur.function.arguments ?? "") + tc.function.arguments;
                  }
                }
              }
            }
          }

          if (delta.finishReason) {
            ctx.finishReason = delta.finishReason;
          }

          if (delta.usage) {
            stepPromptTokens = delta.usage.prompt_tokens;
            totalTokens += delta.usage.total_tokens;
          }
        }

        if (stepPromptTokens <= 0) {
          const approx = this.estimateMessagesTokens(ctx.messages);
          totalTokens += approx;
        }

        if (toolCallsAccum.length > 0) {
          // 添加 assistant 消息（包含 tool_calls），确保下一轮上下文完整
          messages.push({
            id: this.generateId(),
            role: "assistant",
            content: fullText || "",
            toolCalls: toolCallsAccum,
            timestamp: Date.now(),
          });

          // 执行工具调用（含审批检查）
          for (const tc of toolCallsAccum) {
            if (!tc.function?.name) continue;

            const tool = this.tools.get(tc.function.name);
            let rawInput: unknown;
            try {
              rawInput = JSON.parse(tc.function.arguments ?? "{}");
            } catch {
              rawInput = tc.function.arguments;
            }
            const { showUI, input } = extractAndStripShowUI(rawInput);

            if (!tool) continue;

            // 检查审批——在 tool:call 之前（入参已无 showUI）
            if (tool.needsApproval(input)) {
              this.events.emit("tool:approval-required", {
                agentName: this.agentName,
                toolName: tc.function.name,
                input,
              });

              const approved = await this.waitForApproval(tc.function.name, input);
              if (!approved) {
                messages.push({
                  id: this.generateId(),
                  role: "tool",
                  content: `工具 "${tc.function.name}" 调用已被拒绝`,
                  toolCallId: tc.id,
                  timestamp: Date.now(),
                });
                continue;
              }
            }

            // 审批通过后，emit tool:call
            yield {
              type: "tool:call",
              callId: tc.id,
              toolName: tc.function.name,
              input,
              renderComponent: tool.renderComponent,
              showUI,
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
                type: "tool:result",
                callId: tc.id,
                toolName: tc.function.name,
                output,
                duration,
              };

              toolCallRecords.push({
                callId: tc.id,
                toolName: tc.function.name,
                input,
                output,
                duration,
                status: "done",
                renderComponent: tool.renderComponent,
                showUI,
              });

              messages.push({
                id: this.generateId(),
                role: "tool",
                content: typeof output === "string" ? output : JSON.stringify(output),
                toolCallId: tc.id,
                name: tc.function.name,
                timestamp: Date.now(),
              });
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              yield {
                type: "tool:error",
                callId: tc.id,
                toolName: tc.function.name,
                error: err,
              };

              toolCallRecords.push({
                callId: tc.id,
                toolName: tc.function.name,
                input,
                status: "error",
                error: err.message,
                renderComponent: tool.renderComponent,
                showUI,
              });

              messages.push({
                id: this.generateId(),
                role: "tool",
                content: `工具执行出错: ${err.message}`,
                toolCallId: tc.id,
                name: tc.function.name,
                timestamp: Date.now(),
              });
            }
          }

          // 检查停止条件
          if (await this.stopWhen(ctx)) break;
          continue;
        }

        // 完成
        currentResponseContent = fullText;
        yield {
          type: "agent:complete",
          content: fullText,
          totalSteps: stepNumber,
          totalTokens,
        };

        return;
      }

      yield {
        type: "agent:complete",
        content: currentResponseContent ?? "",
        totalSteps: stepNumber,
        totalTokens,
      };
    } catch (error) {
      yield {
        type: "agent:error",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * 每回合第一次模型调用前：注入历史并按需 hybrid 压缩。
   */
  private async prepareTurn(input: AgentInput) {
    return prepareConversationWindow({
      history: input.history ?? [],
      prompt: input.prompt,
      llmSummary: input.llmSummary,
      llmCompactedUntilId: input.llmCompactedUntilId,
      model: this.model,
      maxTokens: this.contextConfig?.maxTokens,
      keepLastNTurns: this.contextConfig?.keepLastNTurns,
      compactThreshold: this.contextConfig?.compactThreshold,
      abortSignal: this.abortController?.signal,
    });
  }

  /** 主 systemPrompt + 本回合窗口（窗口内可含摘要 system） */
  private toModelMessages(turnMessages: Message[]) {
    return [
      { role: "system" as const, content: this.systemPrompt },
      ...turnMessages.map((m) => ({
        role: m.role as "system" | "user" | "assistant" | "tool",
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.name,
        tool_calls: m.toolCalls,
      })),
    ];
  }

  private estimateMessagesTokens(messages: Message[]): number {
    let chars = this.systemPrompt.length;
    for (const m of messages) {
      chars += m.content.length;
    }
    return Math.ceil(chars / 4);
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
