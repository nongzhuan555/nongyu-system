import type { Agent, AgentConfig, AgentState, AgentStatus, AgentInput, AgentOutput } from '../../types/agent';
import type { AgentEventMap, AgentEventHandler } from '../../types/events';
import type { AgentStreamChunk } from '../../types/stream';
import type { Tool } from '../../types/tool';
import type { ModelProvider } from '../../types/model';
import { EventBus } from '../events';
import { AgentLoop } from './loop';
import { agentAsTool } from './sub-agent';

/**
 * Agent 内部实现类
 *
 * 遵循 Prompt + Tools = Agent 的核心理念，通过组合构造能力。
 * 维护独立的 EventBus、ContextManager 和 AgentLoop 引擎。
 */
export class AgentImpl implements Agent {
  public readonly name: string;
  public readonly description: string;
  private systemPrompt: string;
  private model: ModelProvider;
  private tools: Map<string, Tool> = new Map();
  private events: EventBus = new EventBus();
  private loop: AgentLoop;
  private _state: AgentState;
  private abortController: AbortController | null = null;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.systemPrompt = config.systemPrompt;

    // 检查模型配置
    if (!config.model) {
      throw new Error(`Agent "${config.name}" 必须配置 model`);
    }
    this.model = config.model;

    // 注册工具
    if (config.tools) {
      for (const tool of Object.values(config.tools)) {
        this.tools.set(tool.name, tool);
      }
    }

    // 注册子 Agent（自动包装为 Tool）
    if (config.subAgents) {
      for (const subAgent of config.subAgents) {
        const tool = agentAsTool(subAgent);
        this.tools.set(tool.name, tool);
      }
    }

    // 初始化状态
    this._state = {
      status: 'idle',
      currentStep: 0,
      totalTokens: 0,
      messages: [],
    };

    // 创建运行循环引擎
    this.loop = new AgentLoop(
      this.name,
      this.systemPrompt,
      this.model,
      this.tools,
      this.events,
      config.runConfig,
    );

    // 监听状态变更事件，更新状态
    this.events.on('agent:start', () => this.updateStatus('thinking'));
    this.events.on('tool:call', () => this.updateStatus('tool-calling'));
    this.events.on('agent:complete', () => this.updateStatus('completed'));
    this.events.on('agent:stop', () => this.updateStatus('stopped'));
    this.events.on('agent:error', () => this.updateStatus('error'));
  }

  get state(): Readonly<AgentState> {
    return this._state;
  }

  async complete(input: AgentInput): Promise<AgentOutput> {
    this.resetState();
    this.updateStatus('thinking');

    try {
      const result = await this.loop.run(input);
      this._state.messages = result.messages;
      this._state.totalTokens = result.tokensUsed;
      this._state.currentStep = result.steps;
      return result;
    } catch (error) {
      this.updateStatus('error');
      this._state.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  async *stream(input: AgentInput): AsyncIterable<AgentStreamChunk> {
    this.resetState();
    this.updateStatus('streaming');

    try {
      for await (const chunk of this.loop.runStream(input)) {
        if (chunk.type === 'agent:complete') {
          this._state.currentStep = chunk.totalSteps;
          this._state.totalTokens = chunk.totalTokens;
          this.updateStatus('completed');
        } else if (chunk.type === 'agent:error') {
          this.updateStatus('error');
          this._state.error = chunk.error;
        }
        yield chunk;
      }
    } catch (error) {
      this.updateStatus('error');
      this._state.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  stop(): void {
    this.loop.stop();
    this.updateStatus('stopped');
  }

  use(tool: Tool): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 "${tool.name}" 已存在}`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  // 注册子 Agent 作为工具
  useSubAgent(agent: Agent): this {
    const tool = agentAsTool(agent);
    if (this.tools.has(tool.name)) {
      throw new Error(`子 Agent "${tool.name}" 已注册`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  on<E extends keyof AgentEventMap>(event: E, handler: AgentEventHandler<E>): void {
    this.events.on(event, handler as AgentEventHandler<typeof event>);
  }

  off<E extends keyof AgentEventMap>(event: E, handler: AgentEventHandler<E>): void {
    this.events.off(event, handler as AgentEventHandler<typeof event>);
  }

  private updateStatus(status: AgentStatus): void {
    this._state.status = status;
    this.events.emit('state:change', {
      agentName: this.name,
      state: { ...this._state },
    });
  }

  private resetState(): void {
    this._state = {
      status: 'idle',
      currentStep: 0,
      totalTokens: 0,
      messages: [],
    };
  }
}

/**
 * 创建 Agent 的工厂函数
 *
 * @example
 * // 创建主 Agent
 * const agent = createAgent({
 *   name: 'nongyu-assistant',
 *   description: '农屿智能助手',
 *   systemPrompt: '你是农屿系统的智能助手...',
 *   model: new OpenAIProvider({ ... }),
 *   tools: { calculator: calculatorTool },
 *   subAgents: [jiaowuAgent, secondAgent],
 * });
 */
export function createAgent(config: AgentConfig): Agent {
  return new AgentImpl(config) as unknown as Agent;
}
