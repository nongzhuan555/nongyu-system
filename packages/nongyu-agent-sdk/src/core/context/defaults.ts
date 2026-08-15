/** RN / SDK 默认上下文窗口（以 prompt_tokens 计） */
export const DEFAULT_MAX_TOKENS = 28000;
/** 超过该比例触发 hybrid 压缩 */
export const DEFAULT_COMPACT_THRESHOLD = 0.8;
/** 压缩后保留的最近用户轮次 */
export const DEFAULT_KEEP_LAST_N_TURNS = 6;
/** 无 tokenizer 时的字符粗估：约 4 字符 / token */
export const CHARS_PER_TOKEN_ESTIMATE = 4;
/** 摘要调用超时 */
export const SUMMARY_TIMEOUT_MS = 20_000;
/** 摘要最大输出 */
export const SUMMARY_MAX_TOKENS = 800;
