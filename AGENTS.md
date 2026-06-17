# Agent开发指导文档-农屿系统
### Coding Agent必须遵循的规则集合
参考/.agents/rules/
### Coding Agent必须遵循的开发规范
参考/.agents/rules/开发规范.md
### Coding Agent必须遵循的编码规范
参考/.agents/rules/代码规范.md
### 项目背景
参考./README.md
### 项目架构
参考./README.md
### 项目技术栈
参考./docs/common/全局技术选型总览.md
### 依赖管理策略
参考./docs/common/基于pnpm的monorepo项目依赖管理策略指导.md
### UI设计准则
Agent产生的任何结构和样式类的代码都必须严格遵循以下设计准则：
- 参考./design-system/web-admin/MASTER.md（农屿Web后台管理端设计准则）
- 参考./design-system/rn-app/MASTER.md（农屿RN App 设计准则）
- 参考./design-system/web-site/MASTER.md（农屿Web品牌官网设计准则）
### Coding Agent可使用的Skills集合
参考/.agents/skills/
### 项目所使用的Skills集合以及注意事项
- /.agents/skills/ui-ux-pro-max/（只能由用户手动调起用于设计UI系统，不能自动调起）
- /.agents/skills/react-best-practices/（React 核心开发规范，隐式自动触发）
- /.agents/skills/react-performance-expert/（React 性能优化准则，隐式自动触发）
- /.agents/skills/react-hooks-patterns/（React Hooks 与状态模式准则，包含 React 19 特性，隐式自动触发）
- /.agents/skills/tailwind-css-master/（Tailwind CSS 最佳实践与工程化准则，隐式自动触发）
- /.agents/skills/sdd-guidelines/（规格驱动开发指导准则）

