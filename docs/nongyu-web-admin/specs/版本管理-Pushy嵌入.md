# Spec：管理端「版本管理」Pushy iframe 嵌入

| 项        | 内容                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 应用      | `apps/nongyu-web-admin`                                                 |
| 需求类型  | **业务**                                                                |
| PRD 依据  | 对话约定（侧栏「版本管理」= iframe 套 Pushy 官网）；无独立 forhuman PRD |
| 视觉准则  | `design-system/web-admin/MASTER.md`                                     |
| 前置 Spec | `登录与管理端壳.md`                                                     |
| 状态      | **已实现**（2026-08-16）                                                |
| 说明      | **跳过独立 tech / plans**；不接自研 `app_versions` API                  |

---

## 1. 背景

App 热更与发版已走 Pushy；运营需要在农屿管理端快捷进入 Pushy 控制台，无需自研版本 CRUD UI。用侧栏菜单 + 页内 iframe 嵌入官网即可。

**Why**：减少上下文切换，版本运营入口统一在管理台。  
**What**：侧栏「版本管理」页，主体为 Pushy 官网 iframe，并提供新窗口打开兜底。  
**不做什么**：不对接 Node `/api/admin/app-versions`；不做自研发版表单。

---

## 2. 目标

1. 侧栏新增菜单项「版本管理」，进入后展示嵌入的 Pushy 页面。
2. 需管理端登录（与现有壳层路由守卫一致）。
3. 若目标站禁止嵌套导致 iframe 空白，用户仍可通过「在新窗口打开」使用 Pushy。
4. 窄屏可用：iframe 占满内容区剩余高度；触摸热区符合壳层既有约定。

---

## 3. 边界（非目标）

- 不调用、不展示自研 `app_versions` 列表/发布接口。
- 不代理 Pushy、不存 Pushy 账号密码、不做 SSO。
- 不改造 RN / Node 版本基建。
- 不保证 Pushy 全站子路径均可被 iframe（依赖对方响应头）；空白时靠外链兜底即可。
- 不写独立技术方案文档。

---

## 4. 详细需求

### 4.0 Grill 共识

| 决策       | 结论                                                                |
| ---------- | ------------------------------------------------------------------- |
| iframe URL | `https://pushy.reactnative.cn/`（常量可改，集中一处）               |
| 路由       | `/versions`                                                         |
| 菜单位置   | 侧栏**末项**；顺序：… → LLM Key 池 → **版本管理**                   |
| 权限       | 仅需已登录 Admin；无额外角色                                        |
| 自研 API   | 不接                                                                |
| 兜底       | 页内提示 +「在新窗口打开 Pushy」外链（`target=_blank`，`rel` 安全） |

### 4.1 路由与菜单

| 项       | 要求                                      |
| -------- | ----------------------------------------- |
| 路径     | `ROUTES.versions = "/versions"`           |
| 菜单文案 | 版本管理                                  |
| 图标     | `CloudUploadOutlined`（或同级语义图标）   |
| 顶栏标题 | 版本管理                                  |
| 路由注册 | `AppRouter` 内 Admin 壳下增加对应 `Route` |

### 4.2 页面 UI

1. 内容区顶部一行次要说明（约）：热更新与发版请在下方 Pushy 控制台操作；若无法显示请点右侧外链。
2. 「在新窗口打开 Pushy」链接/按钮，指向同一 URL。
3. 主体：`iframe`，`src` 为约定 URL；`title` 有障碍可读文案（如「Pushy 版本管理」）。
4. 布局：白底圆角卡片或与管理端内容区一致的容器；iframe **纵向占满** `main` 剩余视口高度（避免仅一小块），PC / 窄屏均可滚动外壳但不强制双滚动打架。
5. 不引入新 npm 依赖。

### 4.3 安全与体验

- iframe 使用默认沙箱策略即可（无需过度收紧导致无法登录 Pushy）；若后续安全审计要求再收紧。
- 外链：`target="_blank"` + `rel="noopener noreferrer"`。
- 不在管理端存储 Pushy cookie（由 iframe 第三方站点自行处理）。

---

## 5. 业务流程

```text
管理员登录 → 侧栏点「版本管理」→ 进入 /versions
  → 页内 iframe 加载 Pushy
  → 可在 iframe 内登录/操作（若对方允许嵌套）
  → 若空白 → 点「在新窗口打开 Pushy」
```

---

## 6. 验收标准

| #   | 场景                       | 期望                                       |
| --- | -------------------------- | ------------------------------------------ |
| 1   | 已登录点「版本管理」       | 进入 `/versions`，顶栏标题正确，侧栏高亮   |
| 2   | 未登录直接访问 `/versions` | 被守卫重定向登录（与其它业务页一致）       |
| 3   | 页面展示                   | 可见说明 + 外链 + iframe 区域占较高内容区  |
| 4   | 外链                       | 新标签打开 `https://pushy.reactnative.cn/` |
| 5   | 窄屏                       | 菜单可进；页面可操作，无横向严重撑破       |

---

## 7. 实现落点（约束）

- `src/lib/constants.ts`：增加 `ROUTES.versions` 与可选 `PUSHY_CONSOLE_URL` 常量
- `src/layouts/AdminShell.tsx`：菜单项 + `PAGE_TITLES`
- `src/routes/AppRouter.tsx`：注册路由
- `src/pages/VersionsPage.tsx`（新建）：说明条 + 外链 + iframe

实现后将本 Spec 状态改为 **已实现**。
