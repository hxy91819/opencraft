# 会话、执行运行时与能力租约所有权

本设计适用于 OpenCraft 的会话执行边界。DSH 是首个具体实现；其他引擎通过自己的 adapter 实现相同语义，不必采用 DSH 的 Agent 对象或私有 bridge。

会话存在、历史可读、运行实例已加载、工具访问权有效、某轮正在执行是不同事实。不得用一个 `ready` 或 `loading` 同时表达它们。

身份与协作的上位原则见[原生主体与 Hub 协作设计纲领](architecture/actor-collaboration.md)：人类与持久 Agent/Bot/Session 都是主体，权限大小不决定主体性。本文继续规定执行对象、连接与租约的所有权；Runtime 的执行所有权不替代 Session 的主体身份。目标设计中的身份准入、Channel 与跨 Hub 授权仍待实现。

## Client / Hub / Server 拓扑

当前连接与执行契约的协议参与者是 Client、Hub 与 Server，不是 Renderer、Host 与引擎；此拓扑不要求在产品主体模型中再建立一个“逻辑协作 Server”：

```text
Client ── ClientAttachment ── Hub ── ServerAttachment ── Server
                               │
                               └── HubLink ── Hub
```

- Client 是有身份和 incarnation 的交互参与者。一个 Client 可以承载零个或多个
  Renderer；Renderer 只是 Electron、静态 Web、React Native 或其他呈现机制，
  不进入 Thread、Server 或租约的持久身份。
- Hub 是具有自身身份的逻辑网络节点，Endpoint 是其具体接入地址；在此契约中承担目录、接入鉴权、路由、订阅、扇出和租约边界。Hub 与租户/项目作用域独立，资源所属权威仍复核动作权限。tenant 是 attachment
  与 route 的必填作用域，不从 socket、Renderer 或默认账号猜测。
  这是契约要求；现有类型或 lease 路由本身不能证明完整的 Actor 准入或多租户隔离已经实现。
- Server 是 Thread、历史、执行状态与能力状态的权威。Server 可以同时注册到多个
  Hub；Client 也可以同时连接多个 Hub。双方通过 attachment 形成多对多关系，
  不互存一个单值对端 ID。
- Host 是 Server 的部署与资源载体，拥有进程、文件、PTY 和引擎实例；更换 Host
  不改变 Server 或 Thread 身份。当前代码中的 `hostId` 仍压缩了 transport route、
  Server namespace 与 Host placement，迁移期只能在
  `legacyDirectServerProjectionFromHost()` 这一处按一对一直连拓扑投影。

同一 Server 经不同 Hub 可达仍是同一个 Server；Thread 的稳定身份是
`(serverId, threadId)`，Hub route、tenant authorization、Host placement 和连接健康
均为正交事实。级联 Hub 逐跳验证授权并携带 route epoch、幂等执行键和有界 hop
信息；必须拒绝环路、旧 epoch、跨 tenant 帧与重复执行。

Hub 可经直连、中继等方式级联成更大的网络，不要求全互联、唯一中心或固定父子树；这是目标拓扑，不表示现有 HubLink 类型已实现中继协议。中继只改变可达路径，不隐式授予身份、租户成员关系或资源权限；断链及路由切换不删除目标状态，未知执行结果须先查询对账，不能换一条路盲目重发。

## 对象与唯一所有者

