# BugLog

> 每次 Bug 修复必须在此追加简明记录（根因 + 修复方法），便于追溯与复用。  
> 格式：日期 / 范围 / 现象 / 根因 / 修复。

---

## 2026-08-15 · nongyu-rn-app · 课表连堂未合并成一张卡

- **现象**：跨两大课区间的连堂（或教务拆成多行的相邻时段）显示为两张独立卡片，不像合并单元格。
- **根因**：① 教务常把 `1-2`/`3-4` 拆成多条 `CourseEntry`，`spanRows` 各为 1；② 跨行加高时未计入行缝，且下行会盖住溢出卡片。
- **修复**：`mergeAdjacentTimeEntries` + `mergeAdjacentCourseEntries`（映射与读本地缓存）；`WeekGrid` 跨行高度含 `ROW_GAP`，有 span 的行抬高 zIndex/elevation。

---

## 2026-08-15 · nongyu-rn-app · 课表弹层打开时返回键未先关闭弹层

- **现象**：课表点卡片打开详情/日程 BottomSheet 后，按 Android 返回键未优先关弹层，而是触发其它返回行为。
- **根因**：`@gorhom/bottom-sheet` 的 `BottomSheetModal` 不自动拦截 `hardwareBackPress`。
- **修复**：`CourseScreen` 在详情或日程表单打开时注册 `BackHandler`，先 `dismiss()` 并 `return true`。

---

## 2026-08-15 · nongyu-rn-app · 登录页时段问候写死「晚上好」

- **现象**：登录页欢迎语始终显示「晚上好」，与当前时刻无关。
- **根因**：`LoginScreen` 将整句欢迎文案写成常量，未按时段拼接。
- **修复**：复用 `guestGreeting()`，按小时生成「夜深了 / 早上好 / 中午好 / 下午好 / 晚上好」再拼副文案。

---

## 2026-08-15 · nongyu-rn-app · 退出登录后课表背景图仍保留

- **现象**：用户设置课表背景图后退出登录，再进课表仍显示原背景。
- **根因**：`performJiaowuLogout` / `clearLocalAuthSession` 只清了课表条目与扩展数据，未调用 `clearPersistedCourseBackground`，也未清 `courseUiStore` / MMKV 中的背景 URI。
- **修复**：两条登出路径均删除本地背景文件并 `setBackgroundUri(null)`；确认框清单补充「课表背景图」。

---

## 2026-08-15 · nongyu-rn-app · AI 页键盘弹出未顶起输入框

- **现象**：调起系统键盘后输入框仍被挡住，无法边看输入边打字。
- **根因**：`KeyboardAvoidingView` 在 Android 为 `behavior={undefined}` 且项目开启 `edgeToEdgeEnabled`，避让失效；iOS 仅靠小 offset 也不稳。
- **修复**：监听 `keyboardWill/DidShow|Hide`，用键盘高度显式增加 composer 的 `paddingBottom`（键盘升起时用 `keyboardHeight + 8`，收起后回落到 safe area）。

---

## 2026-08-15 · nongyu-node-server · migrate 在 002_course_ext 失败

- **现象**：`pnpm --filter nongyu-node-server migrate` 报 `BLOB, TEXT, GEOMETRY or JSON column 'weeks_list' can't have a default value`，后续 `004_course_share` 无法应用。
- **根因**：`002_course_ext.sql` 中 `weeks_list TEXT NOT NULL DEFAULT '[]'`，当前 MySQL 模式不允许 TEXT 列带非空默认值。
- **修复**：去掉 `weeks_list` 的 `DEFAULT '[]'`（插入路径始终写入 JSON 字符串）；重新执行 migrate。

---

## 2026-08-15 · nongyu-rn-app · Agent 页从卡片跳转返回后聊天被重置

