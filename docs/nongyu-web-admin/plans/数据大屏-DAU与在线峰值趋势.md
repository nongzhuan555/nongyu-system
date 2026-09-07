# 实施计划：数据大屏 · DAU 趋势与在线峰值

| 项   | 内容                                                        |
| ---- | ----------------------------------------------------------- |
| Spec | `docs/nongyu-web-admin/specs/数据大屏-DAU与在线峰值趋势.md` |
| 状态 | 已完成                                                      |

## 步骤

1. **Track**：Node / Go `overview` 增加 `online_peak`（今日 live 口径与 trend 一致）。
2. **BFF**：`mapOverview` → `onlinePeak`；同步接口文档与 Track 代理 Spec §4.4。
3. **Web Admin**：类型 / prefs `trackTrendRange`；布局三新卡；拉 overview + 双 trend；KPI + 两折线卡；切换 range 只重拉 trend。
4. **门禁**：`pnpm lint` / `type-check` / `format`；Spec 状态改为已实现。

## 风险

- 旧 prefs 缺新 widget id：沿用现有 layout merge。
- 双 Track 实现须对齐，避免只改一侧。
