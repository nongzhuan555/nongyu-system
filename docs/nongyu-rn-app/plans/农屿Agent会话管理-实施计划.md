# 农屿 Agent 会话管理 - 实施计划

| 项        | 内容                                                                |
| --------- | ------------------------------------------------------------------- |
| 版本      | v0.1（已实施）                                                      |
| 日期      | 2026-08-15                                                          |
| 需求类型  | 基建                                                                |
| 上游 Spec | `docs/nongyu-rn-app/specs/农屿Agent会话管理.md`                     |
| 上游 PRD  | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent会话管理PRD.md` |
| 关联      | `apps/nongyu-rn-app`（主）；不改 SDK AgentLoop                      |
| 技术方案  | 本期跳过                                                            |

---

## 0. 阅读前提

本计划是 SDD 步骤 4。Spec 已确认；无独立 tech 文档。实现以 Spec 行为为契约，本计划只排 HOW 与落地顺序。

---

## 1. 基线决策

| #   | 事项    | 采用                                                             | 说明                                           |
| --- | ------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| 1   | 存储    | MMKV `appStorage`                                                | 与课表等本地数据一致                           |
| 2   | 分桶    | `studentId`                                                      | 无学号不写盘                                   |
| 3   | 切会话  | `key={sessionId\|\|"draft"}` remount `useAgentChat`              | 不改 SDK 导出 `setMessages`                    |
| 4   | 抽屉    | 自研左侧 Overlay（Animated + 遮罩）                              | 无现成 Drawer；不引 `@react-navigation/drawer` |
| 5   | 单删    | **左滑删除**（优先）；长按不作为本期必做                         | 降低交互分叉                                   |
| 6   | 欢迎语  | 落盘时**不持久化**欢迎语；恢复时若首条非欢迎则在 UI 层不强制插入 | 避免重复欢迎；续聊直接展示历史                 |
| 7   | 活跃 id | 与会话列表同桶持久化                                             | 回 `/ai` 可恢复                                |

---

## 2. 范围

### 2.1 本期交付

1. Agent 会话本地仓库（CRUD + LRU 10 + 活跃 id + 按学号 clear）
2. 登出 / Token 失效路径挂钩清除
3. AI 页顶栏（抽屉 / 标题 / 新对话）+ 左侧会话抽屉 UI
4. `AiChatPanel` 与仓库联动：创建、增量保存、切换、草稿、生成中 stop 再切

### 2.2 不做

- 云同步、重命名、搜索、置顶、AI 起标题
- 改 `nongyu-agent-sdk` AgentLoop
- 独立 tech 文档

---

## 3. 实施阶段

### S1 · 会话仓库（无 UI）

| 任务                                                                                                                     | 建议路径                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 类型：`AgentChatSession` 元数据 + `messages`                                                                             | `src/agent/session/types.ts`                         |
| MMKV key：`agent:sessions:{studentId}`、`agent:active_session:{studentId}`                                               | `src/agent/session/storage.ts` 或并入 `mmkv.ts` 常量 |
| API：`listSessions` / `getSession` / `upsertSession` / `deleteSession` / `clearSessions` / `getActiveId` / `setActiveId` | `src/agent/session/repository.ts`                    |
| 标题截断、LRU 淘汰（写入前若 ≥10 且非更新已有 id 则删最旧）                                                              | 同上                                                 |
| `touchSession(id)` 更新 `lastUsedAt`                                                                                     | 同上                                                 |

- **退出**：纯函数/仓库可被手工或临时调用验证；序列化 round-trip 不丢 `toolCalls`。

### S2 · 登出挂钩

| 任务                                                                      | 文件                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| `clearAgentChatSessions(studentId?)`：有学号清该桶，登出前从 store 取学号 | `src/agent/session/repository.ts`               |
| `performJiaowuLogout`、`clearLocalAuthSession` 调用清除                   | `performJiaowuLogin.ts`、`handleAuthInvalid.ts` |

- **退出**：登出后 MMKV 无 `agent:sessions:*` / `agent:active_session:*` 残留（该用户）。

### S3 · 抽屉 UI

| 任务                                                               | 建议路径                              |
| ------------------------------------------------------------------ | ------------------------------------- |
| `SessionDrawer`：遮罩 + 左滑入动画 + 顶「新对话」+ 分组列表 + 空态 | `src/agent/session/SessionDrawer.tsx` |
| 分组：今天 / 昨天 / 更早（按 `updatedAt`）                         | util 同目录                           |
| 左滑删除单条；「清空全部」→ `confirm`                              | 同上                                  |
| 当前会话高亮                                                       | 同上                                  |

- **退出**：可独立用 mock 列表打开/关闭/删/清空（可先接真仓库）。

### S4 · AI 页接线

| 任务                                                                        | 文件                            |
| --------------------------------------------------------------------------- | ------------------------------- |
| 顶栏左/右按钮；受控 `drawerOpen`                                            | `app/ai.tsx`                    |
| 读取 `studentId`；无学号时仅草稿                                            | `ai.tsx` + session store        |
| `AiChatPanel`：`activeSessionId` state；`key` remount；`onMessagesPersist`  | `ai.tsx` 或拆 `AiChatPanel.tsx` |
| 首条用户消息 → `upsert` 创建；之后 `isLoading` 变 false / `stop` 后 persist | 同上                            |
| 打开历史 → `touch` + setActive + remount                                    | 同上                            |
| 新对话 → active=null，欢迎语草稿                                            | 同上                            |
| 生成中切换：`stop()` → persist → 再切                                       | 同上                            |
| 进入页：按 active id hydrate                                                | `useFocusEffect` / mount        |

- **退出**：满足 Spec §7 检查清单（人工点验）。

### S5 · 质量门禁

| 任务                              | 命令/动作                                                         |
| --------------------------------- | ----------------------------------------------------------------- |
| lint / type-check / format        | `pnpm lint`、`pnpm type-check`、`pnpm format`（或 filter rn-app） |
| Spec 状态改为已落地（实现完成后） | Spec 文档                                                         |
| 人工按 Spec §7 回归               | —                                                                 |

---

## 4. 关键数据流（实现草图）

```
AiScreen
  ├─ Header [drawer] [农屿 AI] [new]
  ├─ SessionDrawer ← listSessions(studentId)
  └─ AiChatPanel key={activeId ?? "draft"}
        useAgentChat({ initialMessages })
        effect/消息变更 → upsertSession（已落盘或达创建条件）