- **现象**：在 AI 聊天中点击可交互卡片进入其他页面，返回后对话回到欢迎语/丢失当前消息。
- **根因**：`ai.tsx` 每次 `useFocusEffect` 先 `setAgent(undefined)`，卸载 `AiChatPanel`；同会话 hydrate 又因 `activeSessionId` 未变而跳过从 MMKV 刷新 `initialMessages`，面板用过期初始消息 remount。
- **修复**：焦点刷新 Agent 时不再先置 `undefined`（保活面板内存态）；用 `chatMountedRef` 区分「面板仍在」与「曾卸载」——仅后者强制从本地重载 messages；失焦仍 stop+落盘。
- **文档**：`specs/农屿Agent会话管理.md` 回页约定与验收补充。

---

## 2026-08-15 · nongyu-rn-app · `CourseScreen.tsx` 出现多处乱码导致 JSX 语法错误

- **现象**：`pnpm --filter nongyu-rn-app type-check` 报大量 `Unterminated string literal` / `JSX element 'Text' has no corresponding closing tag` / `Expression expected`，集中在 `src/modules/course/screens/CourseScreen.tsx`。
- **根因**：文件中多个中文字符串被替换为 Unicode 替换字符 `U+FFFD`（显示为 `?`），同时 `</Text>` 等闭合标签被连带破坏，导致字符串未闭合、JSX 标签不配对。
- **修复**：移除文件中的 `U+FFFD` 替换字符，修复损坏的字符串字面量（如“已保留本地课表”、“课表已更新”、“农屿课程表”、“设置开学日期”、“登录后加载课表”）及对应的 `</Text>` 闭合标签；随后类型检查通过。

---

## 2026-08-15 · nongyu-rn-app · 课表扩展数据无法同步到远程

- **现象**：用户自定义日程 / 课程备注 / 课程待办新增后，本地可见但远程数据库无对应记录；下次进课表后本地条目消失。
- **根因**：
  1. `id` 生成 fallback 不合法。`CourseScreen` / `ScheduleFormSheet` / `courseTools.ts` 三处的 `genExtId()` 在 `crypto.randomUUID` 不可用时回退为 `x-<timestamp>-<hex>`，非 RFC4122 UUID。Node 服务器 schema 为 `id: z.string().uuid()`，校验失败返回 400，`appFetch` 抛错被 repository `catch` 静默吞掉 → 本地有、远程无。RN/Hermes 运行时不保证全局 `crypto.randomUUID`。
  2. `pullCourseExt` 全量覆盖本地。远程拉取后直接 `writeLocalSchedules(...)` 覆盖本地，导致失败的写（含上面 uuid bug 产生的）在下次 pull 时被远程（无该条目）覆盖丢失。
- **修复**：
  1. 新增 `src/modules/course/model/genId.ts` 的 `newCourseExtId()`，复用项目 `telemetry/ids.ts` 同源思路（优先 `crypto.randomUUID`，否则用随机字节手搓 RFC4122 v4），三处全部改用此函数，保证服务器 uuid 校验通过。
  2. `pullCourseExt` 改为按 id 合并：远程权威覆盖同 id 本地，保留本地存在但远程尚未同步的条目（`mergeById`），避免失败写被全量覆盖丢失。
- **验证**：`pnpm --filter nongyu-rn-app type-check` 通过，course 模块 lint 无错误。

---

## 2026-08-15 · nongyu-rn-app + node-server · 课表扩展 outbox / tombstone 同步

- **现象**：远程写失败无重推；跨设备删除不传播（A 删后 B 本地仍保留）。
- **根因**：仅「失败静默保留本地」+「mergeById 保留本地独有项」，缺少失败队列与删除墓碑。
- **修复**：
  1. Node：`003_course_ext_tombstones.sql`；DELETE 幂等写 tombstone；`GET /api/app/course-ext/tombstones`（近 30 天）。
  2. RN：MMKV outbox / tombstones；写失败入队；删除写本地 tombstone；`pullCourseExt` 合并 tombstone 后 `flushOutbox`；`AppState` active 时 flush；登出清 outbox+tombstone。
- **文档**：`specs|tech|plans/课表扩展同步协议-Outbox与Tombstone.md`
- **验证**：RN / Node type-check 通过。

---

## 2026-08-15 · nongyu-rn-app · 主题设置页左上角显示路由路径

