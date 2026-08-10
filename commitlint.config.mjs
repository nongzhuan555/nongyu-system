/**
 * 提交信息校验：与 .agents/rules/Git规范.md 中的 type 枚举对齐
 * 示例：feat(用户模块): 新增用户注册功能
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "refactor", "style", "test"]],
    // 中文 subject 不做大小写限制
    "subject-case": [0],
  },
};
