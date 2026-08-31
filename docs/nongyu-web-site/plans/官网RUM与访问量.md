# 实施计划：官网 Web Vitals RUM + PV + 大屏

| 项    | 内容                                                      |
| ----- | --------------------------------------------------------- |
| Specs | Track Web 上报 / 官网 RUM+PV / 大屏 WebVitals与PV         |
| Tech  | `docs/nongyu-web-site/tech/官网Web-Vitals-RUM技术方案.md` |
| 状态  | **已实现**                                                |

## 顺序

1. `nongyu-track-contract`：`platform` 含 `web`；可选导出 Web 白名单常量
2. `nongyu-node-track-server`：migration platform=web；Web ingest；dims/overview 过滤；nginx example CORS；单测
3. `nongyu-node-server`：dims 透传 platform/namePrefix；overview `webScreenViewCount`
4. `nongyu-web-site`：beacon + pageView + web-vitals；env example；依赖
5. `nongyu-web-admin`：KPI + chart-web-vitals；布局 merge

## 注意

- Web Writer：`userId=0` + `skipPresence`
- Site Key 空则 Web 口关闭
- 大屏与 App 卡隔离靠 `platform=web`