| 对象 | 唯一 Owner | 身份与寿命 |
|---|---|---|
| Draft | Client 草稿服务 | 本地输入意图；不是 Server Thread |
| Thread 与产品目录 | Server 的 ThreadLifecycle/ThreadCatalog | `(serverId, threadId)`；换 Hub、Renderer 或 Host 后仍保留 |
| 历史 | 对应引擎的持久化服务 | 原生日志是历史真源；目录、Replica 和 UI 不另存权威副本 |
| 引擎运行实例 | Host 的引擎 adapter | DSH Agent 是内存执行对象，可加载、空闲保留、卸载 |
| Client/Server attachment | Hub | 绑定 tenant、lease 与 incarnation；可撤销、可多对多 |
| Capability 声明与访问租约 | Server capability broker | 绑定 Thread 和具体 Client attachment；可撤销 |
| 引擎内工具挂载 | 引擎插件 | 绑定当前 native Agent 实例；不等于访问权限本身 |
| Turn 执行权 | Host execution authority | 连接 owner、执行 epoch、Turn 身份；直到明确终态 |
| Codex 待处理交互的投递路由 | Host 的 Codex adapter | 绑定物理 AppServer request ID、Thread 与当前 logical Client；断线撤销答复权但不删除请求 |
| View 与导航 | Client Shell | 页面呈现、焦点、订阅；Renderer 不是协议 owner |

同一个 Thread 可以存在且可读取，但没有活跃引擎实例。关闭 View 不等于停止 Turn；连接撤销不等于删除历史。原生 preset 属于引擎 composition，外部 Browser/Terminal/Connector 工具通过可撤销 scope 接入，不能把客户端回调权限固化进 preset。

### Logical channel response ownership

AppHost physical Host generations may carry several admitted logical leases in
one renderer connection. A targeted frame retains its validated `leaseId` in
the Hub-to-client envelope after the internal logical Client marker is removed.
The browser dispatches that frame only to the owning lease at its acknowledged
Host generation. A peer's frame or status cannot grant a channel a generation;
only its own connect acknowledgement can. Retired lease replies are discarded.
In logical-routing mode requests and responses without an owner are dropped;
only untargeted notifications may fan out to admitted subscribers.

Default JSON-RPC IDs include a client-instance prefix and a monotonic sequence.
That prefix is local protocol correlation, not a durable Client, Server or
Thread identity. Routing isolation must still hold when two leases deliberately
reuse a request ID. AppHost protocol version 2 requires the lease-aware routing semantics; mismatched
version-1 peers fail the handshake instead of silently losing isolation. The
lease field is absent only for broadcast notifications or non-logical direct
adapters. Older renderers need refresh; unique RPC IDs do not substitute for
targeted notification/request ownership.

The AppHost protocol package exposes a JavaScript-only `./version` entry for Node delivery/readiness scripts; these scripts must not load the TypeScript domain entry or depend on a TypeScript resolver. The domain entry re-exports the same constant.

Machine discovery is a cold control-plane read. Daemon and headless local DSH
and Codex routes share the deployment's persisted machine identity. Headless
SSH routes return unsupported identity without dialing SSH or allocating the
native engine; they never return the Hub's identity as the remote machine.
The deferred adapter forwards trusted submission context without alteration.

Initial conversation presentation precedes remote readiness. Navigation owns
an activation epoch and distinguishes connection preparation failure from Thread
acquisition failure. A connection-stage failure may resume the same initial
intent once the runtime becomes ready, at most once per readiness transition.
New navigation, cancellation and disposal retire that intent. Thread-domain
rejection remains explicit; readiness does not retry it or replay Turn writes.
Scope/View commitment stays in the conversation activation owner, not the
runtime reconnect loop.

## Workspace 解析与 Projectless Thread

Workspace 是执行 Host 的本地资源身份，不属于 Client 或 Renderer。新 Draft 没有选择 Project 时仍可提交；Local Host 在用户 Home 下的 `OpenCraft/` 根目录为该 Thread 创建独享的 `thread-<id>/`，再把确定的 `cwd` 与 `runtimeWorkspaceRoots` 交给引擎。macOS 和 Windows 分别由 Host 的 `homedir()` 投影为原生绝对路径，Client 不构造 `/Users/<name>` 或 `C:\\Users\\<name>`。

显式 Project 不得静默降级为 Projectless。Host 在引擎创建前解析、规范化并验证 Project cwd 与 sandbox roots；缺失、非目录、相对路径和不可访问分别返回稳定的 Workspace fault。Projectless 目录只在 Thread 创建失败且仍为空时回收；一旦成功，它是用户工作空间而不是运行时临时目录，关闭 View、卸载 Agent 或退出应用都不得删除。

