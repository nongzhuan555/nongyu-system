# 农屿系统仓库说明

## 概览

农屿系统仓库以monorepo的单仓架构统一存放和管理了整个农屿产品矩阵下的所有代码

**项目结构：**

```plaintext
│  AGENTS.md（Agent开发指导文档）
│  README.md（仓库说明文档）
│  
├─apps
│  ├─nongyu-node-server（农屿后端-单体node应用）
│  ├─nongyu-rn-app（农屿用户端-react native应用）
│  ├─nongyu-web-admin（农屿管理端-react网页应用）
│  └─nongyu-web-site（农屿官网-原生HTML应用）
├─old-code（存量项目文件-作为Agent迁移的参考代码）
└─packages
    ├─nongyu-agent-cli（农屿Agent命令行工具-node.js应用）
    ├─nongyu-agent-gui（农屿Agent图形界面工具-react小应用）
    ├─nongyu-agent-sdk（农屿AgentSDK-纯JS工具库-跨node和web）
    ├─nongyu-tool-jiaowu（农屿工具-川农教务）
    └─nongyu-tool-second（农屿工具-川农二课）
```



