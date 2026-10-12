# Codex 核心服务（路线 B）

## goal
服务器执行端或最后一个页面断开时，Codex 的活动轮次、工具、queue 与 goal 由独立核心服务继续执行。

## non_goals
- 不做执行入口、版本化实例、会话分配、DSH 升级或桌面默认行为变化。
- 不升级 Codex CLI，不修改认证/反向代理，不发布 npm 或 push。

## requirement_refs
本次用户的「Codex 核心服务（路线 B）」需求；第 1E 步设计 `design/execution-ab-upgrade/codex.md`（设计 worktree）第 4、5、5.1、9 节。

## interface_refs / data_structure_refs
- `apps/opencraft-daemon/src/codex-engine-adapter.ts`：logical client 映射、初始化和订阅。
- `packages/account-pool-host/src/`：SQLite、secrets、账户 RPC、代理和维护生命周期。
- `apps/workbench-electron/src/daemon-client.ts`：显式 core endpoint 透传；默认内嵌。

## history_context
基线 `42b5844`；代理 pipeline 修复 `181078f` 已在基线内。第 1E 步以 CLI 0.162.1 证明 Unix WebSocket 多客户端；旧页面最后 claim 会终止内嵌 CLI。

## acceptance / validation
- 受影响 workspace typecheck、`npm run test:appserver`、核心测试、`npm run check:boundaries`。
- 隔离真实 CLI + 假 Responses：32 秒流和运行中 shell 跨 daemon 重启，PID/turn 不变，恢复能看到完成；零客户端、queue/goal、账户转发、不可用错误。
- 线上先确认空闲/旧 Codex 无活动，备份后独立 unit 切换，核验两 Host 身份、模型菜单与执行侧重启时 core/CLI PID 不变。初次验收不发起推理；真实任务须单独授权。

## affected_paths
`apps/codex-core`、daemon、账户包、daemon 启动透传、相关 tests、docs 和本设计。

## context_receipt
| 文件 | 阅读原因 | 用途 |
|---|---|---|
| 根与项目 `AGENTS.md` | 执行/交付规则 | 干净 worktree、独立构建、验收 |
| Context Router 命中的 agent-gateway-runtime / site-environment-routing / upstream-subtrees / services/opencraft | 根入口要求 | 明确本服务边界，无其他服务修改 |
| `docs/platform-architecture.md`、`docs/architecture/opencraft-app-host.md` | 所有权 | 服务器 core 与 desktop embedded 分开 |
| `opencraft-maintenance` 与 verification | 维护要求 | 真实协议与部署证据 |
| 第 1E 步 codex.md、README、lab*.mts、disconnect-lab.mts | 已核实实验 | 复用原生 listener 与本地合成推理方法 |

## decisions
- 原生 Unix WebSocket + 独立 Unix HTTP 控制接口；复用 daemon token，不增加执行调度层。
- 用 SQLite EXCLUSIVE 事务作进程持有式锁，Linux 额外检查旧版/孤儿 CLI 的 CODEX_HOME；避免引入锁依赖或清理活进程锁文件。
- 提取共享账户服务，内嵌与 core 复用；代理关闭等待异步维护完成后才释放存储。
- 上线安装独立 core bundle，执行侧使用本分支构建的 daemon 与启动客户端 bundle；不要求切换主工作区分支。长期契约见 `docs/codex-core.md`。

## evidence / handoff
本机忽略目录 `.local/codex-core/` 保存安装、实验、验收、上线和回退记录。
已完成四 workspace typecheck、216 项 appserver 测试、核心测试与边界检查。真实 CLI 0.162.1 隔离实验通过 32 秒流/运行中 shell 跨 daemon 重启，零客户端/queue/goal/审批恢复，wrapper/native PID 不变；进程与临时状态清理完成。
独立审查发现的订阅失败回滚和代理刷新关闭顺序均已核实修复并补回归；最终完整复审通过。

已完成线上独立 unit 切换、两 Host 身份和模型菜单检查，以及浏览器跨执行侧重启重连；core、CLI wrapper 与 native PID 保持不变。构建产物来自本分支，主 checkout 保持原有 main；没有合并、push 或 npm 发布。回退脚本和私有备份保存在部署记录中。真实 CLI 原生 socket 是符号链接，目标权限与私有目录均已实测核对。

随后收到一次真实 `sleep 60 && echo done` 验收授权。账户检查通过，但实验脚本在首轮发送前让第二连接 resume 空会话，CLI 返回 `no rollout found for thread id`，因此没有发送 `turn/start`，也没有执行这次额外重启。空会话已归档、临时浏览器和工作目录已清理；遵循未启动不重复尝试的约束，保留失败记录，真实线上任务连续性仍未验证。