## Readiness 的含义

| 条件 | 可以证明 | 不能证明 |
|---|---|---|
| Host/AppServer ready | 协议连接已初始化 | 某 Thread 已恢复或可执行 |
| History authoritative | 首屏历史有服务端基线 | Agent 已加载、工具已挂载 |
| Capability declaration accepted | Host 接受当前客户端的声明 | Engine 已完整挂载；冷态允许 deferred |
| Engine tools mounted | 当前实例具有所需工具集合 | 旧客户端仍获授权、模型或权限仍匹配 |
| Turn admission accepted | Host 接受本轮执行 | 推理或工具操作已成功完成 |

`AgentRuntimeDirectory.ensureReady()` 当前是 Host 连接边界，不能用其名字推导为 Thread 执行实例就绪。Renderer 的 `capabilityDeclarationAccepted` 可以接受冷态 deferred；真正执行前的完整挂载检查属于 Host。

## 新建、恢复与执行

新建路径：

1. Host 验证声明并为本次创建分配 native session ID。
2. 引擎创建 Agent，在 native setup 内挂载 preset 和首次 Host capability scope。
3. setup 失败由引擎创建生命周期收尾，不能发布半装配的 Session。
4. Host 确认客户端仍有效，绑定 broker 声明，确认挂载结果。
5. 准备成功后提交产品目录、订阅及 `thread/started`。
6. 第一轮输入通过执行准入后进入引擎。

上述目录提交顺序只适用于 `thread/start` 已经产生可恢复持久身份的
Host。Codex AppServer 的新 Thread 在首轮接纳前可能只有内存身份、writer
lock 与 shell snapshot，尚无 rollout；此时 Renderer 若先将 Draft 升级为
Thread，激活阶段的 `thread/resume` 会与首轮提交竞态并得到
`no rollout found`。这类 Host 必须声明
`opencraft/thread-start-durability: { durableAfter: "first-turn-accepted" }`：
Workbench 在同一 Draft 提交事务内依次完成 `thread/start` 与首个
`turn/start`，收到含 Turn ID 的回执后才导航升级；确定性失败保留原 Draft
及原输入。该能力不声称两个 RPC 是数据库原子事务，也不允许在未知网络
结果后自动重发。

恢复已有会话时，历史读取独立完成并呈现；capability 声明可在后台准备。失败不清空已恢复历史、不删除已有 Thread。用户执行时重试所需准备，并在提交位置呈现失败。

执行准入必须保证检查与提交之间绑定没有变化。Capability 替换和执行准入复用 Host 的 ThreadLifecycle 队列；引擎执行权继续由 execution authority 管理。不能只在 `await validate` 前检查“当前没有执行”，随后无条件卸载工具。

停止任务、审批回复、撤销与队列删除不等待 capability 初始化；仍需验证各自对应的 Thread、Turn、请求身份和权限。控制操作应在故障时保持可达。

## Interaction 响应与重连对账

Server 发起的 approval、question、option picker 与 MCP elicitation 仍由 Server
拥有 pending/resolved 真相。Client 点击 Skip、允许或提交只产生一个响应意图，
不能在 JSON-RPC response 写入物理 transport 前宣称请求已经结束。Renderer 只呈现
`pending/submitting/error`，不保存重放墓碑，也不因按钮点击自行删除权威请求。

每个 Client 的 Host-scoped Workbench runtime 持有有界的 response delivery ledger，
跨同一 runtime 的 physical client generation 保留 exact response。Ledger identity
绑定 Thread、server-request method 与 Turn，并优先使用稳定 Item/call ID；缺少 Item
时才回退类型保真的 request ID。同 identity
复用不同请求 payload 或不同 response 必须拒绝。response 写入 transport 后进入
短期 delivered tombstone；结果未知时保留 resolving response。Server 在重连后重发
同一请求时，Client 自动回放完全相同的 response，不重新发布 pending View。

