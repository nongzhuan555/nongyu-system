# 基于 pnpm 的单仓项目依赖管理策略（Agent必须遵守）
## 具体策略
### **根目录 package.json**
   - 只存放全仓共享的dev依赖，即只写 devDependencies
     ；绝对不写 dependencies，即运行时依赖（防止子项目隐式依赖根目录造成幽灵依赖）
   - 必须配置 "private": true（避免本项目被发布到npm仓库）
   - 版本统一使用 catalog: （统一受全局版本管理）
### **pnpm-workspace.yaml**
- 声明工作区目录
- catalog 统一管理所有第三方依赖版本（catalog 不区分 dev / 运行时，只管版本号）
  子项目通过 catalog: 统一引用，保证全仓库版本一致
### **子项目 package.json**
必须声明两类依赖：
- 运行时依赖（必须写！）
如react、axios等以及内部公共包
即使全项目共用，子项目也必须显式声明，避免
版本写 catalog:，不写具体版本号
放在子项目的 dependencies
- dev依赖
  1. 只在这个子项目使用、根目录没有的开发依赖
     例如：某个子项目专用的测试库、插件
  2. 通过导入式使用的依赖
     例如：Vite
放在子项目的 devDependencies

## 策略说明
将依赖按照使用方式分类，分别是通过命令行使用的依赖和通过导入式使用的依赖
- 通过命令行使用的依赖
  例如：tsup、oxlint、oxfmt等
- 通过导入式使用的依赖
  例如：Vite、React、Axios等
pnpm 严格禁止引用未在 package.json 中声明的包，否则会导致幽灵依赖问题
因此，反通过导入使用的依赖，不区分运行时和开发时，也不区分共享依赖还是子项目特有依赖，都必须在 package.json 中声明
（devDependencies 或 dependencies）

为什么通过命令行使用的依赖可以不写在 子项目的package.json 中？
pnpm 会递归将所有上级 workspace 的 node_modules/.bin 加入环境变量，子项目可直接执行根目录的 CLI（如 tsup/oxlint），无需在子项目声明，这是 pnpm 原生机制，无任何风险。