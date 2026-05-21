# Git规范
### 宪法规范
代码的add、commit、push、merge等操作均由人类亲自操作，不允许Agent擅自操作
Agent仅作git命令的提示，人类根据提示操作即可
### 提交规范
- feat: 新增功能
- fix: 修复bug
- docs: 文档变更
- refactor: 代码重构
- style: 格式化变更
- test: 测试变更
参考示例：
```plaintext
feat(用户模块): 新增用户注册功能
```
原子性提交：
- 每个提交只可包含一个功能或修复一个bug
- 每个提交的代码不能是写到一半的代码，保证完整性
### 分支规范
- 主干分支：main或master（最新稳定版本）
- 版本分支：version-版本号，如version-4.0.0
- 功能分支：feature-版本号-开发人姓名首字母小写-功能名称，如feature-4.0.0-tl-用户登录
- 修复分支：fix-版本号-开发人姓名首字母小写-修复bug名称，如fix-4.0.0-tl-用户登录功能异常
### 协作规范