delivery receipt 只证明本次 JSON-RPC response 已交给 transport，不能证明 Provider
已经执行。Server 若通过 `serverRequest/resolved` 宣布独立终结，Client 删除对应
ledger entry。当前 ledger 是 Client runtime 内存状态，用于跨 transport generation
对账；跨 Client/应用重启的 pending/resolving/resolved 持久化仍应由 Server 实现，
不得把 localStorage、React state 或 Client ledger 升格为 Server authority。

Codex stdio adapter 在同一物理 Host generation 内另持有投递路由表，不取代
AppServer 的 pending 真相：它保留待答复请求的原始帧与 Thread ID，并只接受当前
Thread 交互 owner 的 response。logical Client 断线或取消订阅时，adapter 撤销其
答复权但保留请求；其他在线 Client 不因订阅或连接存在而自动取得请求。新的
logical Client 成功 `thread/resume` 后才能认领无主请求并收到原始帧；迟到的旧
resume 回执不能恢复已断开的 owner。AppServer 独立发出 `serverRequest/resolved`
时删除对应路由。路由表有界且只存于 Host 进程；服务重启后的恢复仍由 AppServer
与 Client ledger 的协议对账承担，不声称跨进程持久化或多租户授权。

同一 Codex stdio 连接上的原生 Thread 订阅属于 Host，不属于任何单个 logical
Client。Client 的 `thread/unsubscribe` 只撤销其读者身份；pending `thread/resume`
在回执前是临时读者，取消或断线同步撤销，旧 Client incarnation 的回复既不能
恢复读者/交互 owner，也不能投递给同 ID 的新连接。Host 的已接纳 Turn、未结
队列和待答 server request 独立要求保留原生事件流；只有无读者、无这些需求且
原生 Thread 空闲时才能回收物理订阅。回收与新原生工作按 Thread 串行化。

## 撤销、重连与释放

断线首先同步撤销客户端 owner 与执行权限，再异步清理引擎挂载和待处理调用。所有在途操作在提交前重新验证 owner；旧请求不能恢复已撤销租约。

Logical client incarnation 与 physical socket、客户端提供的 logical ID 分开。同一物理连接重新建立同名 logical client 时使用新的 owner 身份；旧实例的清理不能删除新实例。

工具挂载和完整 Agent release 在引擎侧使用同一 native session 操作队列。只把 release 后的 unregister 放进队列不够，Agent dispose 本身也必须受协调。Host 的旧 owner 清理不得撤销后继 owner 的能力。

注销失败属于真实失败，不能静默当作成功继续替换。连接清理可以尽力完成，但权威访问权限必须已经撤销。关闭插件时先停止接受新的生命周期操作，再等待既有操作收尾并释放资源。

## 不变量

| ID | 约束 |
|---|---|
| EXO-01 | 目录查询、历史读取和 View 呈现不隐式获得 Turn 执行权 |
| EXO-02 | Thread 持久身份、native runtime 实例、连接 incarnation 和执行 epoch 不混用 |
| EXO-03 | 声明接受、冷态 deferred 与完整挂载是不同结果 |
| EXO-04 | Capability 替换与执行准入共用 Thread 协调边界，校验到提交之间不可被替换 |
| EXO-05 | Owner 先撤销后清理；所有异步完成均受生命周期有效性约束 |
| EXO-06 | 停止、审批回复和撤销不依赖重新准备工具成功 |
| EXO-07 | 新建产品目录不早于准备成功发布；已有持久历史不得作为挂载失败的补偿删除 |
| EXO-08 | 相同工具挂载幂等；完整挂载、释放和清理必须遵循同一资源顺序 |
| EXO-09 | Bridge 只返回允许列表中的错误码；截断任意异常文字不构成脱敏 |
| EXO-10 | 预热复用正常准备流程，不改变身份、权限或持久化语义 |
| EXO-11 | 未选择 Project 时由 Host 创建 Projectless Workspace；Renderer 不猜 Home，显式 Project 失败不得静默换目录 |
| EXO-12 | Client、Hub、Server 是顶层协议身份；Renderer 与 Host 只分别描述呈现机制和部署载体 |
| EXO-13 | Hub 拥有其 attachment/route 关系；tenant 是独立授权作用域，不由 Hub/Endpoint 推导，既有 attachment/route 的 tenant、lease、incarnation/epoch 校验要求保留 |
| EXO-14 | Server 身份不随 Hub route 或 Host placement 改变；相同 Server 经多条 route 不复制 Thread |
| EXO-15 | 级联 Hub 拒绝环路、旧 route epoch、跨 tenant 帧和重复执行；断开 route 不删除 Server 状态 |
| EXO-16 | Interaction 的 Server 真相与 Client delivery ledger 分离；点击不等于送达，重连只可回放同一 identity 的 exact response |
| EXO-17 | Renderer/Client attachment 消失只撤销该连接的路由与访问权；进程级 Host transport 和已接纳 Turn 不因最后一个页面关闭而结束。服务进程关闭与显式 Stop 仍可结束执行。 |

