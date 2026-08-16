# 实施计划：课表交互 UI 功能系列优化

| 项       | 内容                                                 |
| -------- | ---------------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/课表交互UI功能系列优化.md` |
| 技术方案 | `docs/nongyu-rn-app/tech/课表交互UI功能系列优化.md`  |
| 应用     | `apps/nongyu-rn-app` + `apps/nongyu-node-server`     |
| 状态     | **已实现**（用户 2026-08-15）                        |

---

## 1. 里程碑

| 里程碑 | 内容                                                          | 风险                     |
| ------ | ------------------------------------------------------------- | ------------------------ |
| M1     | Node 考勤表 + API + tombstone entity=`attendance`             | 低：镜像 notes/todos     |
| M2     | RN 考勤数据层（local/api/repo/outbox/useCourseExt）           | 低                       |
| M3     | weekMatrix → stack + 懒窗口 ±2 + WeekPager/Grid 适配          | 中：连堂 occupied / Diff |
| M4     | ScheduleCard 视觉 + StackedCellCard 翻牌/双击/角标 + 长按添加 | 中：手势与动画           |
| M5     | 考勤 Section + Detail「添加日程」+ 表单冲突校验移除           | 低                       |
| M6     | CourseScreen：按钮换位、confirm 刷新、首屏 perf               | 低                       |
| M7     | lint / type-check / format + Spec §6 手工验收 + 旧 Spec 脚注  | 低                       |

**预计改动面**：见 tech §2。

**不改**：Agent 考勤 tools、竖向虚拟列表、上课提醒/海报、教务课编辑。

---

## 2. 实施步骤

### 2.1 M1 Node

1. `migrations/005_course_attendances.sql`（唯一键 `user_id+course_id+week+day`）
2. `repo.ts`：list / upsert(POST) / patch / delete(+tombstone)
3. `mapper.ts`：row ↔ DTO
4. `routes.ts`：Zod + CRUD；tombstone 已支持任意 entity 字符串则仅传 `attendance`
5. 本地迁移可跑则跑；接口形状对齐 notes

### 2.2 M2 RN 考勤数据

1. `types.ts`：`CourseAttendance` / `AttendanceStatus`
2. `syncTypes.ts`：`CourseExtEntity` += `"attendance"`
3. `courseExtLocalStore` / `Api` / `Repository` / outbox `applyOutboxOp` 分支
4. `useCourseExt`：snapshot + upsert/delete；pull 合并
5. 登出 clear 含 attendances

### 2.3 M3 矩阵与懒加载

1. `GridStack` / `StackItem`；构建时课程+日程入 stack（冲突保留日程）
2. 同格多课：仍只保留先写入一门（T1）
3. `ensureWeekWindow(center, radius=2)` + 窗外删 cache（T4）
4. `CourseScreen` / `WeekPager`：按需构建；缺周占位
5. Diff/peer：无 schedules 路径同样懒化

### 2.4 M4 卡片与手势

1. `ScheduleCard` 高级简约样式
2. `StackedCellCard`：Reanimated 翻牌；单击/双击；角标
3. `WeekGrid`：渲染 stack；长按 → 简易 BottomSheet「添加日程」（T2）
4. 正面 index：`Map` key，切周/unmount 清空

### 2.5 M5 详情与表单

1. `CourseAttendanceSection` + 接入 `CourseDetailSheet`（传 weekNumber）
2. 详情「在此时间添加日程」
3. 去掉日程与课程冲突拒绝逻辑（若存在）

### 2.6 M6 CourseScreen 收尾

1. 页头：刷新 ↔ 查看他人 对调
2. `confirm` 后 `forceRefresh`
3. 当前周 `onLayout` → `track` `course_week_first_paint`（self 一次）

### 2.7 M7 验收与门禁

1. `pnpm lint` / `type-check` / `format`（改动相关包）
2. 对照 Spec §6 勾选
3. 旧 Spec「有课格拒绝日程」处加脚注指向本 Spec
4. tech/plan/spec 状态改为已实现（编码完成后）

---

## 3. 顺序与依赖

```text
M1 → M2 → M5（考勤 UI 依赖数据）
M3 → M4 → M6（叠卡/懒加载依赖矩阵）
M2/M4/M6 可部分并行，但合并前跑 M7
```

建议编码顺序：**M1 → M2 → M3 → M4 → M5 → M6 → M7**（串行，减少半成品联调成本）。

---

## 4. 风险与缓解

| 风险                   | 缓解                                                |
| ---------------------- | --------------------------------------------------- |
| 双击误触翻牌           | Gesture Handler 组合；双击窗口内吞单击              |
| Diff 叠色与 stack 错位 | Diff 仍按「有课/无课」格逻辑，与 stack 是否含课对齐 |
| 懒加载滑到未构建周空白 | radius=2 + onIndexChange 立即 ensure                |
| POST upsert 与旧客户端 | 无旧考勤客户端；唯一键保证幂等                      |
| 迁移未在环境执行       | 实现后提醒跑 migrate；代码与 005 同提交             |

---

## 5. 注意事项

- Coding Agent 不擅自 git commit（除非用户要求）。
- 专事专干：RN UI/交互可用 frontend-engineer；Node 可用 backend-engineer；本需求也可主 Agent 串行落地。
- Bug 修复须写 `docs/common/BugLog.md`。
- 实现须 100% 符合已确认 Spec + Tech（T1–T4）。

---

请审查本实施计划。确认后开始按 M1→M7 编码。
