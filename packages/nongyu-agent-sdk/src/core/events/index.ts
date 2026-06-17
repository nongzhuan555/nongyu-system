import mitt, { type Emitter } from 'mitt';
import type { AgentEventMap, AgentEvent, AgentEventHandler } from '../../types/events';

/**
 * 基于 mitt 的 Agent 事件总线
 *
 * 提供类型安全的事件发布/订阅能力，每个 Agent 实例维护独立的 EventBus。
 */
export class EventBus {
  private emitter: Emitter<AgentEventMap>;

  constructor() {
    this.emitter = mitt<AgentEventMap>();
  }

  /** 发布事件 */
  emit<E extends AgentEvent>(event: E, payload: AgentEventMap[E]): void {
    this.emitter.emit(event, payload);
  }

  /** 订阅事件 */
  on<E extends AgentEvent>(event: E, handler: AgentEventHandler<E>): void {
    this.emitter.on(event, handler);
  }

  /** 取消订阅 */
  off<E extends AgentEvent>(event: E, handler: AgentEventHandler<E>): void {
    this.emitter.off(event, handler);
  }

  /** 清空所有事件监听 */
  clear(): void {
    this.emitter.all.clear();
  }
}
