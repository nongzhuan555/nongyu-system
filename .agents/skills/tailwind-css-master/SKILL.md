---
name: tailwind-css-master
description: "高级 Tailwind CSS 样式指南。涵盖原子化模式、响应式设计、类名合并策略和性能优化。在构建 UI 组件、布局或实现设计系统时使用此 Skill。"
---

# Tailwind CSS 大师

构建可扩展且易于维护的 Tailwind CSS 样式的专业指南。

## 何时应用
- 使用 Tailwind 创建或装饰 React 组件时。
- 构建响应式布局（移动优先）时。
- 实现深色模式或基于主题的样式时。
- 重构复杂的类名字符串以提高可读性时。

## 核心规则

### 1. 类名组织 (Prettier 标准)
遵循官方建议的工具类顺序：
1. **布局 (Layout)**：`position`, `z-index`, `top/right/bottom/left`, `display`, `flex`, `grid` 等。
2. **间距 (Spacing)**：`margin`, `padding`, `gap`。
3. **排版 (Typography)**：`font-size`, `font-weight`, `text-align` 等。
4. **视觉 (Visuals)**：`background-color`, `border`, `rounded`, `shadow`。
5. **交互/状态 (States)**：`hover:`, `focus:`, `active:`, `disabled:`。

### 2. 响应式设计 (移动优先)
- 始终先编写基础样式（移动端）。
- 仅使用前缀（`sm:`, `md:`, `lg:`, `xl:`）来覆盖大屏幕的样式。
- 除非绝对必要，否则避免使用“max-width”逻辑。

### 3. 动态类处理
- **禁止字符串插值**：严禁使用 `text-${color}-500`。Tailwind 的 JIT 引擎无法扫描此类代码。
- **完整类名**：始终使用完整的类名，例如 `color === 'red' ? 'text-red-500' : 'text-blue-500'`。
- **类名合并**：使用 `cn()` 工具函数（结合 `clsx` 和 `tailwind-merge`）来处理条件类并避免冲突。

### 4. 组件模式
- **样式提取**：将样式提取到 React 组件中，而不是使用 `@apply` 提取到 CSS 文件。
- **设计令牌**：使用 `@theme` (Tailwind v4) 或 `tailwind.config.js` (v3) 来维护间距、颜色和阴影的一致性。
- **无障碍性**：确保所有交互元素都有可见的 `focus-visible` 状态，并处理 `disabled` 状态的透明度和光标。

### 5. 性能
- **任意值**：谨慎使用 `[123px]`。如果一个值被使用超过两次，请将其添加到主题中。
- **清除安全**：保持类名完整，以确保它们在生产构建中不会被清除（Purge）。

---
**参考资料**: [Tailwind CSS 文档](https://tailwindcss.com/docs), [Tailwind Merge](https://github.com/dcastil/tailwind-merge)
