# 实施计划：农屿 Agent 模型通道选择

| 项   | 内容                                                |
| ---- | --------------------------------------------------- |
| Spec | `docs/nongyu-rn-app/specs/农屿Agent模型通道选择.md` |
| Tech | 跳过（Grill 共识）                                  |
| 状态 | 已落地（待人工回归）                                |

## 实施步骤

1. **MMKV key**  
   在 `apps/nongyu-rn-app/src/storage/mmkv.ts` 增加 `AGENT_PROVIDER_SOURCE_KEY = "app:agent_provider_source"`。

2. **偏好 Store**  
   新增 `apps/nongyu-rn-app/src/modules/settings/store/agentProviderSourcePrefsStore.ts`：
   - 类型 `"platform" | "user"`
   - 键不存在时：用 `loadAgentConfig` 异步推导不便进 zustand 初值 → **同步读 MMKV**：有显式值用显式值；无键时默认展示/解析侧再按 Spec §5.2 推导。
   - 推荐实现：`getAgentProviderSourcePref(): "platform" | "user" | null`（`null` = 未写入，由 resolve 按凭据推导）；UI 用 `resolveEffectiveSource(hasUserConfig)` 计算选中态。
   - `setProviderSource` 写 MMKV + set state。

3. **解析**  
   改 `resolveAgentProviderConfig.ts`：按 Spec §5.3；删除「有 userCfg 即强制 user」。

4. **设置页 UI**  
   改 `AgentSettingsScreen.tsx`：
   - 分区顺序：模型通道 → 上下文 → 平台说明 → 自有表单
   - 通道单选；无凭据禁用「自有 Key」
   - 切换 / 保存成功切 `user` / 清除后 invalidate
   - 略收紧平台说明文案（点明可切换）

5. **文档**  
   Spec 状态改为已落地；本计划状态同步。

## 不改

- web-admin、`settings_get`、登出清通道偏好、`AgentSettingsNavCard`（可选不改）

## 风险

- UI「选中态」与 MMKV 显式值在「偏好 user 但已清 Key」时可能不一致：按 Spec 展示回退为后台/禁用自有，**不强制改写** MMKV。
- `resolve` 与设置页都必须用同一套「有效通道」规则，避免聊天与设置页显示打架。

## 验收

按 Spec §7 手工回归（有 Key 切后台再切回；无 Key 禁用自有；保存自动切自有；清 Key 回退；web_search 仅自有）。