## 已有复用与 warm 的边界

当前已存在 Host 连接 single-flight、DSH session activation single-flight、Thread binding 复用，以及最后订阅离开后的默认 30 分钟延迟卸载。这些机制应继续由现有 owner 管理。

当前没有预创建 Thread reservation 或 hover 后提前 loadSession 的产品流程。若引入预热，应先证明耗时所在，再定义目标配置指纹、连接/引擎代次、单次消费、TTL 和失效释放。预热失败允许正式请求重试；其 TTL 不得回收其他消费者或活动 Turn 持有的资源。不要为预热再创建第二套 Thread 或 Agent 权威。

## 实现与验证入口

- Host 装配：[main.ts](../apps/local-agent-host/src/main.ts)。
- 目录/订阅/协调：[ThreadLifecycle](../apps/local-agent-host/src/thread-lifecycle.ts)。
- 客户端租约：[DshCapabilityBroker](../apps/local-agent-host/src/dsh-capability-broker.ts)。
- 执行权：[DshExecutionAuthority](../apps/local-agent-host/src/dsh-execution-authority.ts)。
- 引擎生命周期：[thread engine](../apps/local-agent-host/src/dsh-thread-engine.mjs)、[capability plugin](../apps/local-agent-host/src/dsh-capability-plugin.mjs)。
- Renderer 历史和声明准备：[Workbench runtime](../packages/workbench-runtime/src/appserver-runtime.ts)。

回归必须覆盖：注册悬挂时历史可读且停止可达；校验期间断线后迟到提交被拒绝；替换与 Turn 准入交错；同 socket logical client 重建；并发重复挂载；setup 挂载失败后原生列表无新 Session；释放与挂载交错；错误正文包含敏感内容仍不回传。

模型测试从 `tests/thread-lifecycle.test.ts`、`tests/dsh-capability-broker.test.ts`、`tests/dsh-execution-authority.test.ts`、`tests/chat-workbench-draft.test.ts` 进入；真实引擎验证使用 `scripts/smoke-dsh-capability-plugin.ts`。这些是验收范围，不能把测试入口存在当成每种交错已完整验证。

## 尚未闭合的交付边界

Native setup 回滚、Host 目录提交和跨进程回执不是一个数据库事务。当前 Host 预分配 native session ID，使请求超时后的运行资源释放可以定位原创建；这仍不等于跨重启幂等或 exactly-once 创建。

创建已持久化但响应丢失时，后续还需稳定 operation ID、结果查询和重试复用契约。补偿不能以删除持久日志代替确认。工具挂载的端到端 lease revision/CAS 以及超时取消传播也不能仅凭串行队列推定已经实现。

本设计描述所有权和目标不变量；当前测试、全量 gate、签名包与对方机器的验收证据分别记录在下游产品工作区的整改记录（不在本仓库）。源码修改不等于旧分发包已经更新。

## Conversation schedules

