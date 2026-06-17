/**
 * StdioChannel - 控制台交互通道
 *
 * 用于本地调试，通过 stdin/stdout 与 Agent 交互。
 * 仅支持 Node.js 环境 (使用 readline 模块)。
 */

import * as readline from 'node:readline';
import type {
  ChannelPlugin,
  ChannelMeta,
  ChannelCapabilities,
  InboundEnvelope,
  OutboundEnvelope,
} from '../../../types/channel';

export interface StdioChannelOptions {
  /** 通道 ID，默认 'stdio' */
  id?: string;
  /** 显示名称 */
  name?: string;
  /** 输入提示符 */
  prompt?: string;
  /** 自定义前缀，用于区分 Agent 输出 */
  agentPrefix?: string;
  /** 退出命令关键字 (输入该命令则停止)，默认 '/exit' */
  exitCommand?: string;
}

export interface StdioChannelResolvedOptions {
  id: string;
  name: string;
  prompt: string;
  agentPrefix: string;
  exitCommand: string;
}

export class StdioChannel implements ChannelPlugin {
  public readonly meta: ChannelMeta;
  public readonly capabilities: ChannelCapabilities = {};

  private rl: readline.Interface | null = null;
  private messageHandler: ((envelope: InboundEnvelope) => Promise<void>) | null = null;
  private running = false;
  private options: StdioChannelResolvedOptions;
  private conversationId: string;
  private messageSeq = 0;

  private static readonly DEFAULTS: StdioChannelResolvedOptions = {
    id: 'stdio',
    name: '控制台',
    prompt: '\n> ',
    agentPrefix: '\n[Agent] ',
    exitCommand: '/exit',
  };

  constructor(options: StdioChannelOptions = {}) {
    this.options = {
      id: options.id ?? StdioChannel.DEFAULTS.id,
      name: options.name ?? StdioChannel.DEFAULTS.name,
      prompt: options.prompt ?? StdioChannel.DEFAULTS.prompt,
      agentPrefix: options.agentPrefix ?? StdioChannel.DEFAULTS.agentPrefix,
      exitCommand: options.exitCommand ?? StdioChannel.DEFAULTS.exitCommand,
    };

    this.meta = {
      id: this.options.id,
      name: this.options.name,
      description: '标准输入输出控制台交互通道，用于本地调试',
    };

    this.conversationId = `${this.meta.id}:session_${Date.now()}`;
  }

  async start(): Promise<void> {
    this.running = true;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.printWelcome();
    this.rl.setPrompt(this.options.prompt);
    this.rl.prompt();

    this.rl.on('line', (line: string) => {
      this.handleLine(line);
    });

    this.rl.on('close', () => {
      this.running = false;
    });

    // 监听 SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.println('\n收到中断信号，正在退出...');
      this.stop();
    });

    // 等待 rl 关闭
    await new Promise<void>((resolve) => {
      this.rl!.on('close', resolve);
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    process.exit(0);
  }

  onMessage(handler: (envelope: InboundEnvelope) => Promise<void>): void {
    this.messageHandler = handler;
  }

  async send(envelope: OutboundEnvelope): Promise<void> {
    const content = envelope.content;
    // 格式化输出：用 agentPrefix 前缀
    this.println(`${this.options.agentPrefix}${content}`);
    // 恢复输入提示
    if (this.rl && this.running) {
      this.rl.prompt();
    }
  }

  // ===== 内部方法 =====

  private async handleLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) {
      this.rl?.prompt();
      return;
    }

    // 退出命令
    if (trimmed === this.options.exitCommand) {
      this.println('再见！');
      await this.stop();
      return;
    }

    // 构建入站消息
    const envelope: InboundEnvelope = {
      id: `${this.meta.id}_msg_${++this.messageSeq}`,
      channel: this.meta.id,
      conversationId: this.conversationId,
      from: {
        id: 'console-user',
        name: 'Console',
      },
      text: trimmed,
      timestamp: Date.now(),
      isGroup: false,
      raw: trimmed,
    };

    if (this.messageHandler) {
      try {
        this.println(''); // 换行
        await this.messageHandler(envelope);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.println(`\n[错误] ${msg}`);
        this.rl?.prompt();
      }
    } else {
      this.println('\n[提示] 未注册消息处理器，请先配置 Agent');
      this.rl?.prompt();
    }
  }

  private printWelcome(): void {
    this.println('═══════════════════════════════════════');
    this.println('  农屿 Agent SDK - 控制台调试通道');
    this.println('═══════════════════════════════════════');
    this.println(`  输入消息与 Agent 对话`);
    this.println(`  输入 "${this.options.exitCommand}" 退出`);
    this.println('═══════════════════════════════════════');
  }

  private println(text: string): void {
    process.stdout.write(text + '\n');
  }
}
