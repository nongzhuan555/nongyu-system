# nongyu-go-track-server 独立机部署与 IP HTTPS

| 项       | 内容                                                                     |
| -------- | ------------------------------------------------------------------------ |
| 版本     | v1.0                                                                     |
| 日期     | 2026-08-16                                                               |
| 需求类型 | 基建                                                                     |
| 用途     | Track 专用机装机说明；HTTPS / 证书原理与 Node 机相同，详见 Node 学习文档 |
| 配套操作 | `docs/nongyu-go-track-server/部署与发布.md`                              |
| 敏感信息 | **本文不写**真实 IP / SSH 口令 / JWT / Internal Token                    |

HTTPS、Let’s Encrypt IP 短寿证书、ACME HTTP-01、安全组与 `proxy_pass` 的完整说明见：

[`docs/nongyu-node-server/tech/Node同机部署与IP-HTTPS.md`](../../nongyu-node-server/tech/Node同机部署与IP-HTTPS.md)

本文只写 **Track 相对 Node 的差异**。

---

## 1. 和 Node 部署的相同点

- 本机出产物，服务器不装业务工具链（Node 打 `dist`，Track 交叉编译 linux/amd64 静态二进制）
- systemd 守护；**不用** nohup / screen
- Nginx 终止 TLS；进程只绑 `127.0.0.1`
- Let’s Encrypt **IP 证书**（shortlived ≈ 6 天）+ acme.sh cron
- 日常一键脚本：构建 → scp → `systemctl restart` → 回环 `/health`
- 口令与生产 `.env` **不进 git**

## 2. 和 Node 部署的不同点

| 项        | Node                                    | Track                                                |
| --------- | --------------------------------------- | ---------------------------------------------------- |
| 机器      | 与现网 MySQL **同机**                   | **独立轻量机**；埋点走本机 SQLite                    |
| 发布物    | `dist/` + 远端 `npm install --omit=dev` | 单个二进制 `/usr/local/bin/nongyu-track`             |
| 监听      | `127.0.0.1:3000`                        | `127.0.0.1:8081`                                     |
| 数据      | MySQL（禁止部署脚本动库）               | `/var/lib/nongyu-track/track.db`（禁止用本机库覆盖） |
| 反代路径  | `/api`、`/health`、旧 Admin 静态        | 整站反代到 Track（`/health`、`/v1/*`）               |
| Body 限制 | 业务接口较大                            | Nginx `client_max_body_size 1m`                      |
| 互访      | `TRACK_BASE_URL` 指向 Track 公网根      | `NODE_INTERNAL_BASE_URL` 指向 Node 公网根            |

Track 机上若已有 mysqld，**视为历史服务，部署不得重启/覆盖/改账号**。Track 进程不连它。

## 3. 现网拓扑

```text
App Telemetry
        │  HTTPS  https://<Track公网IP>/v1/track/...
        ▼
Nginx :443（IP 证书）+ :80（ACME；443 未放行时仍反代）
        │  HTTP  127.0.0.1:8081
        ▼
systemd nongyu-track  →  SQLite /var/lib/nongyu-track/track.db
        │
        │  HTTPS  https://<Node公网IP>/api/internal/users/presence
        ▼
nongyu-node-server（另一台机）
```

管理端大屏不直连 Track，仍走 Node BFF：`TRACK_BASE_URL=https://<Track公网IP>`。

## 4. 令牌对齐（装机必做）

| Track 环境变量           | 必须等于                                       |
| ------------------------ | ---------------------------------------------- |
| `JWT_SECRET`             | Node 生产 `JWT_SECRET`（校验 App JWT）         |
| `INTERNAL_TOKEN`         | Node 生产 `INTERNAL_TOKEN`（Admin / 内部上报） |
| `NODE_INTERNAL_TOKEN`    | 同上（回写在线态）                             |
| `NODE_INTERNAL_BASE_URL` | `https://<Node公网IP>`（无尾斜杠）             |

日常发布脚本 **不覆盖** `/etc/nongyu-track.env`。

## 5. 证书客户端

与 Node 机相同：系统 Python 3.6，Certbot 装不了 IP shortlived。用 **acme.sh**，账户邮箱用可投递域名邮箱（不要 `@localhost`）。

证书安装路径约定与 Node 一致：`/etc/nginx/certs/<公网IP>.fullchain.pem` 与 `.key`；reload 为 `nginx -s reload`。

## 6. 日常发布

本机：

```powershell
powershell -File scripts/deploy-nongyu-track.ps1
```

交叉编译 `GOOS=linux GOARCH=amd64 CGO_ENABLED=0` → scp → `install` 到 `/usr/local/bin/nongyu-track` → `systemctl restart nongyu-track`。

不上传：`.env`、SQLite、源码（除非排障）。

## 7. 变更记录

| 日期       | 说明                                        |
| ---------- | ------------------------------------------- |
| 2026-08-16 | 初稿：独立机 + IP HTTPS，对齐 Node 现网做法 |