- **现象**：进入「主题与外观」时，系统导航头左上角显示类似 `mine/settings/theme` 的路径文案。
- **根因**：根 Stack 未注册 `mine/settings/theme`，未设 `headerShown: false`，Expo Router 回退默认 header（标题取路由名）。
- **修复**：在 `app/_layout.tsx` 补注册该屏，`title: "主题与外观"` 且 `headerShown: false`，仅保留 `SettingsPageShell` 自定义顶栏。

---

## 2026-08-15 · nongyu-rn-app · 主题改造后预览红屏 `Property 't' doesn't exist`

- **现象**：主题跟色改造后 Expo 预览红屏崩溃；堆栈指向 `TabsLayout` / `GlassPanel`。
- **根因**：批量迁移时曾把 `GlassPanel` 默认参数写成 `intensity = t.tabBar…`（`t` 仅存在于函数体/`useThemeTokens` 之后）；形参默认值在入参作用域求值，`t` 未定义 → Hermes `ReferenceError: Property 't' doesn't exist`。底栏一渲染即崩。
- **修复**：默认玻璃色改在函数体内 `useThemeTokens()` 后再 `??` 回退；`(tabs)/_layout` 使用 `theme` 取背景色；禁止再在形参默认值引用主题 hook 结果。

---

## 2026-08-15 · nongyu-rn-app · 首页通知栏常显固定占位、不像最新公告

- **现象**：通知栏长期显示「欢迎使用农屿，这是农屿的官方通知栏~」，不像在展示最新公告。
- **根因**：① 接口 `announcements/latest` 常返回 `data: null`（库无公告）或 Token 失败时按 Spec 回退固定占位；② `useNoticeBootstrap` 仅挂载拉一次，会话/Token 就绪晚于首次请求或失败后不会重试。
- **修复**：改为 React Query，等 `hydrated` 且有 Token 再请求；回到首页 `useFocusEffect` 触发 refetch。

---

## 2026-08-15 · nongyu-agent-sdk · RN 预览因 readline 打包失败闪退

- **现象**：Expo/Metro 预览 App 打开即闪退或白屏起不来；终端报 `You attempted to import the Node standard library module "readline" from packages/nongyu-agent-sdk/dist/index.js`。
- **根因**：主入口 `src/index.ts` 导出了仅 Node CLI 使用的 `StdioChannel`（依赖 `node:readline`），且 tsup 打成单文件主包；RN 引用 `createAgent`/`useAgentChat` 时仍会解析到 `readline`，Metro 打包失败。
- **修复**：主入口移除 `StdioChannel`；新增子路径入口 `nongyu-agent-sdk/stdio`（`src/stdio.ts` + `exports["./stdio"]`）；TECH-DESIGN §13.2 同步约定；重建 `dist` 后主包不再含 `readline`。

---

## 2026-08-15 · nongyu-agent-sdk · 并发同名工具调用结果回填错位

- **现象**：一条 assistant 消息内若模型并发调用多个同名工具（如两次 `weather_query`），`tool:result` 回来后结果会错填到第一条记录，导致卡片显示错乱或永远停留在 executing。
- **根因**：`useAgentChat.ts` 的 `tool:result` 分支用 `tc.toolName === chunk.toolName && tc.output === undefined` 匹配回填，同名并发时第一条 output 一旦填充，后续结果无法再匹配到第二条；且模型 `ToolCall.id` 已在 `AgentLoop` 解析但未透传到流式块与 `ToolCallRecord`。
- **修复**：
  1. `AgentStreamChunk` 的 `tool:call`/`tool:result`/`tool:error` 增加可选 `callId`（取自模型 `ToolCall.id`），`AgentLoop` 透传；
  2. `ToolCallRecord` 增加 `callId/status/error/renderComponent`；
  3. `useAgentChat` 改用 `matchCall` 优先按 `callId` 精确匹配回填，`callId` 缺失时降级为按 `toolName && output===undefined`（兼容旧调用方）。
- **关联**：见 `docs/nongyu-rn-app/tech/Agent生成UI渲染能力-技术方案.md` §4.2、`docs/nongyu-rn-app/plans/AI生成UI渲染能力-实施计划.md` S2/S3。

---

## 2026-08-15 · nongyu-rn-app · 课表 UI 偏离旧版观感

