# Spec：全局统一 Toast

| 项       | 内容                                                        |
| -------- | ----------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                        |
| 需求类型 | **基建**                                                    |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/全局ToastPRD.md` |
| 状态     | **已实现**                                                  |

---

## 1. 背景

农屿 RN App 多处直接调用 `react-native-toast-message` 的默认样式，反馈观感不统一，也与现有毛玻璃壳层语言脱节。需要一套全局唯一的 Toast 封装：统一 API、统一高级简约视觉，并全量替换现有调用点。

---

## 2. 目标

1. 提供全局唯一入口 `toast.success` / `toast.error` / `toast.info`，业务侧禁止直接 import `react-native-toast-message`。
2. Toast UI 为顶部居中毛玻璃胶囊，左侧细色条区分类型；与川农新绿 token / 底栏毛玻璃语言一致。
3. 挂载点仍在 `AppProviders`（或等价根 Provider），一次挂载全 App 可用。
4. 将现有全部 `Toast.show(...)` 迁移到新 API。

---

## 3. 边界（非目标）

- 不覆盖 Web Admin / Web Site。
- 不新增 `warning` 类型；不做 Toast 内操作按钮（如「重试」）。
- 不自研 Toast 队列/动画引擎；底层继续使用已有 `react-native-toast-message`，仅自定义 config + 外观封装。
- 不在本次完成 `design-system/rn-app/MASTER.md` 全文；Toast 视觉规则以本 Spec §5 为准。
- **跳过独立技术方案文档（tech）与实施计划文档（plans）**——范围小、选型已定，以本 Spec 直接指导实现（需用户在评审中确认）。

---

## 4. 详细需求

### 4.1 公共 API

模块建议路径：`src/components/ui/toast/`（或 `src/ui/toast/`，实现时与现有 `components/ui` 对齐）。

```ts
type ToastType = "success" | "error" | "info";

type ToastOptions = {
  /** 副文案；可选 */
  description?: string;
  /** 展示时长 ms；不传则按类型默认 */
  duration?: number;
};

declare const toast: {
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
  /** 主动关闭当前 Toast（可选导出，供特殊场景） */
  hide: () => void;
};
```

约束：

- `title` 必填；空字符串视为无效，调用方可直接 return，封装内可 no-op。
- `description` 过长时单行省略（约 2 行内可读即可，实现用 `numberOfLines` 限制标题 1 行、副文案 2 行）。
- 业务代码统一：`import { toast } from "@/components/ui/toast"`（路径别名以项目现有为准）。

### 4.2 类型语义与默认时长

| 类型    | 用途            | 左侧色条                           | 默认时长 |
| ------- | --------------- | ---------------------------------- | -------- |
| success | 操作成功确认    | `tokens.color.brand`（`#0A7C59`）  | 2500ms   |
| error   | 失败 / 阻断提示 | `tokens.color.danger`（`#C62828`） | 3500ms   |
| info    | 中性说明 / 引导 | `tokens.color.textSecondary`       | 2500ms   |

### 4.3 挂载与安全区

- 在 `AppProviders` 中渲染自定义 `toastConfig` 的 `<Toast />`（或薄封装 `AppToastHost`）。
- 位置：`top`；`topOffset` 需避开刘海/状态栏（基于 SafeArea top inset，额外约 8–12）。
- 点击 Toast 可关闭（`onPress` → hide）。
- 并发：沿用库默认（新 Toast 替换当前展示）。

### 4.4 迁移清单（必须全量）

| 文件                    | 现有用法概要                               |
| ----------------------- | ------------------------------------------ |
| `SocialCopyCard.tsx`    | success 复制成功                           |
| `WebNav.tsx`            | error 打开链接失败                         |
| `JiaowuServiceList.tsx` | info 需要登录                              |
| `JiaowuLoginForm.tsx`   | error / success 登录结果                   |
| `performJiaowuLogin.ts` | info Token 未签发                          |
| `useJiaowuQuery.ts`     | error 刷新失败                             |
| `ComposeScreen.tsx`     | success / error 发布                       |
| `PostDetailScreen.tsx`  | success / error 删除                       |
| `MineScreen.tsx`        | error / info / success（关于、分享、退出） |

迁移后：仓库内 `nongyu-rn-app` 业务代码不得再出现 `from "react-native-toast-message"`（仅 toast 封装模块与 Host 允许）。

