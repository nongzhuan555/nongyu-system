import type { StepContext } from '../../../types/agent';

export type StopCondition = (ctx: StepContext) => boolean | Promise<boolean>;

/**
 * 内置停止条件集合
 */
export const stopConditions = {
  /** 达到指定步数时停止 */
  stepCountIs(n: number): StopCondition {
    return (ctx) => ctx.stepNumber >= n;
  },

  /** 模型返回 final 状态时停止 */
  modelFinished(): StopCondition {
    return (ctx) => ctx.finishReason === 'stop';
  },

  /** 模型因长度截断时也停止 */
  modelTruncated(): StopCondition {
    return (ctx) => ctx.finishReason === 'length';
  },

  /** 任意条件满足即停止 */
  any(...conditions: StopCondition[]): StopCondition {
    return async (ctx) => {
      for (const c of conditions) {
        if (await c(ctx)) return true;
      }
      return false;
    };
  },

  /** 所有条件同时满足才停止 */
  all(...conditions: StopCondition[]): StopCondition {
    return async (ctx) => {
      for (const c of conditions) {
        if (!(await c(ctx))) return false;
      }
      return true;
    };
  },
};
