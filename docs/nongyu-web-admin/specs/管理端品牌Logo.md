# Spec：管理端品牌 Logo

| 项       | 内容                                                          |
| -------- | ------------------------------------------------------------- |
| 应用     | `apps/nongyu-web-admin`                                       |
| 需求类型 | **业务**                                                      |
| PRD      | `docs/forhuman/rawprds/nongyu-web-admin/管理端品牌LogoPRD.md` |
| 状态     | **已实现**                                                    |
| 技术方案 | 本期跳过                                                      |

---

## 1. 背景

**Why**：标签栏与壳层品牌位未使用农屿正式 logo。  
**What**：favicon + 侧栏品牌 + 登录页品牌统一为 RN 同源农屿 logo。

---

## 2. 目标

1. `index.html` favicon 指向 `public/favicon.png`（农屿 logo 缩略）。
2. `public/nongyu-logo.png` 供 UI 引用。
3. `BrandBlock`（展开 / 收起）展示 logo；展开时仍可保留「管理台」文案。
4. `LoginPage` 标题区展示 logo。

---

## 3. 边界

- 不替换业务菜单 Ant Design 图标。
- 不改智慧助手抽屉内功能按钮图标。
- 不同步改 `nongyu-web-site`（本期仅管理台）。
- 不强制生成 `.ico`（PNG favicon 即可）。

---

## 4. 验收

1. 浏览器标签显示农屿 logo。
2. 侧栏展开 / 收起可见 logo。
3. 登录页可见 logo。
4. 用户管理等菜单图标仍为 Ant Design，未被 logo 替换。