- **现象**：课表页出现玻璃拟态表头、叶脉色条卡片、英文 eyebrow、「本周课表」等自造样式，与旧版农屿课表不一致。
- **根因**：Phase 2「视觉升级」未严格对照 `old-code/.../CourseTable`，自行改写布局与配色。
- **修复**：按旧版 WeekSlide / Course 页头还原：居中卡片色板、双节次时间列、「第N周/共M周」表头、右侧半圆回本周按钮；色值走主题 Token，卡片色池沿用旧版 COURSE_COLORS。

---

## 2026-08-15 · 广场 · 大院帖子对用户暴露署名

- **现象**：农屿大院列表/详情对普通用户展示 `authorDisplayName`（真实姓名），破坏用户间匿名。
- **根因**：App 帖子序列化对 `courtyard` 故意下发作者名；RN `PostCard`/`PostDetailScreen` 同步展示。与 PRD（卡片仅时间/类型/标题/内容）及「反馈墙+大院对用户匿名」规则冲突。
- **修复**：App 列表/详情恒返回 `authorDisplayName: null`；RN 去掉署名展示；管理端仍返回 `authorName`/`authorStudentNo`；补充匿名回归单测。

---

## 2026-08-14 · nongyu-tool-jiaowu · check.asp 报「请通过正常链接重新登录」

- **现象**：`POST check.asp` HTTP 200，解码后 `alert`「验证失败，请通过正常链接重新登录！」，随后档案页仍无会话。
- **根因**：教务要求同一次会话先打开登录页再提交。冻浏览器 curl 里的 Cookie / `sign` / `hour_key` 重放，或跳过 GET `index.asp`，都会被当成非正常入口。
- **修复**：`jiaowuLogin` 先 GET `web/web/web/index.asp`，从 hidden 解析当页 `sign` / `hour_key` 再 POST；解析失败中止，禁止回退固定值。已验证链路见 `docs/nongyu-rn-app/tech/教务鉴权方案.md` §8。

## 2026-08-14 · nongyu-node-server · PATCH /users/me 改 QQ 返回 500

- **现象**：`settings.users` 单测 `PATCH /api/app/users/me` 期望 200，实际 500。
- **根因**：落地 Track 内部 presence 时误把 `updateUserQq` 整段替换成 `updateUserPresence`，路由仍调用已删除函数。
- **修复**：恢复 `updateUserQq`，presence 更新作为独立函数并存。

## 2026-08-14 · nongyu-tool-jiaowu · 教务登录误判成功，档案页报登录超时

- **现象**：`POST check.asp` 日志为 OK（200、约 122 字节 ArrayBuffer），随后 `GET bjiben.asp` 失败，错误为「登录超时且已尝试过重新登录」。
- **根因**：axios 对教务响应使用 `arraybuffer`；`check.asp` 拦截器跳过 GBK 解码。`jiaowuLogin` 只用「body 是否为以 `<script` 开头的字符串」判失败，ArrayBuffer 永远判成功。失败页（alert 短脚本）被当成登录成功，后续请求无有效会话。
- **修复**：登录响应同样 GBK 解码，但不走超时自动重登；按 `alert` / `history.back` 判失败并透出教务文案，`location` 跳转或 302 判成功；Cookie 优先取响应 `Set-Cookie`。

## 2026-08-13 · nongyu-rn-app · 教务页 bundling 失败（白屏）

- **现象**：进入教务相关路由后 Metro `Android Bundling failed`；日志提示 `iconv-lite` 导入 Node 内置 `string_decoder` 失败。
- **根因**：`nongyu-tool-jiaowu` 用 `iconv-lite` 解教务 GBK 响应；该库会 `require("string_decoder")`，Hermes/Metro 默认不含 Node 标准库。
- **修复**：在 `apps/nongyu-rn-app/metro.config.js` 的 `resolver.extraNodeModules` 将 `string_decoder`、`buffer` 映射到 npm polyfill；App 显式依赖 `string_decoder`、`buffer`。重启 Metro（建议 `--clear`）后生效。

## 2026-08-13 · nongyu-rn-app · 悬浮底栏 `blurTarget` 未接通

