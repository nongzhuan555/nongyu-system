# TECH：nongyu-tool-second

## 技术栈

- TypeScript + tsup（`platform: neutral`）
- 网络：axios（JSON，非 GBK）

## 架构

- **会话层** `core/session.ts`：内存学号密码 + `x-access-token`
- **登录** `core/login`：`POST /user/login/v1.0.0/snoLogin`（query：`loginName`/`password`/`sid`）
- **网络** `core/utils/request.ts`：`baseURL=SECOND_BASE_URL`，自动带 token；业务 `code` 像鉴权失败时自动重登并重放一次；网络错误最多重试 3 次
- **业务** `core/second`：相对 path POST + query，对齐旧版农屿 / i川农文档

## 已验证（2026-08-15）

- Base URL：`https://jk.sicau.edu.cn`
- 登录、成绩单 `myReportCard`、活动列表 `getUserSchoolActList` 实网 `code=0`
- 川农 `sid`：`f1c97a0e81c24e98adb1ebdadca0699b`

禁止把个人密码写进仓库；联调凭据仅本机使用。

## 文档保留、本包不实现

| Path                                             | 说明                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `POST /act/actInfo/v1.0.0/updateActMemberStatus` | 报名/取消；参数 `actId`/`memberId`/`status`(1/2)/`validCodd`。旧 APK 另见 `/web/act/...` 形态，启用前需再验 |

## 否决项

- 不以 `fpa.sicau.edu.cn` 作为现网 Base（学院站，登录 404）
- 不导出写操作 API
- RN 消费 `dist/`，改源码后必须 `pnpm --filter nongyu-tool-second build`