```

持久化触发（最小集）：

1. 检测到「首次出现 user 消息」且尚无 sessionId → create + setActive
2. `isLoading`：true→false，或调用 `stop` 之后 → upsert messages
3. 切走前若正在 loading → stop + upsert

---

## 5. 风险与注意

| 风险                      | 缓解                                                    |
| ------------------------- | ------------------------------------------------------- |
| `messages` 含不可 JSON 值 | 落盘前 `JSON.parse(JSON.stringify)`；失败 toast，不白屏 |
| 欢迎语重复                | 落盘不含欢迎；草稿才注入 `buildWelcomeMessage`          |
| 无 studentId              | 不写 MMKV；仅内存草稿                                   |
| 抽屉手势与返回            | 遮罩点击关闭；Android 返回优先关抽屉                    |
| 左滑与列表滚动冲突        | 使用成熟滑动行模式或限制仅右侧露出删除                  |

---

## 6. 验收映射

| Spec 验收            | 对应阶段 |
| -------------------- | -------- |
| 杀进程续聊 / tool 卡 | S1+S4    |
| 10 条 LRU            | S1       |
| 删/清空              | S3+S4    |
| 登出清空             | S2       |
| 顶栏+抽屉+新对话     | S3+S4    |
| 草稿不落盘           | S4       |
| 回页恢复活跃         | S1+S4    |

---

## 7. 审核清单（请确认）

- [ ] 单删本期只做左滑、不做长按 — OK？
- [ ] 欢迎语不落盘 — OK？
- [ ] 自研 Overlay 抽屉、不引 navigation drawer — OK？
- [ ] 阶段顺序 S1→S5 可开编 — OK？
