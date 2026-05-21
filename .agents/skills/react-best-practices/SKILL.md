---
name: react-best-practices
description: "行业标准的 React 开发指南，专注于可维护性、可扩展性和整洁代码。基于 Bulletproof React (25k stars) 和 Airbnb 风格指南。在创建组件、构建功能或重构 React 代码时使用此 Skill。"
---

# React 最佳实践

构建专业级 React 应用的指导原则。

## 何时应用
- 创建新的 React 组件或功能时。
- 为了更好的可维护性重构现有代码时。
- 设置项目结构和文件组织时。
- 进行 React 标准的代码评审时。

## 核心规则

### 1. 组件设计
- **单一职责**：每个组件应只做一件事。如果组件过大（>200 行），请进行拆分。
- **组合优于继承**：使用 `children` 和专门的组件，而不是复杂的 Props 驱动逻辑。
- **函数式组件**：始终使用带有 Hooks 的函数式组件。不要使用类组件。

### 2. TypeScript 集成
- **明确 Props**：为组件 Props 使用 `interface`。避免使用 `any`。
- **命名一致性**：组件使用 `PascalCase`，Hooks 和函数使用 `camelCase`。

### 3. 项目结构 (基于功能/Feature)
- 按功能组织代码（如 `features/auth`, `features/profile`），而不是仅按类型（如 `components/`, `hooks/`）。
- 每个功能应包含其自己的组件、Hooks 和类型。

### 4. 整洁代码
- **Fragment**：使用 `<>...</>` 避免不必要的 DOM 节点。
- **解构**：在函数签名层面解构 Props。
- **导出方式**：组件优先使用具名导出（Named Exports），以改善重构体验和 IDE 支持。

---
**参考资料**: [Bulletproof React](https://github.com/alan2207/bulletproof-react), [Airbnb React 风格指南](https://github.com/airbnb/javascript/tree/master/react)