- **现象**：Metro 反复 WARN：`dimezisBlurViewSdk31Plus` 未配置 `blurTarget`，Blur 回退为 `none`。
- **根因**：`FloatingTabBar` 写在 `BlurTargetRoot`（Provider+Surface 合一）外侧，拿不到 Context，Android 毛玻璃采样目标为空。
- **修复**：拆成 `BlurTargetProvider` + `BlurTargetSurface`；Provider 同时包住页面与底栏，Surface 只包 Tab 页面作采样目标（见 `BlurTargetContext.tsx`、`app/(tabs)/_layout.tsx`）。

## 2026-08-13 · nongyu-rn-app · 预览闪退出 Dev Client 壳

- **现象**：热更新/进首页后原生壳直接闪退；Metro 同时刷 SecureStore Invalid key。
- **根因**：
  1. 网站搜索框在 `BlurTargetView` **内部**再套 `GlassPanel`/`BlurView`，Android 嵌套真模糊易原生崩溃；
  2. SecureStore key 使用了非法字符 `:`（如 `jiaowu:student_id`），冷启动读凭据抛错。
- **修复**：搜索框改为半透明白底玻璃拟态（不套 BlurView）；凭据 key 改为 `jiaowu_student_id` / `jiaowu_password`，读写加 try/catch。真模糊仅用于底栏等 **BlurTarget 外侧** 组件。

## 2026-08-13 · nongyu-rn-app · 首页通知栏整栏消失

- **现象**：首页问候下方通知栏不见（反复出现）。
- **根因**：
  1. `useNoticeBootstrap` / `NoticeBar` 在无数据时 `notice=null` + `return null`；
  2. 《广场功能》Spec §4.6 / 验收 #8 曾写「无公告优先隐藏」，后续广场联调改动按旧 Spec 又盖回隐藏逻辑。
- **修复**：无 Token / 无数据 / 失败一律回退 `FIXED_NOTICE`；`notice` 恒有值；同步修订《广场功能》Spec/Plan 为「禁止隐藏、必须占位」。

## 2026-08-13 · nongyu-rn-app · AI 引导气泡文案变省略号

- **现象**：农屿 AI 入口气泡只显示「…」，完整提示文案看不到。
- **根因**：气泡挂在仅圆钮宽度的 `aiAnchor` 内；Android 上绝对定位子视图未设宽度时会吃到父宽，再叠加 `numberOfLines={1}` 即被截成省略号。
- **修复**：气泡容器给明确宽度（约 210）、去掉单行截断；`aiAnchor` 设 `overflow: visible`。

## 2026-08-13 · nongyu-rn-app · 帖子详情缺骨架屏

- **现象**：打开帖子详情首次加载仅显示「加载中…」文案，无骨架。
- **根因**：实现时详情态只写了文本 hint，未复用 `SkeletonBox` 做标题/正文占位。
- **修复**：新增 `PostDetailSkeleton`，`PostDetailScreen` 在 `isPending` 时渲染；Spec §4.4 补「首次加载须骨架」。

## 2026-08-14 · nongyu-rn-app · 登录页对齐 old-code 后再次变回简版

- **现象**：登录页又变成「教务登录」简表单，看不到 Logo /「欢迎来到农屿」/「进入农屿」等旧版对齐 UI。
- **根因**：路由入口 `app/login.tsx` 与 `JiaowuLoginForm.tsx` 被覆盖回对齐前实现，未再引用已存在的 `modules/auth/screens/LoginScreen.tsx`。
- **修复**：`app/login.tsx` 恢复为导出对齐版 `LoginScreen`；`JiaowuLoginForm` 非 compact 恢复描边输入、密码显隐、「进入农屿」、隐私提示。

---

## 2026-08-15 · nongyu-rn-app · 课表待办 `dueDate` 类型与实际数据不一致

