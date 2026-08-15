# nongyu-tool-second

农屿二课（i川农）工具库：登录会话 + 只读查询。可供 RN App 直接调用，也可由 `nongyu-agent-sdk` 封装为 LLM Tool。

## 安装

```bash
pnpm --filter nongyu-tool-second build
```

RN / Agent SDK 通过 workspace 依赖引用：

```json
"nongyu-tool-second": "workspace:*"
```

改源码后必须重新 `build`（消费方加载 `dist/`）。

## Base URL

现网：`https://jk.sicau.edu.cn`（常量 `SECOND_BASE_URL`）。

鉴权：登录拿 `token`，后续请求头 `x-access-token`。

学校 sid：`SICAU_SCHOOL_SID`（川农固定）。

## 快速开始

```ts
import {
  secondLogin,
  setLoginData,
  getPersonalSecondInfo,
  listActivities,
  getActivityDetail,
  clearLoginData,
} from "nongyu-tool-second";

const login = await secondLogin("学号", "密码");
if (!login.success) throw new Error(login.message);

const personal = await getPersonalSecondInfo(1);
const list = await listActivities({ page: 1, actName: "志愿" });
if (list.success && list.result[0]) {
  const id = (list.result[0] as { id: number }).id;
  await getActivityDetail(id);
}

clearLoginData();
```

冷启动也可：`setLoginData` + `setAccessToken(本地备份的 token)`，业务请求遇鉴权失败会自动 `secondLogin()` 重放一次。

## 导出一览（本轮代码）

| 导出                                                                                    | 说明                              |
| --------------------------------------------------------------------------------------- | --------------------------------- |
| `secondLogin` / `setLoginData` / `clearLoginData` / `getAccessToken` / `setAccessToken` | 会话                              |
| `getUserInfo`                                                                           | 用户信息                          |
| `getReportCard`                                                                         | 成绩单（综测/排名/分布）          |
| `getActivityHoursDetail`                                                                | 修分情况                          |
| `getImportCreditDetail`                                                                 | 附加分                            |
| `getPersonalSecondInfo`                                                                 | 上三者聚合                        |
| `listActivities`                                                                        | 活动列表（关键词/部落/分类/排序） |
| `getActivityDetail`                                                                     | 活动详情                          |
| `getSchoolActTypes` / `getSchoolGroups`                                                 | 分类树 / 部落                     |
| `attachSecondHttpLogger`                                                                | 开发态请求日志挂载点              |

返回形状统一：`{ success, result, message? }`。

## 不在本包代码中的接口

报名 / 取消报名（`updateActMemberStatus`）**仅文档保留**，见：

- `docs/nongyu-rn-app/tech/二课接口清单-旧版农屿.md` §3
- 本包 `TECH.md`

## Agent

LLM Tool 封装在 `nongyu-agent-sdk` → `ExternalTools/second-tools.ts`（登录不封装为 tool）。