### 4.5 文案语气（与 frontend-design 文案原则对齐）

- 成功：完成时态短句（「已删除」「发布成功」「已复制」）。
- 失败：说明发生了什么；副文案可带可行动信息（「请检查学号密码」），不道歉、不空泛。
- 信息：陈述状态（「需要登录」），副文案给下一步。

---

## 5. UI 设计规格（高级简约）

### 5.1 设计定调

| 轴       | 选择                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| 主体     | 农屿学生端瞬时反馈芯片                                                                                       |
| 受众     | 川农学生，日常操作确认 / 错误提示                                                                            |
| 单职     | 不打断流程地告知结果                                                                                         |
| 签名元素 | **软墨半透明芯片** + **5px 状态微点**（对标 Linear / Sonner / iOS 系统反馈：内容贴合宽、无图标、无通栏色条） |

刻意避免：通栏宽条、实心彩色大块、左侧粗色轨、重阴影、emoji/图标堆砌、浅白毛玻璃「卡片感」。

### 5.2 Token / 色板（4–6 名）

| 名       | 值                                                     | 用途     |
| -------- | ------------------------------------------------------ | -------- |
| Ink      | `rgba(22,30,27,0.94)` / iOS `systemChromeMaterialDark` | 芯片底   |
| Snow     | `#F4F7F5`                                              | 标题     |
| Mist     | `rgba(244,247,245,0.58)`                               | 副文案   |
| Hairline | `rgba(255,255,255,0.10)`                               | 描边     |
| Shade    | `#0B1210` @ 22% / blur 20                              | 轻阴影   |
| Dot-*    | `#5ECF9A` / `#F07178` / mist                           | 状态微点 |

### 5.3 形体与排版

```
        ┌──────────────────┐
        │ • 标题（13.5/500） │  ← 内容贴合；单行满圆角
        └──────────────────┘
        ┌────────────────────────┐
        │ • 标题                  │  ← 双行圆角 18
        │   副文案（12/400）       │
        └────────────────────────┘
              ↑ 水平居中，max ≈ min(屏宽−56, 320)
```

| 项     | 要求                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| 圆角   | 单行 `999`（药丸）；双行 `18`                                                 |
| 内边距 | 垂直 10–11；水平 14；点与文间距 10                                            |
| 材质   | iOS：`systemChromeMaterialDark` + 薄墨洗；Android：软墨半透明，禁止实心纯黑块 |
| 动效   | 自上微移入 + 淡入（~260ms）；退出 ~200ms；尊重「减少动态效果」                |
| 宽度   | **内容贴合**，仅设 maxWidth；禁止固定通栏宽                                   |

### 5.4 ASCII 线框（相对首屏）

```
┌──────── safe area ────────┐
│      [  frost toast  ]    │  ← top
│                           │
│         页面内容…          │
│                           │
│     [  floating tab  ]    │
└───────────────────────────┘
```

---

## 6. 业务流程

```
业务事件（成功/失败/提示）
  → toast.*(title, { description?, duration? })
  → 封装映射为自定义 toastConfig 类型
  → Host 展示 → 超时或点击 → 隐藏
```

---

## 7. 验收标准与测试方案

### 7.1 功能

- [ ] `toast.success/error/info` 均可弹出，类型色条正确。
- [ ] 仅标题、标题+副文案两种布局正常。
- [ ] 自定义 `duration` 生效；默认时长符合 §4.2。
- [ ] 点击可关闭；安全区内不与刘海重叠。
- [ ] 迁移清单全部改完；业务侧无直接 `react-native-toast-message` import。

### 7.2 UI（理想观感）

- [ ] 顶部居中**软墨芯片**，内容贴合宽（非通栏）；单行药丸、双行圆角 18。
- [ ] 成功/失败/信息仅靠 **5px 微点**区分，无图标、无粗色条。
- [ ] 与悬浮底栏同场时，Toast 在上、不抢底栏视觉。

### 7.3 工程

- [ ] `pnpm --filter nongyu-rn-app` 相关 lint / type-check / format 通过（按仓库根脚本执行）。

---

## 8. 评审确认项

请确认：

1. 本 Spec 内容是否可直接作为实现依据？
2. 是否同意 **跳过 tech + plans**，Spec 通过后直接编码？