- **现象**：`pnpm --filter nongyu-rn-app type-check` 报 `courseExtRepository.ts(168,5)`：`dueDate` 的 `string | null | undefined` 无法赋值给 `CourseTodo.dueDate` 的 `string | undefined`。
- **根因**：`CourseTodo` 类型将 `dueDate` 定义为 `string | undefined`，但 `editTodo` 的 patch 允许传入 `string | null`，且本地存储读取后 `null` 会被保留；类型与实际数据流不一致。
- **修复**：`src/modules/course/model/types.ts` 将 `CourseTodo.dueDate` 放宽为 `string | null | undefined`，与 `completedAt` 的 nullable 语义保持一致。

---

## 2026-08-15 · nongyu-rn-app · FlashList 2.0.2 不支持 `estimatedItemSize` 属性

- **现象**：按技术方案给 `FlashList` 加 `estimatedItemSize` 后 `type-check` 报错：`Property 'estimatedItemSize' does not exist on type 'FlashListProps<...>'`。
- **根因**：RN 项目当前锁定的 `@shopify/flash-list@2.0.2` 的 `FlashListProps` 尚未引入 `estimatedItemSize` 字段（该字段在后续版本才成为必填项），其 API 与最新版不同。
- **修复**：移除 `MessageList` 和 `SecondActivityListCard` 中新增的 `estimatedItemSize`，保持与现有依赖版本兼容；后续升级 FlashList 大版本时重新评估该属性。

---

## 2026-08-15 · nongyu-rn-app · `createThemedStyles` 组件在 `useStyles` 定义前使用 `styles`/`t`

- **现象**：`type-check` 报大量 `Cannot find name 'styles'` / `Cannot find name 't'` / `Cannot find name 'lightTokens'`，涉及 `SkeletonBox`、`ProgressScreen`、`RankScreen`、`SecondActivitiesScreen`、`SecondProfileScreen` 等。
- **根因**：这些组件把辅助子组件（如 `FilterModal`、`ModalRow`、`NoticeBarSkeleton`、`Meta`、`RankExhibit`）写在 `const useStyles = createThemedStyles(...)` 之前，子组件直接使用外部作用域的 `styles` 或 `t`；而 `const` 不存在变量提升，TypeScript 严格检查下报错。
- **修复**：
  - 在需要样式的子组件内部调用 `useStyles()` / `useThemeTokens()`，而不是依赖外部变量；
  - `SkeletonBox` 将 `borderRadius` 默认值从 `t.radius.sm` 改为运行时读取 theme 的 `finalBorderRadius`；
  - 将部分子组件（如 `Meta`）移到 `useStyles` 定义之后或内部调用 hook。

---

## 2026-08-15 · nongyu-rn-app · 课表 Agent 工具 `day` 类型与 `ScheduleEntry` 不匹配

- **现象**：`src/modules/course/agent/courseTools.ts(107,39)` 报错：`day` 的 `number | undefined` 不能赋值给 `ScheduleEntry.day` 的联合类型 `1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined`。
- **根因**：`daySchema` 使用 `z.number().int().min(1).max(7)`，zod 推导为 `number`，而 `editSchedule` 期望精确的星期字面量联合类型。
- **修复**：给 `daySchema` 增加 `.transform((v) => v as 1 | 2 | 3 | 4 | 5 | 6 | 7)`，使解析后类型与 `ScheduleEntry.day` 对齐。

---

## 2026-08-15 · nongyu-rn-app · 查看他人课表详情仍露出备注待办区

- **现象**：查看他人 / Diff 时点课程卡片，详情弹层仍显示备注、待办标题、空状态和输入框。
- **根因**：`CourseScreen` 只把 `notes`/`todos` 传成空数组，`CourseDetailSheet` 无只读开关，扩展区始终渲染。
- **修复**：详情增加 `readOnly`；peer/Diff 整段不渲染备注待办（含 composer）；只读时缩小 snap 高度。

---

## 2026-08-15 · nongyu-rn-app · Diff「退出对比」与「回到本周」重叠

- **现象**：对比双方课表且非本周时，「退出对比」与右侧「回到本周」半圆叠在一起，难以点按。
- **根因**：图例条把退出按钮 `marginLeft: auto` 靠右；`BackToCurrentWeekFab` 同样 `right: 0` 且 `top` 落在图例行。
- **修复**：「退出对比」改到顶栏原「对比课表」槽位；图例条只留模式切换与色点；半圆位置不变。
