# 服务器 Codex 核心服务

服务器可显式启用 `@opencraft/codex-core`，将一个 `codex app-server`、账户池代理、登录、凭据刷新与用量维护放在独立长驻进程中。执行网关和 daemon 只持客户端连接。关闭最后一个页面、关闭 daemon 或重启执行侧不终止核心服务中的活动轮次、shell 工具、原生 queue 与 goal。

桌面端默认继续使用 daemon 内嵌 stdio 模式。没有 `--codex-core-endpoint` 时不会探测或启动核心服务。本次没有增加执行入口、版本化实例、会话分配或 DSH 平滑升级能力。

## 所有权与协议

- 核心服务是 Codex 数据目录内 `account-pool.sqlite`、`secrets/`、`login/`、`refresh/` 与 `runtime/` 的业务 owner。daemon 远程模式不打开这些目录。
- CLI 的 `CODEX_HOME` 是 `<data-directory>/runtime`，工作 cwd 来自显式 `--runtime-directory`。CLI 只收到回环代理 URL 和 synthetic Host token；真实账户凭据由代理读取。URL/token 在核心服务一次生命周期内稳定。
- 原生入口为 `codex app-server --listen unix://...`。Unix socket 使用 WebSocket HTTP Upgrade，连接各自 initialize，不能当 JSONL 使用。每个 daemon adapter 持一个原生连接，负责 logical client 与请求 ID 映射。同一连接上的逻辑订阅计数，最后订阅者离开才发送 native unsubscribe。
- `GET /health` 与 `POST /accounts` 位于独立 Unix HTTP 控制 socket；后者接受 `{method, params}`，仅转发 `opencraft/codex/accounts/*`。两者要求 `Authorization: Bearer <daemon token>`，与 daemon 共用私有 token 文件。无远程 shutdown 接口。
- socket 目录必须为 0700，控制与原生 socket 均为 0600；原生 listener 依靠 Unix 文件权限限制访问。CLI 可能把原生路径建为符号链接，验收应使用 `stat -L` 检查实际 socket，不能把符号链接自身的 0777 当作目标权限。不要将原生 socket 通过公开网关暴露。
- 健康检查返回协议版本、core PID、启动的 Codex 子进程 PID 与原生 socket。官方 npm CLI 可能有 Node wrapper，部署验收还须记录其实际 native 子进程 PID，不能只比较 wrapper。
- 核心服务不可用时 daemon 明确失败，不创建第二个 writer，不重放结果未知的 mutation。恢复后由既有客户端重连/resume 恢复会话。
- 正常维护关闭时先结束 CLI，再等到账户 RPC、用量维护和代理已接收请求的异步处理结束，最后关闭存储并释放 writer 锁。HTTP 断连不等于其 OAuth 刷新已完成；刷新中的新凭据仍须落盘。

数据目录使用独立 `.codex-writer.sqlite` 的持有式 SQLite EXCLUSIVE 事务作为启动互斥，随持有进程退出由内核释放。内嵌模式也获取同一锁。Linux 启动还检查已有 `app-server` 进程的实际 `CODEX_HOME`，拒绝旧版内嵌或孤儿子进程仍占用相同目录的情况。不要删除活进程的锁文件来强行启动第二份服务；旧版迁移必须先停旧 writer。

## 构建与启动

在当前 checkout 安装依赖并构建：

```sh
npm ci
npm run build --workspace @opencraft/codex-core --workspace @opencraft/opencraft-daemon
```

将 core bundle 放到独立安装目录，普通执行侧构建不得覆盖或重启它。以下部署模板的路径和用户需按现场填写；不要把私有 token 写入 unit 或命令行。

```ini
[Unit]
Description=OpenCraft Codex Core
After=network.target

[Service]
Type=simple
User=opencraft
RuntimeDirectory=opencraft-codex-core
RuntimeDirectoryMode=0700
UMask=0077
WorkingDirectory=/srv/opencraft
ExecStart=/usr/bin/node /opt/opencraft/codex-core/main.cjs --endpoint /run/opencraft-codex-core/control.sock --token-file /var/lib/opencraft/daemon.token --codex-executable /usr/local/bin/codex --runtime-directory /srv/opencraft --data-directory /var/lib/opencraft/codex --native-codex-home-directory /var/lib/opencraft/native-codex
Restart=on-failure
RestartSec=3
KillMode=control-group
TimeoutStopSec=150

[Install]
WantedBy=multi-user.target
```

执行侧 unit 只使用 `Wants=opencraft-codex-core.service` 与 `After=opencraft-codex-core.service`，不得使用 `PartOf` 或 `BindsTo`。两者有独立 cgroup。执行侧启动 daemon 时增加：

```text
--codex-core-endpoint /run/opencraft-codex-core/control.sock
```

使用 `OpenCraftDaemonClientManager` 的网关设置 `codexCoreEndpoint`，其余 daemon 参数不变；daemon 从既有 `OPENCRAFT_DAEMON_AUTH_TOKEN` 取得相同 token。首次启动前 token 文件必须已存在，保持 0600。不更改 Caddy、Nginx 或页面认证。

## 切换、升级与回退

首次切换在隔离验收通过后进行：确认部署工作区空闲、旧 Codex 无加载/活动会话；备份执行网关、daemon bundle、unit 与私有 Codex 数据。停止旧 writer 后，核心服务才能打开原目录。切换执行网关参数并启动独立 unit，核对两条 `runtime/machine/read`、模型菜单两组及健康状态。再次重启执行侧，比较 core、wrapper 和 native PID，并在页面重连后检查 Codex 可用。

**升级 CLI、核心服务或账户代理代码需要重启 core，会中断正在运行的 Codex 任务，属于维护操作。** 本方案把它们移出普通执行侧升级范围。当前原生协议没有完整 drain 事务；维护前检查活动轮次、工具、queue、goal、待审批与账户维护。不得为维护隐式暂停 goal 或批准请求。持续活动无法自然清空时需由操作者明确安排暂停/取消。本次不升级 CLI，不宣称跨 CLI 版本兼容或 core crash 后原地续跑。

回退内嵌模式同样需要维护窗口：先停止执行侧、停止并禁用 core，确认 native writer 退出，再恢复备份的网关参数和 daemon bundle，移除执行侧 core 依赖并启动执行侧。通常保留当前数据，不自动用旧备份覆盖新会话或账户变更。具体备份和回退脚本属于部署记录，不提交机器路径或凭据。

## 验证

```sh
npm run typecheck --workspace @opencraft/codex-core --workspace @opencraft/opencraft-daemon --workspace @opencraft/account-pool-host --workspace @opencraft/workbench-electron
npm run test:appserver
npm run test:codex-core
npm run check:boundaries
```

核心测试覆盖账户控制鉴权与转发、零连接生命周期、重复 writer 拒绝、远程不可用不回退、同连接多逻辑订阅及不同原生连接隔离。部署前还需在隔离 HOME/数据目录、假 Responses 端点、无真实凭据下运行固定版本真实 CLI，验证 30 秒以上流和执行中 shell 跨 daemon 重启完成，所有页面断开期间完成、queue 只消费一次、goal 续跑及 pending approval 恢复。保留 PID、原 turn ID、请求次数、history/completed 与清理记录。

线上只做不触发推理的健康、身份与菜单检查。真实任务连续性单独获得授权；合成推理不替代真实 OAuth、外部模型、全部工具或桌面呈现验收。
