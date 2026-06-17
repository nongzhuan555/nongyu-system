import type { StepContext } from '../../../types/agent';

/**
 * 默认的 prepareStep 实现
 *
 * 不做任何修改，直接返回上下文。
 * 可通过 runConfig.prepareStep 覆盖此行为。
 */
export function defaultPrepareStep(ctx: StepContext): StepContext {
  return ctx;
}