A conversation schedule is owned by the long-lived Server-side Host service,
not by a View, renderer connection, engine timer API or creator's expired login
context. `@opencraft/host-schedules` exposes `opencraft/conversation-schedules`
version 1 and `opencraft/schedules/{list,read,save,action}` on local Codex and DSH
Hosts with an attached schedule owner. The capability is explicit; accepting a
method name alone is not evidence of background scheduling support. Managed
Headless initializes that owner at startup when connected to the native core,
so existing schedules recover before any browser connects. Other deployment
modes must initialize their Host owner before schedules can run.

`ConversationSchedules` owns a managed per-Host `conversation-schedules.sqlite`
with plans and occurrence history. Each conversation has one current plan,
revision-checked mutations, an absolute first execution instant, optional fixed
minute interval and an IANA display time zone. Intervals measure elapsed time;
they are not calendar cron expressions or promises of local wall-clock daily
execution across daylight-saving changes. The existing conversation menu is
the only creation entry. Editing and background reads do not replace a form's
captured revision or unsaved draft.

`ScheduleExecutionPort` separates scheduling from engine admission. An adapter
validates the target, attempts non-interrupting submission using the occurrence
ID, and independently inspects execution outcome. Codex reuses its durable
queue, records the acknowledged native turn ID and inspects that turn's history;
queue delivery is not completion. DSH persists the occurrence input identity in
its execution journal before native submission, waits for human/queued/armed-Goal
work, and inspects that journal. It never resends an ambiguous or orphaned
execution after Host restart. Hermes and Pi must provide equivalent adapters
and capability declarations before exposing this feature. Their queue
or transport being available does not establish scheduler support. A browser
bridge must not own unattended schedules.

Busy conversations and unresolved interactions defer admission. One unfinished
occurrence blocks further occurrences for that plan; missed intervals coalesce
to one execution and the next future interval. The intent is persisted before
submission. Restart repeats the same occurrence ID against an idempotent queue,
not a fresh send. Unknown delivery remains blocked and is never automatically
replayed. Explicit user review stops tracking that uncertain run and pauses the
plan; it does not infer success or resend. Queue-level deduplication is not an
exactly-once guarantee across engine admission and process failure.

Pause/delete stop future admissions and waiting occurrences; already submitted
execution can continue and is stopped through the conversation's normal control.
Shutdown stops the timer, waits for the in-flight tick, then releases storage.
Failures use safe diagnostics without prompt, credentials or raw upstream errors;
mutation failures appear through Workbench's non-blocking notice owner.

Schedule management inherits the currently admitted shared Host authority. Creator
identity is audit provenance only, not an authorization grant, credential cache or
impersonation mechanism. This feature does not establish per-user tenant isolation.
Scheduled prompts carry explicit scheduled-task provenance rather than fabricated
employee sender metadata.

### Schedule catalog projection

Hosts declaring `opencraft/conversation-schedules.summary=true` expose
`opencraft/schedules/list`, returning only thread ID, plan status, next-run time
and whether acceptance needs review. Prompts, creators and execution history stay
out of this list. The owner emits `opencraft/schedules/changed` after committed
semantic summary changes, not on busy polling or inspection timestamps.
Clients query once per admitted Host/profile/authorization scope, refresh after
invalidation, reconnect or background catch-up, and retain same-scope cached
facts through transient disconnection. Late results from replaced runtimes or
revoked scopes cannot publish. Rows never issue per-thread schedule reads.
An active or paused plan adds an independent neutral clock; settled one-shots
and deleted plans disappear unless an unknown occurrence still needs review.
The marker has no effect on activity grouping, unread or execution state.

## 主体协作输入

Headless 的主体协作服务将执行请求交给现有 CodexHostQueue，以稳定 clientUserMessageId 查询回执和恢复，不拥有第二个运行领取者。queue 与 steer 分别授权，steer 固定 expectedTurnId；Actor 代次、实例准入、目标 grant 和运行绑定在入队及领取前复核。协作提交不等于任务完成，结果不明先查询，绝不自动换成另一种执行模式。完整契约见[主体协作接口](actor-collaboration-api.md)。
