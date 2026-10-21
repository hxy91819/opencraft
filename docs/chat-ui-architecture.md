# ChatUI integration architecture

## Shared history backfill coordinator

`TurnHistoryBackfillCoordinator` owns one history-load operation and layout epoch
through the existing `timeline-react` adapter. Same-generation requests share the
operation; replacement generations wait for old work, including failures, before
starting another load. A completed page always reaches the platform layout
barrier, then current ownership/enabled state, explicit stop, missing geometry or
unchanged height ends continuation. Web and Native retain their own measurements
and frame scheduling.

## Shared Turn measurement transactions

`createTurnMeasurementTransaction` projects one measured batch into the height
table, layout, viewport and pending scroll/restore decision. It consumes the
synchronous controller distance, retaining already pending scroll and latest-row
height notifications across uncommitted batches. Callback presence grants its
existing ownership even when no restore target is pending. Web executes the
unchanged synchronous/pending commit paths; Native retains measurement leases
and frame scheduling. Neither platform adds another compensation policy.

## Inline link label construction

The document compiler preserves link label Markdown children while disabling
interactive text decorations within that label, including nested formatting.
The link has one resource action; mentions and color decorations do not create
additional actions in its text. Raw target/title values and existing UTF-16 source
ranges stay parser compatibility data. Sanitization, streaming activation and
opening belong to the existing renderer/resource owners.

## Trusted Web renderer composition

A local Application may declare `chatRenderExtensions` as Cordis renderer plugins.
`createWebChatRenderRuntime` installs them after the standard Web renderers,
using the same registries and resource-policy service. The runtime owns their
fibers: startup failure rolls back preceding installations, and Application
disposal releases them. No extension is installed into the library fallback or
another Application. This is trusted build composition, not an HTTP-supplied
module loader or a product ID switch. Product parsers, dictionaries and artwork
stay downstream. `smoke-product-render-extensions.ts` exercises the real
Application and documents, default isolation and startup/disposal failures.

## User message sender display

Web/Electron show each user message's verified employee `loginName` above its
content, with a 20px circular photo beside the small muted label aligned to the end.
The enterprise identity plugin resolves the photo through the trusted identity-avatar contribution;
failed images retain a same-size person icon. Attachment-only messages use
the same label. Unknown or absent senders leave no label. The label consumes
the individual message snapshot, never the current footer account or Turn author,
and is excluded from copied message text and native model input.

## Queued-message sender display

The queue uses a fixed 20px author photo in its leading drag control, replacing
the decorative return arrow. Hover/focus exposes the author through the existing
custom tooltip; unknown authors and failed photos retain a same-size person icon.
The drag grip and warning indicator retain their interaction/state roles, and
right-side Steer/Send, edit, delete and unconfirmed-delivery review stay distinct.
The avatar is also the drag handle: its desktop hit area extends into existing
padding without moving the 20px photo or message text. Hover/keyboard focus
reveals a centered grip in the same slot. Coarse pointers get a 44px control and
non-overlapping rows; touch focus does not retain a hover grip over the photo.
ChatRuntime carries the original per-entry protocol sender. Exact-client local
submission hints may paint a pending queue before acknowledgement; explicit server
identity (including null) wins, and restored/unrelated entries never inherit the
current employee. Web resolves the enterprise identity contribution into generic name/avatar URL
values; Composer owns only layout/fallback, not enterprise identity URLs or account policy. Queue
editing/reordering never relabels its submitter; these values are display-only.

## Streaming projection and document reuse

The Host session buffers only append-only assistant, plan and indexed reasoning
text notifications. ThreadViewStore reduces original notifications in order and
publishes one consecutive View revision per batch; notification revision and
last notification retain their original semantics. Web/Electron and Expo inject
frame scheduling with a 32ms timer fallback while presented; hidden documents,
embedded parked views and background native applications batch text with a 250ms
fallback and do not request RAF. Headless uses a 16ms timer. Timers
do not guarantee progress while the event loop is blocked. Lifecycle,
replacement, history, interaction writes, authoritative reads and commands flush
preceding text. Completion and its preceding deltas share one publication;
full terminal snapshots still replace Item membership. Generation guards,
cancelled-callback fencing and disposal prevent replay into newer sessions.
Pressure flushes at 512KiB of UTF-16 delta data or 2048 notifications preserve
all text. Batching reduces downstream JSON/Replica/timeline work while still
running each original projector.

The Session-to-Replica source reuses immutable ThreadView subtrees and freezes its
JSON projection. Replica validation memoizes only deeply frozen data properties;
mutable descendants and accessors remain subject to validation on every write.
Conversation normalization and pure per-Turn projection preserve identity for
unchanged history. Projector registration revisions invalidate the Turn cache.
Metadata-only updates reuse frame arrays and anchor maps; text updates rebuild
only the changed Turn's frames, though assembling the ordered frame list still
walks the history. This is not an O(1) claim for every notification.
Host residency publication compares actual ownership/connection changes and
coalesces lifecycle updates in one microtask. Catalog hooks subscribe to Host
state; active conversation consumers retain their own text subscription.

Presentation activity is separate from execution ownership. Goal and foreground
command clocks stop in hidden documents or parked conversation surfaces and
calibrate from wall time when shown. Native working shimmer stops on AppState
background and reduced motion. None of these switches cancels remote execution,
changes queue/draft ownership, or removes visible running feedback.

The compiler caches immutable prefix AST nodes using Marked's actual top-level
token boundaries, then parses the remaining tail. It retains the last block
and preceding live container, protecting lists, quotes, indented code and
partial markers that can rejoin them. Brackets, CRLF and display math
conservatively use full parsing for cross-block dependencies and normalization.
The dialect-scoped cache is bounded to 64 entries and one million key
characters; only matching preprocessed prefixes can be reused. Unclosed fences
retain their real delimiter length and source bytes, without synthetic triple
backticks. This is not a fully incremental parser: a long single block or
fallback still has whole-document costs.

Sessions reuse committed stable node/segment identities and reconcile only
the remaining tail, with cached word segmentation. Immutable parsing memo is
safe for abandoned renders; committed parsed nodes and identity counters move
only under the existing candidate CAS. Reused segments cease to be new entrants
without changing their keys. The bounded global segment reconciler preserves
same-position exact/growing text before globally reusing unconsumed exact text
occurrences. It owns segment keys and entering flags only; word segmentation,
semantic node identity and commit CAS remain separate.  Completion first uses the full parser, then retains
pure completed syntax by exact source and dialect in an LRU capped at 100 entries
and six million key characters. Streaming repairs never enter that memo. A
Session can reuse its committed completed snapshot; Host, theme, resource policy
and rendering stay in the View. Disposal clears compiler caches. Web Suspense
shows an empty busy slot rather than raw Markdown before the renderer is ready.
The Web document boundary uses ordinary React memoization across all props, so
unrelated parent updates skip the unchanged document tree. Source, completion,
dialect, theme, policy, resource and measurement callback changes still render;
runtime Context and document-local enhancement updates retain React's normal
invalidation. There is no custom comparator or second document cache.

Fade owns no execution state. Absolute segment starts have a real 96ms maximum
future wait, followed by the existing 150ms fade, excluding CPU/frame cost.
Remount computes remaining delay; elapsed motion is settled even without
animationend. Prose and resource labels share this scheduler. Completed
documents disable animation at the root and reveal all text. Replica
projection completion remains distinct from React commit and paint.

Tests cover session ordering, document equivalence and segment identity.
`scripts/smoke-streaming-presentation.mjs` checks actual Web DOM/CSS with
synthetic text in an isolated browser; it does not update a running Host or
establish real-provider throughput.

## Browser reconnect outbox

Existing Web/Electron conversations can accept text while their Host is offline
or their Replica baseline is recovering. `ConversationRuntime` owns a local
outbox distinct from the Host execution queue. The platform injects
`ConversationOutboxStorage`; the browser adapter uses tab-scoped sessionStorage
under `opencraft.outbox.v1:`, partitioned by server, product, account, Host profile
revision and Thread. Local persistence must succeed before the Composer clears.
Storage denial, capacity errors and unsupported attachment/context handles retain
the draft. New Thread creation still requires a connection. Native/embedded
consumers without this port retain their existing admission behavior.

The original immutable message and client identity survive reload. Once the
existing recovery owner has restored an authoritative live baseline, one drain
moves never-attempted inputs FIFO into the existing Host next-turn queue. A
steer composed offline becomes a next-turn message, rather than targeting an
obsolete Turn. Server membership/method checks remain authoritative. Local
waiting rows can be deleted offline; they cannot be edited, reordered or
steered through server queue APIs. Their attached rail explains automatic
sending and does not expose a server Resume action.

Before transport dispatch the attempted state is saved. Reloaded attempts or a
lost acknowledgement become unconfirmed and block FIFO; only exact server queue
or timeline client-message identity retires them automatically. They are never
blindly replayed. A confirmed pre-dispatch refusal can return to waiting. An
identity replacement revokes the old namespace and late completions; ownership
is rechecked after asynchronous compilation immediately before sending.
Closing a browser tab ends sessionStorage lifetime; this is not cross-device
or browser-close durable delivery. Reload restores each conversation when its
Runtime is reacquired; background open conversations remain resident for recovery.

## Browser-local input drafts

`ComposerStoreServices.drafts` is a platform-neutral content storage port;
`BrowserComposerDrafts` adapts browser localStorage for Bot input without server or
device synchronization. Task input slots use an account-bound
`ConversationDraftOwnerRegistry`; `ConversationDraftContinuity` remains their
sole document persistence writer.
Bot input is isolated by product/account and exact Host/conversation identity. Document, context and
attachment metadata are saved on explicit edits and cleared after an accepted
send. Lifecycle, selection and disposal changes never overwrite stored content.
Restore creates a fresh editing state, not a submitting lock, receipt or outbox
entry, and never sends automatically. Account credential-scope changes revoke
and clear the old Bot adapter; a fresh application creates the next account's
adapter. Task sidebar selection resumes the conversation's last successfully
presented input slot; explicit navigation and POP preserve independent Views.

Task presentation caching and input retention have separate budgets. A cached
View borrows its slot's original Controller and does not retain that draft owner.
Evicting the presentation after 20 inactive desktop Views (4 on mobile) releases Scope/UI resources,
not the Controller, original Files, previews or attachment jobs. The Application
retains at most 50 nonempty unsent input slots, evicting the least-recently-used
inactive slot and discarding its stored document. Empty inputs do not count.
Physical editing and in-flight submissions protect a slot from eviction; if all
50 are protected, new-content admission is refused rather than deleting live
input or exceeding the budget. Late attachment status changes do not refresh
recency. Promotion updates every slot of the Scope, including slots whose View
has been evicted; the owner holds no Scope, Thread or Host lease. Clear/accepted
settlement releases assets, failed settlement retains input, and account
revocation clears all slots and target caches. Tests: `test:task-draft-switching`
and `smoke:task-draft-switching` (real OpenCraftComposer, synthetic remote boundaries).
New-chat Scope metadata uses a separate 20-empty-record budget; records with
retained input and in-flight first submissions cannot be pruned by that budget.
It queries input ownership rather than retaining an execution lease. Evicted
input cannot rehydrate from its discarded document even while empty navigation
metadata remains.

Task continuity includes new-Draft placement in its existing document envelope,
not a second storage writer. Browser bootstrap can restore that exact client
Draft ID and configured, enabled Host before the View hydrates its document.
Canonical promotion aliases take precedence; old envelopes remain readable.
Browser edits enqueue local writes immediately rather than leaving the last
input behind a debounce window. No execution state is inferred from placement.
Account service disposal revokes asynchronous authority without rotating the
persisted credential scope. Only actual identity/credential transitions rotate
that scope; otherwise every ordinary browser refresh would orphan saved input.

Original browser File bytes survive Task conversation switching within the same
Application. File persistence across a full refresh and ephemeral Side Chat
reload restoration are not implemented. Expired Object URLs and unfinished attachment staging restore as
failed removable cards asking the user to re-add the file, never as ready files.
Storage corruption, denial or quota failures retain in-memory editing; diagnostics
do not log content. Mounted Views do not subscribe to cross-tab changes.
Tests: `tests/chat-browser-drafts.test.ts`, `npm run smoke:browser-drafts`.

Thread identity, execution activation, capability leases and revocation follow
the [execution ownership contract](execution-ownership.md), including its
explicit distinction between implemented coordination and pending delivery guarantees.

## Target

OpenCraft uses the latest Codex AppServer `Thread -> Turn -> Item` protocol. The
AppServer remains the business write authority. ChatUI consumes one normalized
Conversation Read Model: a V4 ReplicaClient for a V4-native Authority, or a
snapshot-oriented compatibility projection for Codex V3 Resume. Web and Native
surfaces share identity, projection, runtime commands, Composer documents and
design tokens. They do not share a renderer or editor implementation.

Host providers may declare localized Composer shortcuts as ordinary prompts or
standalone actions. Selecting either only inserts editable text; explicit send is
required. The core matches only a single paragraph with no attachments/context
and no arguments. Ordinary prompts and unmatched input retain normal submission,
including queue admission. The optional resident `composerCommands` port binds an
action adapter to the actual Host/profile and protocol, never the selected Host
or an engine ID. Disabled/revised profiles, disposed runtimes and retired or
replaced providers refuse new actions; accepted calls hold their own provider
leases until completion, even if the resident runtime is being disposed.

Engine plugins own command names, descriptions and action-to-protocol mapping.
For example, a plugin can give its standalone stop command stronger background
cleanup semantics while the Composer Stop button retains `turn/interrupt`.
A new Draft action need not create a Thread. The expected active Turn is captured
from the matching Conversation so an adapter can refuse to interrupt a newer Turn.

Turn interruption derives cancellation payloads from the typed server-request
policy. Responses decline approvals, dismiss dedicated pickers or leave questions
unanswered; dynamic tool calls remain owned by server resolution. Each invocation
returns its own payload. The conversation runtime selects only the target turn,
settles all response attempts before interrupt, carries the original provenance
and releases its transient interrupt state on failure. The helper does not grant
permissions or own pending-request removal.

The shared compiler's application link scanner returns raw label/destination and
UTF-16 offsets. It uses the existing non-nested destination grammar: the label's
`](` boundary takes priority even after a backslash, while escaped destination
parentheses remain content. CR/LF reject a candidate; malformed candidates do
not prevent a later valid link. Tokenizer unescaping, renderer resource admission
and Host selection keep their existing owners. This grammar is a compatibility
contract, not a claim to implement every Markdown dialect.

The compiler's math extensions retain the application grammar: display uses
`$$` or backslash-brackets with horizontal-only trailing line admission; inline
uses backslash-parentheses and rejects LF inside the first closure. Raw token
consumption and trimmed formula source remain distinct. Compiler placement,
code fences and streaming identity keep their owners.

User-message block normalization retains one list context through indented
continuations and indented fences, separates unindented kind/prose transitions,
and resets on a zero-length line. CR/CRLF normalize globally to LF before this
projection, including fenced lines. It does not own general streaming repair,
compiler identity or resource admission.

## 跨桌面、手机和平板的会话连续性

Conversation Scope 是会话身份，View 是具体窗口或页面的呈现与滚动状态；任务输入槽位以 View ID 标识，但其 Application 级草稿所有权独立于页面缓存。`workbench-runtime` 的 `ConversationDraftOwnerRegistry` 保留原 Controller 与附件资源，`ConversationDraftContinuity` 管理同一输入槽文档的保存、恢复、发送成功后的丢弃和迟到读取仲裁；平台只提供本地存储。移动端用 SQLite，并以区域、凭证摘要和 Bot 实例/Profile 分区；Web/Electron 用浏览器本地存储，并以产品和账号服务的凭证作用域分区。退出登录或切换凭证时撤销旧存储、清除所有草稿所有者及其内部目标缓存，包括已无页面的草稿。附件与临时文件引用不从文档缓存恢复；会话切换保留内存附件不等于刷新恢复字节。

`recovery-policy.ts` 中的 `ConversationReturnProbe` 统一短暂离开、较长前台恢复和断网恢复的触发条件。iOS 把 AppState/Expo Network 事件交给它，Web/Electron 把 visibility/online 事件交给它；真正的追平仍调用当前 Thread lease 的 `retryRestore()`。追平不创建新会话，不重置可读历史。已经显示的内容是否权威，仍由 Replica/Session 决定。

手机、iPad、折叠屏和桌面共享上述身份及状态转换。屏幕宽度、安全区、键盘和指针决定各自布局，不决定另一套业务流程。V3 ThreadView 的 revision/epoch 属于连接代次，不能把它写进持久 Replica 检查点。`ConversationDisplayContinuity` 只从权威时间线保存有界、已完成的用户消息与回答文本；冷启动重建 `painted / authoritative: false` 的只读 Timeline 供两端原有渲染器展示，当前 Host 恢复后整体替换。工具、审批、附件、交互以及 Replica 游标不进入展示缓存，不能从该缓存授权发送或其他操作。缓存按账号、Bot/Host 和 Thread 分区，并在退出登录时清除。

会话定位共享 Turn 身份、最小时间线 revision 和对齐意图。Web 与 Native 都先挂载目标 Turn，等平台实测高度进入虚拟布局后才滚动；用户接管或 View 卸载会取消等待。两端用户消息使用共享 `getTimelineUserMessageTargetKey` 的 Item 锚点；Web 注册 DOM，Native 注册当前挂载行的局部布局。投影确定目标不存在时返回 unavailable；目标存在但尚未测量时继续等待，不能用经过几帧或整条 Turn 的估计位置冒充精确命中。Native 行高度是否已测量与项内锚点是否已注册是独立事实。

Native 远处定位使用两个有界挂载窗口：保留当前可见行，同时挂载目标邻域测量；行按共享布局的绝对 top 放置，重叠行只挂载一次，窗口之间的历史不挂载。执行位置写入后才切换可见窗口。平滑定位只允许请求发起时已挂载且距当前位置不超过一个视口的目标，动画期间可见窗口跟随平台实际位置。`NativeTargetPositionTransaction` 持有语义目标的布局签名和本次请求坐标；内容、锚点、视口或底部占位变化时重新求值，已开始的动画使用瞬时校正收尾。完成依据当前布局与当前位置的匹配，不永久等待旧坐标；目标删除、取消和卸载均释放订阅及帧回调。

虚拟窗口在折叠、历史插入和恢复首帧时必须覆盖当前距离对应的可见 Turn；保存的窗口只能在仍覆盖可见区域时复用。测量批次一次提交高度表、窗口和滚动目标。Web 以当前 DOM 节点、Native 以当前挂载行的测量租约识别高度来源；卸载行及旧实例的迟到回调不能写入新窗口。Native 在内容高度改变而距底部数值不变时仍要于内容尺寸提交后重写物理偏移，保证插入于视口上方的历史不把屏幕推走。用户触摸会中断待执行的自动定位。
滚动帧只更新当前距离与有界可见窗口；完整 Turn 高度快照在离开会话时按需生成。Native 父容器持有可在虚拟列表卸载后调用的捕获函数，避免每次滑动都遍历整条时间线，也避免子组件 ref 先释放时丢失恢复状态。
Native viewport owner 在视口高度变化及没有位置写入的内容尺寸提交时发布同一份几何事实，控制器与虚拟列表不能等下一次滚动事件才同步；几何发布不消费待提交的内容恢复事务，也不触发用户接管。启动尚无内容尺寸时保留初始恢复意图。

用户消息折叠资格只由已确认的自然高度决定。Web 持续观察内层内容尺寸；Native 在内层未裁剪时接受后续 `onLayout`，折叠后只接受超过已确认自然高度的增长，拒绝可能来自裁剪的缩小值及旧内容身份的迟到布局。宽度变化会使旧自然高度失效并重新测量。Native 测量绑定内容、宽度代次、原生节点及挂载生命周期；`measure` 的异步返回使用启动时的观察器，并在回调和状态提交时复核代次。即使宽度由 A 变为 B 又变回 A，旧结果也无效；重测不依赖 RN 再次发送相同尺寸的 `onLayout`。

```text
WebSocket / Replay Transport
          |
Codex AppServer protocol
          |
Conversation Read Model
V4 ReplicaClient or Codex V3 compatibility projection
          |
Conversation Runtime
          |
Thread/Turn/Item -> Timeline Frame -> Timeline Block
          |
Web renderer                         Native renderer
          ^                               ^
ProseMirror adapter                 Native editor adapter
          |                               |
        Composer Document / Draft / SubmitIntent
```

## Non-negotiable boundaries

### Thread goals

Goal menus, dialogs, statuses, action errors and elapsed-time units consume the
existing application Intl provider and locale catalogs. Automatic mode and manual
overrides keep their current authority; switching language updates mounted
controls without resetting the objective draft. User objectives remain unchanged.


Existing Goals occupy a quiet row in the Composer's existing attached rail,
sharing its perimeter/material with the queue. The independent live file pill sits above the rail. Desktop capacity
shows status, truncated objective, compact localized elapsed time, pause/resume,
edit and an actions menu. A narrow Composer container hides the objective and
inline edit action; the same actions remain available in the menu and touch
controls retain the shared 44px minimum. A completed Goal retires from the rail immediately; its server-owned record
is retained. The Composer add menu offers a read-only completed-goal detail
(with explicit removal on writable Hosts) and, on writable Hosts, setting a new
goal. New-goal submission uses the shared resource's explicit create operation:
a fresh native read rejects an unfinished Goal, and a completed Goal is cleared
and confirmed absent before set(active, tokenBudget:null). Native set alone edits
the existing Goal and retains its usage, so it cannot create a fresh accounting
period. Pause/resume and edits continue to use set and preserve their counters.
Cancellation does not mutate the old Goal. If replacement fails after clearing,
the resource retains the last observed completion as a read-only summary, not as
current server state; the editor draft remains retryable. Explicit removal clears
that summary. It is bounded to this resource/connection, not a durable Goal history.
No completion observer clears a Goal in the background or performs writes from
sidebar hydration. Connection replacement fences the remaining create steps.
Ordinary messages and editing never implicitly reactivate a completed Goal. An
edit draft open at completion stays available but cannot save over the completed
Goal. Paused/blocked/limited Goals remain actionable in the rail.
Radix owns detail placement, outside/Escape dismissal and focus restoration;
editing retains ModalSurface and shared Buttons. Resizing/language changes do
not remount the Composer or reset an objective draft. There is no independent
floating primary-colored Goal capsule, and no-Goal consumes no rail space.
The pursuing Goal's leading Target shares the Design System's 3.2-second,
65–100% mask shimmer with the Sidebar Target. Only the glyph animates; labels,
controls and layout stay fixed. Other Goal states remain static. Reduced motion
renders the full static glyph; hidden/inert presentation pauses its animation.

Goal elapsed time decomposes full 24-hour periods into days, then remaining
hours and minutes (316 hours 36 minutes becomes `13 天 4 小时 36 分钟`).
The detail view retains full localized units; the row uses localized narrow units
for space. This changes only presentation, never the AppServer usage counter.

Sidebar Thread menus contain Thread-scoped mutations only. Creating a new task
and opening Host settings remain ordinary application navigation; neither is
advertised as a Thread menu action.

A Goal is durable Codex Thread state, not a Composer draft or a Web timer. The
Codex AppServer owns objective, status, and usage counters. The Codex Host
advertises the supported Goal methods, keeps a replaceable index of active
Threads, and owns continuation after Turn completion, including when no browser
is connected. Queued user input has priority over autonomous continuation;
continuation is serialized with other per-Thread Host operations. The DSH Host
currently advertises read-only Goal support, never a simulated write path.

For SSH Codex, Goals remain native remote Thread state. The shared broker
preserves an explicit upstream Goal capability, or discovers enabled Goals
through the native feature catalog during physical initialization. It exposes
the corresponding native get/set/clear methods, retains read-only declarations,
and omits the capability when discovery fails or Goals are disabled. Reading an
existing Goal does not create, activate, or resume it. The remote Codex owns
autonomous continuation; the SSH bridge never schedules an additional Goal Turn.

Workbench Runtime owns a per-Thread Goal resource: get-on-view activation,
notification projection, revision-fenced reads, reconnect invalidation, and
single-flight writes followed by a confirming read. A failed confirmation is
not reported as success. Web owns only disclosure and an unsaved editor draft;
its card cannot schedule a Turn or become a second authority for Goal state.

The sidebar observes that same Host-scoped resource through a catalog subscription.
It hydrates at most 50 admitted catalog Threads with three concurrent metadata
reads per Host, without selecting/resuming Threads, connecting idle Hosts, polling
or mutating Goals. Runtime replacement, profile revision and authorization
changes stop queued reads. Connection reset discards every cached Goal and
rehydrates observers; native updated/cleared notifications change the icon live.
Usage-counter updates alone do not repaint rows. Failed reads preserve ordinary
activity feedback and wait for connection reset rather than retrying in a loop.
An active Goal uses the existing neutral Target glyph in the fixed activity slot,
including gaps between Turns. Navigation opening, backend waiting and errors
retain their existing indicators. Other Goal statuses and removal restore normal
feedback; this presentation does not alter unread receipts or activity grouping.
The grey Target has a low-contrast mask sweep over 3.2 seconds, retaining at least
65% opacity. It stays still in reduced motion and pauses inside hidden/inert hosts.

When a writable Thread has no goal, or a new conversation Draft targets a writable Goal Host, its creation entry is a standard item in
the Composer's Add menu, not a separate capsule above the editor. The Goal
surface supplies this action to the existing menu and retains ownership of
the editor draft and dialog. Existing goals keep their status and progress
surface. Confirming a new Draft Goal uses native `thread/start` followed by
`thread/goal/set` with active status, without a preliminary user Turn. Application
commands retain the created Thread receipt across confirmation/navigation failures;
retries first read the durable Goal and never reactivate an already completed Goal.
The ordinary Composer input stays in its original Draft. Cancel allocates nothing.
Host/workspace/account/navigation changes revoke late creation and navigation;
confirmation of an already accepted Goal cannot pull the user back to its page.
Read-only or unavailable Hosts do not advertise creation; switching
Threads resets the local editor without remounting the Composer. Menu actions
can supply a scope-fenced continuation to the Add menu's close callback: Radix
finishes its focus cleanup before a target dialog opens, rather than racing two
focus scopes or relying on an arbitrary delay.


### User message code-block sizing

The Web user-message bubble owns its content-sized width and maximum width.
Fenced code inside it must participate in intrinsic width sizing, including
when the fence is the entire message; an inline-size containment used by the
shared code renderer must be lifted only at this bubble boundary. Long code
remains within the bubble's maximum width and scrolls in the code block's own
scroller. Empty-message presentation is based on actual text presence, not on
whether Markdown happens to produce visible inline prose. The shared code
renderer keeps its containment for assistant prose and other full-width hosts.

### Outgoing message handoff

The Conversation Runtime owns the outgoing message from local submit until an
authoritative Composer input or UserMessage Item can actually render it. A Turn
receipt or an empty authoritative Turn is not a visible-message acknowledgement:
the optimistic item is projected into that Turn until its display owner exists.
The client message ID is the stable display identity of the user block, its
frame, and the React Turn row across optimistic, Turn.params, and server Item
phases; the virtualizer's Turn locator and protocol Turn/Item IDs remain
canonical for navigation, measurements, commands and anchors. Web may suppress
the transient sending label, but failed and uncertain
delivery retain visible feedback. This prevents a receipt from briefly removing
or remounting an outgoing bubble while ordinary text and attachments settle.
For Codex Host-staged files, the Host may add a model-visible locator after
`Turn.params` was captured. Once the matching server `UserMessage` acknowledges
that input with the Host-owned display span, its content owns presentation;
the unaugmented Composer params must not overwrite the span or the attachment
type. Ordinary messages continue to use Composer params. This is a projection
choice under one message identity, not a second sent-message branch.
The same acknowledgement rule applies to a locally owned steer: its matching
server `UserMessage` supplies a Host-staged file span to the steering input
projection, while the steering row retains its client identity and status.
The Codex Host now persists the validated attachment refs by Thread and client
message ID before direct or queued dispatch. Native Codex input retains its
supported `mention` plus model-visible locator, but those bytes are never the
display authority. The Host enriches live UserMessage Items and paged/resumed
history with typed attachment metadata from that durable record; a fork copies
the mapping to its new Thread identity. A sent file cannot be removed through
draft cleanup. Pre-existing messages without this record retain a narrow
exact-locator compatibility path, not a general path or filename heuristic.

Native 的实时 Thinking 在 Turn 等待占位与 Activity 组之间交接时使用同一文字 primitive、字重、行高、行容器及扫光呈现。交接只是状态所有者变化，不播放纵向进入动画；Activity 的位移动效只在可折叠历史的展开场景使用。不能用几像素的补偿偏移掩盖两条显示路径的几何差异。

### Changed-file review

The Turn's existing unified diff remains the read authority for its changed-file summary. ChatUI renders a lightweight in-progress entry and a completed resource card; it only emits an open intent. In the Web Workbench, the actual Composer owns the active Turn's live entry above the editor, including when that Composer floats over a panel. The live entry is a compact, content-width pill centered above the Composer with a visible gap, independent of the attached queue/goal rail and its material. The same placement remains when approval replaces the editor. Its exact Turn identity suppresses duplicate live resources in the main and mini transcript; it is presentation routing, not a second execution or resource owner. Standalone Conversation consumers retain inline presentation. On completion, the same resource appears as the transcript's completed card. The Workbench owns the read-only Review dialog, keeps it tied to the active Thread, and projects the current Timeline block while streaming. File selection filters that existing diff for display; it does not create a second TurnDiff model or mutate the workspace. Undo/Reapply is not advertised until a real Host apply-patch capability is connected.

The Web resource presentation uses a square-plus-minus glyph in a 40px
slot, 12px header padding, 10px gaps and theme-owned `radius-lg` (10px in the
default theme). The title uses chat typography; both signed counts are shown,
including zero, in chat-minus-one typography with tabular digits and 4px gaps.
Running counters retain columns and animate their transform, with reduced-motion
support. The digit viewport, each track cell and translation step use the same
inherited line-height (`1lh`), rather than font-size (`1em`), so a resting glyph
is never clipped by a taller chat line box. Interrupted updates settle on the
latest value; no timer or animation completion event owns the count. Completed multi-file cards show three 36px rows by default and an
explicit expanded state; disclosure reflow belongs to the viewport owner.
The shared outline toolbar Button emits “View changes”. Desktop hover offers
an interactive live file list or a bounded small-file diff preview after 800ms;
more than 5000 rendered/change lines bypass inline preview. File clicks close
the live list before opening Review. Modifier-click opens a file only when a
real resource opener exists. Touch does not force hover copy or browser rings.
Diff sections are indexed once per completed resource revision, not reparsed
for every filename. These are Web adapter details; Native preserves its own
touch surfaces while sharing the Turn resource and Review intent.

The aggregate is a **Turn-owned resource**, not an ordered transcript Item.
`chat-runtime` passes `unifiedDiff` separately from source Items; `chat-core`
projects it as `changeSummary` metadata and the assistant presentation plan's
fixed resource surface. Its stable identity is `${turnId}:turn-diff`, without
source Item anchors. Web and Native render that surface separately from ordered
slots. Arrival, update or removal cannot end an Activity segment, alter its work
clock, qualify a final answer, claim Thinking ownership, or move a response.
The live Review lookup includes this resource; ordinary transcript Blocks are
not a second read authority. A resource-only recovered Turn may have an empty
carrier Frame, never a fabricated message. Inline resource surfaces count toward
the virtualizer's top-level geometry; Composer-routed live resources count toward
footer geometry instead. Neither becomes a latest activity follow anchor.

Old `turnDiff` Items are lowered at the shared projection boundary and excluded
from transcript/work-status derivation. An explicitly supplied Turn value,
including null, wins over those compatibility Items; a null canonical `diff`
also wins over a stale `unifiedDiff` alias. This is a narrow compatibility path,
not a new generic resource registry or another persistence store. Regression
tests cover running diff updates, later work, saved collapse choices, reload,
final answers, resource clearing and completed Review cards. The browser fixture
uses the real Conversation and Review dialog in desktop/mobile-width light/dark
views; it is not a production deployment or native-device acceptance claim.

Changed-file row geometry belongs to its renderer: line counts retain their intrinsic width while the path consumes the remaining space. The directory yields first to the basename, but the basename is capped at its path slot and truncates when even the filename cannot fit. Neither path segment may paint over the counts. Truncation affects presentation only; the complete path remains the accessible row label and Review target. Regression coverage includes long basenames without directories, deep directories, both counts, narrow containers and expanding/collapsing the file list.

Skill autocomplete treats a bare `$` as catalog browsing, not an empty file
search. The Composer, runtime catalog and Skill search share this policy;
`@` remains query-gated. Skills are scoped to the current Host/root set,
enabled-only and deduplicated by authoritative path. Empty queries retain
source order; typed queries match canonical name, display label and path.
Discovery errors are rejected before query caching rather than stored as a
successful empty catalog. A Host returning no metadata is not supplemented
with renderer-local or fabricated Skills.

The picker displays loading, unavailable/retry and no-results states, supports
wrapped arrow navigation (and macOS Ctrl-P/N), Enter/Tab insertion and mouse
selection, and never submits while a Skill picker owns Enter. Escape/blur
dismiss the current match without deleting its text; changing the match may
reopen it. Unmatched queries containing whitespace dismiss as in the Codex
reference. Selected text and code blocks do not activate the picker, and IME
commit does not select or submit. Async results carry catalog, target, query,
retry and controller ownership; stale completions cannot become selectable.
Inserted resources retain canonical Skill name/path through the document
codec and native AppServer UserInput compiler.

`smoke:skill-autocomplete` tests the real ProseMirror Composer with a synthetic
Host catalog in Chromium or isolated Electron. This proves the interaction and
protocol payload, not remote Skill installation or model execution.

Model-response URLs are resources, not page-local anchors. `chat-document`
preserves the model-authored paragraph/heading/list/table structure and raw
Markdown label; `chat-render-react` alone classifies and sanitizes the target;
the Web renderer projects an allowed HTTP(S) target as a Codex-style inline
mention with origin favicon, globe fallback, URL tooltip and Radix context
actions. It never demotes a heading merely because its child is a link.
Restricted or unsafe targets receive no href, favicon request or open action.

During streaming, a changed URL remains inert for 500ms before it receives an
href or begins remote favicon loading, and the prior href cannot remain active.
Opening is a semantic `ChatResourceOpenIntent` (`target`, `disposition`,
`source`): the Renderer reports ordinary, modifier/middle-click and context-menu
intent while the Workbench Browser owner chooses the physical in-app or external
surface. Copying uses the sanitized target. Favicon pixels, tooltip state and
menu focus are presentation state only and never enter Timeline, Replica or
history. `smoke:url-presentation` verifies the real renderer, heading
preservation, fallback favicon, tooltip, menu, clipboard and delayed streaming
activation in Chromium.

React Native consumes the same list and resource decisions. Ordered Markdown
lists retain their authored start number; task items use checkbox markers.
Both renderers resolve links, workspace references, citations and images through
the same priority-ordered resource policy service. Their standard URL policy
is registered as a fallback, so Host restrictions and rewrites apply before
either platform performs an open or media load. Image-only data URLs remain a
local media exception and do not become navigable links.
On Native, a Host resource denial is final: a denied HTTP(S) link cannot fall
through to the system browser. The system URL opener is only a fallback when no
Host opener owns the action and the resource policy allows the target.
Nested unordered lists use the Web marker progression (disc, circle, square)
and nested spacing; user-message lists keep their compact Composer rhythm.
Tables keep the authored rows and column alignment on both surfaces. Web uses
its dialog to expand a wide table; Native uses a full-screen preview with its
own horizontal and vertical scrolling, sized from the actual container so the
same content works on a phone or tablet. Both keep the original Markdown copy
source available from the inline table.
Web table content uses an intrinsic, non-shrinking width inside its own native
horizontal scrollport. Bounded cells wrap long content without contributing
arbitrary single-character breaks to intrinsic sizing; short tables still fit
their container. Phones, tablet split views and desktop share this rule, based
on available container space rather than device detection. Native touch panning,
trackpad/wheel scrolling and scrollbar dragging retain browser text selection,
link activation and vertical timeline scrolling. Appending rows keeps the same
table and scrollport; no JavaScript pan controller or document-wide overflow is
introduced. `scripts/smoke-markdown-table-scroll.ts` verifies the real renderer.
Wide blocks use Codex-style automatic expansion beyond the prose column, bounded
by the current reading surface rather than window width. The timeline supplies
`--chat-wide-content-available-width` and `--wide-block-panel-max-width`; its
viewport already excludes docked panels and accounts for content shift. Tables
and Mermaid consume the same wide-content budget. Without a layout owner, they
remain within the local column. Compact latest-turn previews own a separate
container and cap expansion at their own content width. Narrow conversations use
the same rule, without viewport-media negative margins that can hide table edges.
Supported CSS anchor positioning keeps each table toolbar inside its actual
visible table edge; other browsers retain the container-edge fallback.
`smoke-markdown-wide-layout.ts` checks bounds, expansion, local scrolling and
identity while the available conversation width changes.

Complete Web Mermaid fences lazily load Mermaid and its registered ELK layout
provider together. The default uses ELK, classic/base rendering, the shared UI
font and semantic surface/text/border tokens; it does not add neo node shadows.
Rendering stays strict, serialized and cancellable. After attachment, the
renderer checks actual SVG bounds against its serialized viewBox and repairs a
viewport that excludes graphics before sizing the outer shell. Shell measurement
rounds upward and includes its border. Accessibility-only source is hidden by
renderer-owned CSS rather than requiring the embedding host to supply a utility.
A reserved header keeps preview/copy actions clear of diagram content; touch
controls remain visible with 44px targets. Existing source fallback, stable
loading geometry and reading-surface width limits remain authoritative.
`scripts/smoke-mermaid-display.ts` checks full SVG bounds, hidden source, toolbar
separation, resizing, source replacement and preview on real WebChatDocument.

Bounds checks measure the actual scrollport, initial resource link and table
actions against the reading surface, and verify the final column is reachable.
Document scroll width alone cannot prove this: a clipped ancestor can hide an
incorrectly positioned scrollport without widening the page.
The labelled scroll region is focusable for keyboard horizontal navigation and
uses the existing neutral keyboard-only focus indicator; touch retains native
selection and does not paint a persistent focus frame.
Native task items use the same compact, read-only checkbox geometry as Web;
ordered markers reserve one shared column width across digit boundaries.
The shared renderer call also carries neighboring node kinds so Native can
apply the Web user-message paragraph rhythm without adding a trailing gap.
It also carries the next document node: Web and Native use one Han-text test
to tighten adjacent root paragraphs, while first/last heading and divider
margins follow the same document-edge rules.
Native Markdown images retain their intrinsic ratio within the current
container and use a document-scoped native preview for adjacent images in
source order. Its modal exists only while previewing; no browser page or
conversation route is created.
Native links stay inside the surrounding text flow and share the 500ms
streaming URL settle rule. The native shell can open HTTP(S), mail and contact
links directly; workspace files, app routes and other resources require an
explicit Host opener and are otherwise inert. Native images accept HTTP(S) and
image data sources directly. File and resource images require the Host media
loader; when unavailable or blocked, the renderer shows the alt text instead
of attempting to load a device-local path. Physical scroll, keyboard and
viewport geometry remain the Native viewport owner's responsibility. It receives
touch-down before `ScrollView` recognizes a drag, cancelling auto-scroll and
pending layout restoration as the Web owner does on pointer-down. Only a
recognized drag changes the origin of physical scroll events to user input.

The Expo Workbench now supplies a Host opener for resolved workspace files and
external URLs. It passes the active Thread's cwd and Host identity to ChatUI,
reads file bytes through `fs/readFile`, and displays bounded UTF-8 text in a
native resource surface. It never sends a Host `file://` target to the phone's
URL handler. The Host advertises which allowed policy decisions it can open;
app routes, unsupported resource schemes, unresolved relative files, binary
files and oversized text remain unavailable until an owning surface exists.
Changing Thread or Host closes the preview and aborts its read. These resource
capabilities are independent of the renderer's URL policy and must not be
inferred from whether a URL merely parses.
The same active Host supplies raster Markdown images through `fs/readFile`,
with a shared Web/Native MIME hint and a Native 10 MiB byte bound. Only PNG,
JPEG, GIF and WebP receive a Native data source; SVG and unknown formats stay
unavailable rather than being treated as device-local files. The renderer
aborts stale reads and drops its source when its document unmounts. The Expo
loader merges concurrent reads for one Host path, retains a 10-second,
24-MiB-weighted in-memory cache, and discards it when the Host connection
generation changes. The last departing consumer aborts an unfinished read;
the cache does not authorize file access or extend a session's lifetime.
Web and Native image presentation keys include Host, conversation, cwd and
document identity as well as the resolved target. A context switch cannot
reuse the previous image's loading result or keep its gallery open while the
new Host media request settles. This applies to Markdown images, user
attachments, generated images and tool image results.
User-message image attachments, generated images and image-view tool results
consume the same conversation-media decision and Host loader. A Host file path
is never rewritten to a phone-local `file://` URI; direct HTTP(S) and image
data remain direct sources. Native preview opens the resolved image source in
the conversation's gallery when no product-specific preview owner is supplied.

Web and Native derive file citation labels/targets and workspace mention
targets from one renderer-neutral model. Native presents workspace mentions
as inline code and file citations with a separate citation tone; it makes
either actionable only when the host supplies resource navigation. External
Native links use system long-press actions; a delayed action must still match
the current settled URL before it opens or copies anything.
Image-bearing Native paragraphs keep prose in selectable text runs and place
images in block containers so the text engine cannot collapse their layout to
an inline placeholder. In the iOS drawer host, code/table/math surfaces retain
a horizontal stroke only while their measured content exceeds the viewport;
short content leaves the stroke to the drawer. Before measurement completes,
the local scroller retains the stroke so wide content is not stranded.
Native user bubbles compile with the same `user-message` dialect as Web,
including Composer link and adjacent-list rules; assistant output continues
to use the assistant dialect.
Native list-item paragraphs and quoted paragraphs follow Web's child spacing:
the list or following block owns its own gap, and quoted paragraphs have no
extra margins. At the document level, heading and rule leading margins account
for the previous block's trailing margin because RN adds margins where CSS
collapses them. User-message paragraphs and lists have no trailing margin, so
their following heading or rule keeps its full leading space.

Code fence language labels, wrap policy and wrap preference come from the same
renderer-neutral model on Web and Native. Native keeps horizontal overflow
inside the code surface and offers code copying. Native tables retain Markdown
column alignment and one width per column across every row; columns fill their
actual container until the minimum readable width requires local horizontal
scrolling. Both platforms copy the table's canonical Markdown source, while
their preview controls remain platform-specific.
Unspecified table-cell alignment and prose/heading writing direction are
natural rather than forced LTR, matching Web's `dir="auto"` intent; explicit
Markdown column alignment remains authoritative.

Web and Native code fences now consume one Shiki grammar registry and Codex
syntax theme. Web turns that result into HTML; Native projects its token colors
and font emphasis into selectable `Text`, preserving exactly the original code
string, wrap mode and horizontal scroll geometry. Native delays enhancement
until a complete fence is present and caps tokenization at 12,000 characters;
larger or still-streaming fences remain plain text. Highlighting is presentation
only and never changes the copied code or Timeline content.

Complete Mermaid fences share Web's source preparation rule. Native reads a
bundled, offline renderer only when a diagram is present and runs it inside a
network-disabled WebView document; this is a document renderer, not a page
navigation or a second Bot runtime. The transcript keeps a bounded preview
slot, and a native full-screen viewer owns panning and source inspection.
Invalid, oversized, streaming or failed diagrams stay readable as source code.
The HTML asset and Mermaid library are packaged with the app; the document
cannot fetch scripts, fonts, images or data from the network. Each visible
diagram currently owns its own WebView, so long conversations with many
diagrams require device memory and scroll testing before calling it equivalent
to Web. Display math uses a separate packaged, network-disabled KaTeX document
with embedded fonts and the same `renderToString` safety options as Web. Its
horizontal overflow belongs to the formula surface and its measured height is
bounded in the transcript. Inline math remains in Native `Text` as readable
source because RN text cannot host the DOM typesetter without breaking inline
flow and selection; a true inline equivalent remains open work.

Open pickers subscribe to catalog invalidation. Host/root/revision query keys
prevent pre-change RPC completions from entering the new directory. Browsing
does not silently truncate at 50 entries. Search normalizes path separators and
Unicode compatibility forms and requires every query word to match a name,
display name or path. Icons accept explicit HTTPS or raster data URLs, never a
remote filesystem path interpreted as a renderer-local file; text and icon
fallbacks remain usable. Skill status/scope text uses the shared i18n port.

The Local DSH adapter validates explicit name/path against the executing Agent's
registry and user-invocation permission through the private capability bridge,
then lowers each reference to DSH's native `/name` user gesture. The installed
`dsh-tool-skill` pre-step hook loads and injects the full instructions. Missing
loader, unavailable Skill and changed path fail closed; `turn/start`, steer and
queue paths share this lowering. This uses native Skill semantics rather than
asking a model to infer instructions from labels. Native gesture history remains
owned by DSH. Tests execute the installed native pre-step handler without a
provider request; no live inference outcome is implied.

Profile-scoped Hermes Hosts implement `skills/list` using `/api/skills` plus
bounded-concurrency `/api/skills/content` reads for authoritative paths. Content
bodies are not returned in the directory. An unscoped instance Host requires
Profile selection instead of guessing a default. Submit/steer revalidate selected
Skill enablement and path in the owning Profile before invoking Hermes' existing
slash Skill behavior. Profile management change events invalidate Composer
catalogs; old dashboards that omit canonical paths report metadata errors.

DSH terminal adaptation follows the HyperNode reference contract: completion,
interruption and failure notifications are lifecycle summaries (`itemsView:
"summary"`), never empty full Item snapshots. Full membership belongs to
history reconstruction. Visible reasoning, assistant and tool Items settle
before the Turn; only explicit completed output receives final-answer phase.
Like Codex, `final_answer` is an optional Item rather than a prerequisite for a
completed Turn. A Turn with settled commentary or tool activity may complete
without fabricating an answer; a completely empty completed Turn still fails
closed as a provider/runtime contract violation.
Aborted/interrupted runs retain partial output with final-answer phase, blocked/max-token/unknown
terminal reasons fail closed, and failures emit a typed error before completion.
The same terminal policy is consumed by live and history projection.

DSH steering has three distinct ownership states. `queued` remains an editable
next-turn occurrence, `steering` is Host-accepted user input waiting for the
active Turn's next step boundary, and the matching durable `user/message` owns
the transcript after AgentLoop claims it. The Local Host returns a steer command
when the unary DSH RPC accepts it; it must not wait for a later `session/queue`
snapshot or claim event. Conversation Runtime moves a strict queued steer into
the active Turn immediately, then reconciles the optional authoritative
`steering` projection by client-message identity so reconnect and durable handoff
produce neither a blank interval nor a duplicate row. This does not redefine
steer as a hard interrupt: the current provider request and tool step remain
owned by DSH and may finish before the next-step inbox is consumed.

The standalone main conversation defaults fresh follow-up input to queueing during
an active response. Chat settings can persist `steer` instead through
`UiPreferencesRuntime` (`chat.defaultFollowUpAction`, installation scope). The
the downstream product embedded conversation defaults to `queue` while a response is active,
independent of the standalone preference.
Ctrl/Cmd+Enter temporarily chooses the opposite action; idle input still starts
a normal response. Content always takes precedence, including attachment-only,
processing-asset and provisional-text drafts. Only when an ordinary draft is
empty and the admitted mode is `queue`, Ctrl/Cmd+Enter invokes the visible queue
head's existing Steer (or idle Send) operation. It never skips a blocked head,
edits or clears a different draft, or bypasses atomic-steer capability, Host
readiness, restart reconciliation or unconfirmed-delivery restrictions. Queue
editing and dictation keep their existing submission path. Autorepeat is ignored;
buttons and the shortcut share one in-flight queue-steer guard owned by the
physical Conversation View. A preference change does not replace the Composer document,
editor or selections, and submission rechecks the actual active Turn. Side Chat
retains direct steering because it does not own a durable next-turn queue.

Workbench queue wiring is exercised by `scripts/smoke-ssh-codex-workbench.ts`
against an isolated headless Web build (`OPENCRAFT_SSH_UI_WEB_ROOT`). With
`OPENCRAFT_SSH_UI_ACTIVE_FIXTURE=true` and
`OPENCRAFT_WORKBENCH_QUEUE_FIXTURE=v1` or `v2`, its synthetic OpenCraft Host
drives the actual settings, Host client, runtime and Composer. It holds queue
admission to check that pending input cannot be deleted, restores accepted
input after reload, and verifies legacy Steer gating versus a single V2
command bound to the queued ID and active Turn. This replaces source matching
of the Workbench capability/projection props; component SSR accessibility and
engine durability tests remain separate. Without the queue mode, the same
entry verifies native SSH admission restrictions. It uses the current Work in
machine picker and explicitly reports missing Project API support rather than
returning malformed success data. These fixtures do not certify a commercial
backend or embedded preference policy.

The real embedded preference policy is covered by
`npm run smoke:product-isolation --prefix products/<product> -- --embedded-only` (from the downstream product workspace), using the isolated
the downstream product Web and Embedded Workbench builds. It saves immediate follow-up through
real the downstream product settings on the same origin/product, holds completion after real
first-Turn admission, and checks that embedded still offers Queue. The same
fixture retains multi-Profile draft/focus, reconnect, hidden lease and account
replacement coverage across light/dark and DPR 1/2. The external account, enterprise service
tunnel and Hermes service are synthetic. This focused mode explicitly does not
certify the separate standalone visual oracle; `OPENCRAFT_EMBEDDED_WEB_ROOT` and
`OPENCRAFT_PRODUCT_ISOLATION_OUTPUT` allow separate negative artifacts.

Queued-message steering is gated by the Host's
`opencraft/thread-queue: { version: 2, atomicSteer: true }` declaration. DSH
provides the one native `session.updateQueue(steer)` operation. Stock Codex
AppServer 0.156.1 has `turn/steer` for fresh input and `thread/queue/start` for
an idle Thread, but no `thread/queue/steer`; its queue also auto-dispatches at
idle. Therefore a Codex queued message cannot safely be converted to an active
steer by composing `turn/steer` and `thread/queue/delete` in the Client or Host.
The Codex Host now owns queued input in its own durable SQLite store. It claims
one item before sending the standard `turn/steer` to Codex, and reconciles by
client-message ID against paged Codex user-message history. A crash or timeout
with no conclusive acknowledgement leaves the claim delivery-unconfirmed,
outside automatic dispatch; the Host never silently resends it. The user may
explicitly discard an unresolved claim after reviewing the transcript. The
Host delete request requires the original queue ID, target Turn ID and an
acknowledgement flag, checks history and rejects while the Thread is active.
For Codex queued steering, a matching `turn/steer` acknowledgement is the
admission boundary: the Host persists `steering` before releasing the per-Thread
dispatch operation, so a later queued steer need not wait for the first input
to appear in Codex history. Accepted `steering` rows remain visible for history
reconciliation but do not occupy the dispatch head. Only `dispatching` or
delivery-`unknown` rows block later admission; an unknown claim is reconciled
by client-message identity and is never retried automatically. The Composer
disables later Send/Steer and reorder while such a claim is unresolved, and
must not offer a generic Resume action behind it. Editing and removing ordinary
queued rows remain available.
Queued-message action hints use a hover/focus tooltip mounted in the Workbench
presentation root, outside the scroll-clipped queue tray. The tooltip remains
hoverable and text-selectable; native `title` is not used for these actions.
This does not prove Codex never saw the input. `unconfirmedSteerDiscard` remains
a separate Host capability; DSH's `atomicSteer` does not imply it. A failed
history read also rejects discard. Ordinary direct steering and idle queue Send
remain separate. At upgrade, native Codex queue rows migrate before AppServer
starts so two independent dispatchers never own the same item.
After a DSH Host restart, a durable local queue row without a matching native
queue snapshot is marked `restored-after-host-restart`; that item cannot be
started or steered until native reconciliation confirms its identity. The Host
enforces this even if a client bypasses the disabled UI action.

Attachment staging is a Host resource, not a Renderer filesystem convention.
The `opencraft/attachment-staging` capability declares accepted source kinds,
returned location kinds and the byte limit; Composer consumes only the shared
`pending/processing/ready/failed` lifecycle and an opaque `AttachmentRef`.
The local and SSH Host ordinary-file allowance is 1024 MiB (shown as 1024 MB).
The optional `chunkBytes` capability negotiates `attachment/uploadChunk` and
`attachment/uploadCancel`; older Hosts retain their advertised limits and the
32 MiB one-shot path. Images keep their separate 20 MiB inline allowance.
Web/Electron reads File slices; native opens a read-only FileHandle. Both use
one shared upload loop, send at most 1 MiB decoded bytes per RPC and await each
acknowledgement before reading more. Neither builds whole-file Base64 for this path.
The Host checks metadata and exact offsets, writes each chunk to a private disk
spool and computes SHA-256 incrementally. A ref is returned only after all declared
bytes are committed. Each upload store allows eight active uploads; partial
spools expire after ten idle minutes or are removed on cancellation, failure and
normal Host shutdown. This is not a persistent resumable-upload protocol; a client
losing the final reply must treat the outcome as unknown. The last acknowledgement
is awaited even if the Draft cancels, so its ref can be released by the existing
attachment-session owner. A process crash can leave a private spool; startup
recovery of those abandoned spools is not implemented.
Hermes Hosts with enterprise-service terminal commit port also advertise 1024 MiB and the
same chunk RPCs. This includes the embedded Workbench, which mounts the regular
App and its attachment resolver. The Hermes adapter uploads each 1 MiB part through
the existing authenticated Dashboard file endpoint; enterprise service transports the bounded HTTP
request using its BSON frame splitting. No 1 GiB Base64 request is built. Once all
parts are acknowledged, an isolated enterprise-service terminal command runs Python on the remote
Host: it verifies offsets, part hashes and total size, streams assembly and SHA-256,
then publishes content and the history manifest/index under an exclusive attachment
lock. Existing identities must match content and metadata. Parts are removed after
commit, cancel, error or normal bridge shutdown; inactive uploads expire in ten
minutes while their owner remains alive. Browser/process crashes or network failures
can leave remote parts requiring later cleanup; no persistent resume is claimed.
Final remote assembly has a two-minute budget; its lost acknowledgement is an unknown
outcome and must use the same attachment identity on retry. Legacy Hermes adapters
without the terminal port retain 32 MiB; one-shot staging remains limited to 32 MiB.
The shared file limit does not enlarge image limits or the separate inline Bot API.
Validation: `tests/hermes-large-attachment.test.ts`,
`scripts/smoke-hermes-large-attachment.ts`, `scripts/smoke-embedded-attachment.ts`.
The browser smoke uses a local enterprise-service protocol peer and HTTP endpoint and runs the
remote Python locally; it does not certify a real cloud instance. The Composer
smoke exercises the production component and shared resolver, not full Application boot.

The AppHost WebSocket message cap remains 48 MiB, accommodating legacy one-shot
requests; chunked files do not require a larger WebSocket limit. The Local Host
commits under its owned data root, never a Renderer-derived `codexHome` directory.
SSH chunked uploads spool on the Hub and transfer via backend SFTP. Legacy
one-shot bodies up to 10 MiB use native `fs/writeFile`; larger one-shot bodies
through 32 MiB use SFTP as before. Chunk uploads never forward the large file as
one native remote RPC. Large SSH upload/verification transfers have a 30-minute
budget each; the final upload-chunk request allows one hour for their completion.
The remote root comes from native `initialize.codexHome` and
is isolated by stable Server/endpoint namespace, never by a browser or connection
generation. A private partial file is committed by SFTP rename and verified
against the submitted size and SHA-256 before `ready` is returned. Small-file
verification uses native RPC; large-file verification downloads through SFTP and hashes the local spool as a stream,
so an expanded large Base64 payload never enters the remote RPC channel.
Saved passwords use the existing private askpass IPC plus a fixed private SSH
wrapper that overrides SFTP batch-mode authentication; keys/agents retain normal
batch authentication. All transfers retain the binding's strict host-key trust.
The Hub persists only lifecycle/display metadata in private Server storage;
temporary upload and verification spools are removed after each operation.
An unknown upload outcome keeps an `uploading` intent for identical-ID retry;
metadata/content conflicts cannot overwrite the resource. Failed removals keep
`pending-removal` for retry, and sent refs cannot be removed from history.
Remote send/steer verifies owned refs and adds the same model-visible locator;
display metadata survives reopening and follows native forks. Queue, Goal,
desktop and other Local-only capabilities remain absent on SSH Hosts.
Cloud object-store adapters remain unsupported until their Host advertises them.
Failed or unresolved
attachments block submission and retain their precise error; removing an
unsubmitted ready attachment asks its owning Host to release the staged ref.
The local Codex Host uses the same staging service beneath its own data root,
intercepts `attachment/stage` and `attachment/remove` before forwarding to the
stock Codex AppServer, and advertises the capability only with that handler.
An ordinary staged file compiles to Codex's native `mention` path. That item
preserves attachment identity in Codex history, but Codex does not include it
in model-facing text. At direct or queued Turn dispatch, the Codex Host verifies
that each mention still belongs to its staging service, then adds a model-visible
text locator beside the mention. Its UI-only text-element marker explicitly
identifies the following `mention` as a staged file; the shared projector
renders a file card without exposing the Host path or duplicating an `@` chip.
Ordinary mentions remain context chips. The first preview's exact generated
locator with an empty placeholder is recognized for history compatibility,
but arbitrary paths or filenames are never inferred to be attachments.
The queue retains the original input; validation and
augmentation happen before claiming delivery, so a removed file cannot become
an uncertain claim. A ready file alone is valid input. A browser-selected file is not ready merely because its
name and byte count are visible. The Composer retains the original `File` for
retry within its Draft owner, shows ordinary-file preparation/failure in the
card itself, and does not expose raw Host errors in the primary UI. An ambiguous
response after disconnect is retried under the same attachment ID instead of
blindly deleting a potentially accepted resource.
Durable history treats `AttachmentLocation` as opaque resource identity. The
owning staging service persists a location-keyed metadata index and implements
an `AttachmentMetadataResolver` that restores the authoritative `AttachmentRef`
display name during hydration. Transcript projection never parses a Host path
or storage directory; history without indexed metadata degrades to a generic
basename without exposing the full location. The Hermes storage adapter can
also lazily backfill a missing index from its own pre-existing owned manifest;
that compatibility remains behind the resolver rather than leaking its layout
into the transcript model.

The source implementations live in `apps/local-agent-host/src/hypernode/`:
TurnManager, DSH tool projection and the engine event/terminal core.
`dsh-execution-record.ts` supplies local clock, replay-stable unique Item
allocation, notification and synchronous pacing ports. One ordered ledger is
used for live snapshots and native history replay, including active reasoning.
The local HTTP/mux transport, product-owned models and credentials remain host
ports; HyperNode SSH tenancy and per-workspace process launch are not local
execution policy. See [migration contract](../design/dsh-engine-migration.md).

1. A conversation is identified by `(hostId, threadId)`. A bare `threadId` is
   not a cross-host identity.
2. React components never import a WebSocket, JSON-RPC client, Electron bridge,
   Session View store or Replica Journal entry.
3. `appserver-session` may translate Codex V3 Resume/history into the common
   reader contract. Its local View revisions are snapshot continuity hints,
   not a server-sequenced V4 Journal.
4. A Transcript, Timeline Frame and Timeline Block are disposable projections.
   They never become a second persistence authority.
5. ProseMirror and Native editor documents are adapters. Persisted drafts use
   `ComposerDocument` from `@opencraft/composer-core`.
6. Submission freezes an immutable `SubmitIntent`; no UI calls
   `send(blocks): boolean` in the final architecture.
7. Unknown AppServer Item types render an explicit fallback Block. Protocol
   growth must not blank the conversation surface.
8. Visible restore authority and execution capability readiness are separate.
   `thread/resume` plus the initial history window may promote the Conversation
   immediately; connector or dynamic-tool registration prewarms independently
   and must never prolong the full-page restoring state. Every mutation that
   can execute Agent work still awaits the binding's generation-scoped
   capability lease, and a failed prewarm is retried there rather than
   invalidating already-restored history.

### Initial history and display reuse

Durable paginated providers that explicitly advertise initial-page support may
return the newest five full Turns in Resume. The Session consumes that page once;
it does not issue another Turn/Item read for the same initial window. Providers without this advertisement keep bounded per-Turn Item reads:
a single large native full-Turn response can regress low-latency restoration. Headers-only replies
retain the existing per-Turn Item reader, and transport frame-limit errors fall
back to that reader's adaptive Item pages. An oversized merged Resume retries
without the page before using this reader. Legacy providers keep full-history
compatibility. Full pages retain all Items, older cursors and chronological order;
no tool output or interaction is truncated to improve timing.

ConversationDisplayContinuity keeps at most 64 already-projected text displays
in its existing account/Host/Thread scope. `peek` exposes a synchronous paint-only
snapshot, including before an asynchronous persistence write finishes. Web and
Native consult it during render before starting disk restoration. The same
seven-day age and 24-message/text limits apply; disk loads keep the original
expiry time, authoritative empty history removes a display, and a delayed disk
read cannot replace a newer observation. Account scope replacement discards the
owner. This memory is a projection cache, not a second history authority, Replica
checkpoint, execution lease, or source for tool/approval actions.

The Web Application resolves display identity from its committed View Scope
binding before a network Thread lease exists, and renders a nonempty display
while the initial lease is still being acquired. Display identity remains
separate from the active execution lease. The cold-stage spinner is reserved for a missing lease
and no visible history; it must not hide a valid account-scoped display behind
Host initialization. Persisted display restoration after a page reload follows
the same rule as the transient first-submission handoff. Canonical history still
replaces the display, and command admission still waits on the existing baseline.
`scripts/smoke-session-cold-open.ts` exercises the built Application with held
initialization, canonical replacement and a separate uncached browser profile.

### History positions and concurrent observations

Execution ownership and transcript grouping are different boundaries. One
AppServer Turn may contain an asynchronous question, its user reply, multiple
answers and steering inputs. `chat-core` projects one ordered presentation
surface: only the contiguous initial user frames are an intro; later user and
interaction frames stay at their original positions. Adjacent activity forms
independent disclosure segments, ended by visible input, question, response or
interaction boundaries. Web and Native consume this plan without collecting
all answers first or appending earlier activity after later messages.

Asynchronous delivery is retained even when structured questions are absent;
neither its native `final_answer` phase nor its text gives it final-answer
eligibility. Displayability, disclosure closure and execution completion are
separate predicates. Stable rows/segments use source identity and boundary
anchors, not status, array indices or inferred timestamps. Collapsing a segment
never moves steering or other responses across that boundary. The Turn parent
arbitrates at most one live Thinking owner from the current response suffix;
closed earlier segments cannot inherit a later response's running state.
Only one segment presents the Turn's work interval/total-duration fallback,
and response-copy actions exclude questions and earlier inputs' answers.
Tests cover async-final questions, multiple answers and follow-ups, in-place
streaming, phase/completion changes, disclosure, history prepend and refresh.

The virtualizer separately owns the mounted window: when history inserts rows
inside that window, the intermediate render retains both the previous slots
anchored by a surviving row and every surviving mounted identity. Count alone
can evict the old last row during insertion; surviving keys alone can evict a
replaced edge when an optimistic Turn acquires its authoritative ID. The stable
client-message subtree and its measured height must survive that handoff;
changing a protocol locator cannot fabricate content growth or reset known
geometry to an estimate. The committed viewport is
reconciled for layout changes, including same-count identity changes and height
transactions, without requiring a platform scroll event. Persisted restoration
by anchor/count remains a different operation; neither rule sorts the transcript
or takes over response following.

In the Codex V3 compatibility reader, an established Turn/Item slot is not
derived from status, update time, or opaque ID. Live updates merge by identity
without moving that slot. Ordered history owns topology only within its fetched
window; a navigation locator index is a placement hint for one unloaded Turn,
not permission to globally sort the loaded conversation or move unindexed rows
behind the live tail. Session owns both policies; Workbench commits its result
without implementing a second ordering rule.

Background history and navigation reads capture their immutable pre-request
Turn baseline. On commit, Items and lifecycle fields observed since that
baseline take precedence over the delayed snapshot. Missing concurrent rows
retain their existing neighbour; unchanged covered membership may still be
replaced by full history. Resume continues to commit its ordered snapshot before
releasing buffered notifications. Baselines belong to that read and connection
generation, not to durable transcript storage. V3 supplies no comparable server
revision per Item: this protects observed updates, not a claim of server-wide
causal sequencing or a V4 Journal. Dot and task-chat renderers may differ while
consuming this same identity-versus-position distinction.

### Hermes message windows and Bot history continuity

Hermes REST pagination owns source-row offsets, not rendered Turn or Bot-message
counts. Each read adds one 120-row page to the scoped chronological window;
the bridge returns that complete loaded projection. AppServer `limit` must not
slice it again. A tail refresh grafts at a durable row anchor, accounts for the
preserved prefix in its next offset, and does not reopen a known exhausted edge.
Partial Turn regrouping can change execution/causal associations while retaining
message IDs. Bot backfill therefore refreshes covered durable message metadata,
rather than keeping stale associations merely because those IDs already exist.

The Bot Source keeps durable history separate from local/live overlays. Resync
may preserve an older prefix only within the same conversation incarnation and
with a shared durable anchor; descriptor, execution and interaction authority
always comes from the new read. A new cursor is opaque and cannot be calculated
from visible message count. Delayed older reads are generation-scoped and cannot
commit after resync, deletion or disposal. Old-epoch remote events are discarded;
unadopted local submissions retain their independent client-message ownership.
Once a durable row confirms that client-message identity, it adopts the local
overlay, whether obtained by refresh or backfill. A delayed send failure or
receipt then settles from the confirmed receipt; it cannot restore a failed
optimistic row or regress completed execution. Concurrent reuse of an in-flight
client-message identity does not issue another request.

An empty display projection is not proof of empty source history. Completed
tool-only rows can legitimately produce no Bot-chat units. The viewport requests
at most three older pages per recovery intent, one page at a time, without
requiring a physical top-scroll gesture. Remaining history or a failed read
offers an explicit load/retry action in the existing status slot; unchanged or
cyclic cursors stop automatic traversal. This is bounded display demand, not
eager draining, transcript persistence, or execution readiness.

### Activity closure and disclosure authority

`AgentActivitySegmentEnd` records why a contiguous slice ended (`user-input`,
`content`, `reasoning`, `final-answer`, `turn-terminal`, or still `open`). This is chronology
and live-header ownership, not permission to hide content. Ordinary task
disclosure is eligible only for the nearest meaningful work slice reaching its
own displayable, non-async final answer. Readable reasoning may separate physical
work slices, but cannot multiply that response's outer fold owners. Earlier
slices retain their ordinary tool summaries and their tools' independent choices.
A Steer, hook, question, approval, image, unphased text,
terminal Turn, or a final answer in an earlier response cannot grant eligibility.
No phase is inferred to make a disclosure work. Earlier completed commentary
therefore stays visible when the user follows up, rather than becoming a stack
of default-collapsed historical-message headings. Cancelled work stays visible.

Eligibility, automatic default, explicit View choice and temporary expansion
constraints are independent. `resolveAgentActivityDisclosure` is the shared
pure policy; `resolveAgentActivityLayout` applies `forceExpanded`/`disableCollapse`
before selecting partition regions. A no-toggle surface must not expose only
the collapsible subset or duplicate persistent items. Displayable non-async
final answers are persistent even if supplied to the inner partition, although
the ordinary ordered plan renders them in separate source-owned slots.

Only user actions write collapse choice. Defaults and constraints never write
it back; old saved choices cannot manufacture eligibility. Web's existing
View restore receipt and Native's component choice remain their presentation
owners, not Thread storage or an execution preference. Stable segment/Item
keys, the single Turn clock/Thinking owner and viewport reflow leases are
unchanged. No new scroll writer, timeout, renderer sorting or remount is added.

The ordinary task policy applies to ordered multi-response slices. Input
boundaries do not grant fold eligibility. The distinct Bot chat renderer and
viewport retain their own presentation contract. The explicit eligibility and
preference tables in `chat-activity-disclosure` cover all 96 ordinary-task state
combinations; `scripts/smoke-activity-disclosure.ts` covers the input sequences
and real Conversation. Deployment and native-device acceptance remain separate.

### Embedded submission and recovery

Embedded workbench templates enter through `submitPrompt(requestId, text)`, not
through a legacy SDK sender or a DOM button. The embedded element deduplicates
admitted request IDs in its Bot lifetime. The App admits only into an empty,
editing new-Thread Composer belonging to the embedded Host after protocol
readiness; an existing Thread first navigates to a new Draft. An occupied Draft
is never overwritten. The site retains the pending template across cold startup,
failed admission and inactive routes, and removes only the matching record when
the Conversation owner accepts the immutable first Turn. Remote failure then
belongs to that Conversation's retry UI, never an automatic duplicate send.

A manual transport failure is a Host-attempt disposition: initialization cleanup
must not erase its code when disposing the physical transport/client. Workbench
snapshots retain the block through cleanup and clear it on an explicit new
connection attempt or a connecting/open successor. Recovery presentation must
not claim automatic retries when the Host is stopped for manual intervention.
An `APP_HOST_PROTOCOL_MISMATCH` disposition presents a localized update/reload
instruction in the existing cold-error or retained-history notice slot. It does
not show a reconnect spinner or offer the same-client retry button, and never
reloads the page automatically. The retained Timeline and Composer keep their
identity and drafts; protocol numbers and raw server errors stay out of the UI.

The Web recovery presentation does not equate non-authoritative with invisible.
When a Thread already has painted Timeline frames, reconnect and retry preserve
those frames, their scroll position and Composer draft; a small local connection
notice shows reconnecting or failure copy, while background synchronization uses
the shared neutral loading ring with a screen-reader-only localized status name
and no badge surface. Commands remain disabled until
authority returns. Only a Thread without visible frames gets a centered neutral
loading ring in the Timeline's empty slot (delayed 200 ms to avoid fast-load
flashes). It has no visible copy; the localized status name is screen-reader
only. The shared Web spinner owns its glyph and theme-aware, reduced-motion
presentation, not Thread authority, timeouts, focus or scroll writes. Startup
uses the same passive primitive. A definite restore failure replaces that slot with
an inline retry action. Neither state mounts an opaque page overlay or changes
the Conversation View identity.

Host protocol readiness is independent of each Thread's restore outcome. After a
new logical connection initializes, resident Threads restore independently with
retained Views prioritized and bounded concurrency. Missing Threads expose their
own error; transient transport/time-limit failures retry in the Thread owner.
Neither a failed Thread nor a slow terminal/file-watch restore keeps healthy
conversations behind the Host reconnect phase. Commands still require their own
Thread authority and execution capability lease. Composer catalog queries remain
Host-owned reads: reconnect revalidates them without requiring a menu remount,
preserves previous choices/data, and presents refresh failure as an error rather
than inferring that the Host does not support the capability.

Host execution preparation is coordinated by the existing Thread lifecycle
queue. Capability replacement and Turn admission share that queue; connection
revocation is synchronous and invalidates pending commits before asynchronous
engine cleanup. Renderer declaration acceptance (including cold deferral) does
not assert that engine tools are mounted. The Host checks exact mounting before
execution. Interrupt, approval replies and queue removal do not wait for tools.

For new local DSH Agents, initial capability mounting runs inside native Agent
setup alongside the preset, with an independently revocable capability scope.
The product catalog and `thread/started` commit only after preparation succeeds.
Setup failure rolls back its unpublished native resources. An attachment failure
after native persistence releases the new idle runtime but never deletes durable
history; response-loss idempotency is a separate delivery concern.

Engine release and mounting use the same session queue. Bridge responses expose
allowlisted error codes instead of arbitrary provider or filesystem exception
text. No warm reservation or speculative Thread identity is required for these
correctness guarantees.

## Package ownership

Sidebar 会话行只拥有选中/导航命中区；右键菜单触发区只覆盖行本体，触控常显的
“…”按钮是它的兄弟节点，独立拥有下拉菜单触发。两种呈现复用同一份按 Host/Thread
能力生成的操作项；Sidebar 是唯一的菜单打开状态 owner，用 Host/Thread/入口
标识当前菜单，切换行或入口时同步关闭旧菜单，迟到的关闭回调只能关闭自己的
标识。菜单触发区不互相嵌套；菜单项选择之后，由行级操作或
独立 Modal 接管，不能让下拉菜单的 Portal 触摸事件回流成行本体长按。浮动与
固定侧栏仍使用同一个 Sidebar 内容 owner，切换呈现不另建会话菜单状态。

Conversation 的活动折叠将点击语义与标题呈现分开。`OverlayDisclosureTrigger`
提供稳定的原生覆盖按钮、可见标题的 accessible name 关联及非交互内容层；
`Worked for`、普通 Activity 与 Activity Group 都消费它。按钮只把一次原生
`click` 交给调用方，不从 `pointerup` 合成第二次提交；展开状态、折叠偏好、
正文挂载和动画继续由各活动组件拥有。没有可展开正文的标题不暴露空按钮。
这是一套 Web/Electron 共用的 DOM 控件结构，而非触控设备专属分支。
与该标题同属助手消息的操作栏在触控设备上从首帧可见，不在手指按下后
才因 `:hover` 改变透明度。鼠标仍按 hover 显示，键盘仍按焦点显示；
这条输入呈现规则不改变按钮激活或折叠状态写入。手机预览的连续静止轻触
对照均收到原生 `click`，但此观察不等于对所有移动端浏览器的证明。

Composer model discovery is a model-only catalog. Product Bot identity is
owned by the Bot protocol and is not duplicated as a hidden Agent picker.
Bot execution failures keep the stable member and execution identity across
history replay and live updates. Their error category is shown beside the
failed execution; raw provider diagnostics stay at the Host and are never
converted into a fabricated Bot message.
Reasoning controls are derived exclusively from each model's declared effort
set: an empty set hides the control, `none` means disable only when explicitly
declared, and the model default must be a member of the same set. Hermes maps
its Session-owned effort through the existing AppServer model/Turn fields;
provider-specific wire clamping remains inside Hermes Runtime.
The Web Composer presents model and reasoning through one Radix menu but keeps
their hierarchy distinct. At desktop widths, models are the primary scrollable
column and the selected model owns an adjacent detail column; narrow surfaces
stack the same two regions without changing their state. The detail projection
shows only catalog-authoritative metadata: user-authored display name, custom
source, context/output limits, input modalities and declared reasoning efforts.
It does not infer capabilities from a model name or render catalog descriptions
in the compact picker. Selecting a model keeps the menu open so that this
projection can refresh in place. Reasoning is a shared discrete slider: the current
choice is named above a pill track with declared stops, filled range and a round
thumb; endpoint labels show its range. The control derives order and count from
the selected model, hides for no choices and is disabled for one choice. It does
not infer unsupported options or write a default merely by opening the menu.
Dragging previews locally; releasing commits once through the existing Composer
selection/default action. Cancelled gestures discard preview. Arrow/Home/End/Page
keys use Radix Slider semantics and are isolated from menu roving focus. Changes
keep the menu open for further adjustment; Escape/outside dismiss as usual.
Model changes preserve a compatible effort and otherwise resolve through that
model's declared default rather than a global effort order. The shared Web Design
System owns slider geometry, theme material, focus and disabled treatment.
Its optional pointer-focus policy preserves the Composer's existing editor lease:
a touch-origin drag temporarily removes thumb focusability so Radix focus calls
cannot blur the editor; release/cancel restores keyboard access. It does not
blur/refocus, rewrite native selection or implement another gesture controller.


The Composer permissions menu contains only declared permission profiles, without
an AppServer-default row or explanatory question. A new-thread draft with no explicit
permission choice initializes to a Host-declared, enabled `full` profile when its
catalog arrives; the real draft selection travels through the existing submit path.
Existing threads, explicit choices (including null inheritance), and Hosts without
an available full profile retain their policy. Inherited runtime profiles remain
display-only. Until resolved, the trigger reads localized `Permissions` (`权限` in Chinese)
and no profile is checked. Standard Host-verified mode names, Chinese descriptions,
menu status and pending-change hints use the application locale catalog.
Native/custom profile names and descriptions remain engine-owned.

The empty Web Composer paints its placeholder from paragraph decoration attributes
and a noninteractive CSS pseudo-element. It must not insert a noneditable inline
widget or separator into the empty editing target, preserving native caret, selection
and clipboard behavior. Browser clipboard and DOM checks do not establish iPhone
system menu behavior.

Temporary Side Chat forks are adopted by `ThreadResumeCoordinator.adoptFork` from
the validated `thread/fork` response in its original connection generation. They
use the same metadata/notification projectors and Replica reader, but never issue
a rollout Resume or persistent queue query. Their history source is `fork` and a
lost connection expires that temporary baseline. See the [workspace design](../design/README.md).

| Package | Owns | Must not own |
| --- | --- | --- |
| `appserver-protocol` | JSON-RPC methods and Thread/Turn/Item wire types | UI state |
| `appserver-client` | connection and request lifecycle | conversation projection |
| `appserver-replica` | cursor, persisted replica, catch-up and mutation receipts | React |
| `appserver-session` | V3 Resume/history compatibility and normalized reader source | final ChatUI snapshots |
| `chat-core` | identities, Frames, Blocks and pure projector registry | transport and React |
| `chat-runtime` | Replica-derived snapshots and command/history ports | protocol storage and rendering |
| `composer-core` | portable document, draft, target and submit intent | DOM/Native editor state |
| `composer-editor` | OpenCraft Web ProseMirror editor | authoritative drafts |
| `timeline-virtualizer` | Shared Turn window, restore, geometry, follow and response-spacer policy | DOM and React Native |
| `workbench-runtime` | per-Host runtime, Thread catalog, Replica/Session lifecycle and commands | platform views |
| `workbench-web` | DOM Timeline, ProseMirror adapter and precise Codex frame | JSON-RPC storage |
| `workbench-expo` | RN Timeline, Native editor adapter and iOS/Expo Web frame | DOM |

The Embedded Workbench keeps Sidebar presentation outside this table: the host
product renders its own session list, New conversation action and Explore/Chat
navigation, while the embedded surface exposes session snapshots plus
create/select/rename/delete actions backed by the ordinary AppServer Thread catalog. Thread IDs and
mutation capabilities remain AppServer authority. The host must not copy or
infer a second conversation model, and the embedded surface must not inject
Sidebar DOM or rewrite the host page route. The right canvas is an
OpenCraft-owned presentation and may reuse the standard Header, Composer,
and Timeline implementations. The embedded product projects a collapsed preview panel with a Header toggle.
The session snapshot also carries the AppServer Thread catalog's running state
for each Thread. The host Sidebar may show activity from that field; selected
Thread identity and session-list loading are not execution status.
Only webpage tabs and read-only files linked from the conversation are exposed.

For the downstream product multi-Bot instances, one embedded Host is identified by
`instanceId + profileId`, not by the physical instance alone. The desktop service's root
`main` identity maps to native Hermes `default`; named Bot Profiles keep their
native identity. Every ordinary Thread operation is scoped at the Hermes
adapter boundary, and switching Bot disposes the old embedded Application
before publishing the replacement session list. The shared physical Dashboard
token is not conversation authority.

New conversation starts as a client Draft. The host Sidebar may mark that Draft
as selected, but it must not invent a Thread row or ID; the first accepted
submission promotes the Draft and AppServer then publishes the canonical Thread
into the recent-conversation list.

Hermes-backed session mutations stay on that same authority path. Rename uses
`thread/name/set` and the bridge's native `session.title`; irreversible
delete uses `thread/delete`. The bridge reads the live Hermes session first;
if it is running, it pauses queued submissions, sends `session.interrupt`, and
waits for `session.activate` to confirm `running: false` before closing the
session and invoking `session.delete`. An interrupt failure or missing idle
confirmation leaves the conversation intact. UI adapters must retain the
operation Promise long enough to expose pending and failure state.

### Returned thinking content

The Web reasoning disclosure uses Lucide Brain in the shared 16px activity icon
slot, retaining the recognizable thinking symbol. Its explicit 1.5-unit stroke
on the 24-unit viewBox yields a 1px rendered line, matching the adjacent
read/terminal glyphs; the default 2-unit stroke would render at 1.33px and make
the dense geometry look heavier. Keep the activity slot, muted color and
alignment shared, without enlarging reasoning independently. This applies to
both live and settled content.

Engine-returned reasoning is a chronological Item-owned inner disclosure within
the response's work container, not the body of a tool group's live “Thinking” header. Codex, DSH and Hermes
consume the same default policy: nonempty explicit summary text wins; when no
summary is returned, the actual returned textual detail/content is available.
The body selects that content once, without concatenating duplicate summary
and detail. Empty Items and opaque/encrypted fields create no disclosure and
cannot be used to fabricate an explanation.

Request policy and disclosure policy are different owners. The Codex Host's
single native request writer supplies `summary: "auto"` on `turn/start` only
when the caller omits that field. The same boundary covers normal/new/forked
conversations, empty continuation and Host-owned queued starts, over local
stdio or remote Codex transport. Explicit modes (including `none`) are retained;
explicit `null` keeps native thread/Host inheritance. Invalid explicit values
remain the native validator's responsibility. Each omitted-field start reapplies
the product default rather than inheriting a previous explicit `none`; callers
wanting native inheritance use `null`. No summary field is added to Steer,
Thread lifecycle requests or generic Hermes/DSH submissions. Codex's
native model capability gate still owns upstream support; asking for a summary
does not guarantee returned text. Existing running turns and historical Items
are not rewritten. The UI stays initially collapsed and only actual returned
text creates its disclosure.

Hermes already projects actual `reasoning.delta` and its durable reasoning
columns by default, without a separate display opt-in. Its ordinary Responses
transport asks for an automatic summary, but provider-specific transports and
explicit session/model/global reasoning settings can differ. “Enabled by
default” therefore means accepting returned text, not promising content on
every response or treating `reasoning.available` liveness as that content.

`chat-core` owns selection, chronological slots and single live Thinking
arbitration. Stable Turn/Item identity survives streaming, completion and
history updates. Reasoning and Bash/Read/tool groups have separate inner
disclosures inside the same contiguous response work container. The newest
current-response reasoning may own live feedback; later tools, answers,
questions or inputs retire that feedback without deleting readable content.
When no returned content exists, the existing noninteractive Thinking status
retains its current owner rather than becoming an empty expand button.

Reasoning presentation uses two phases: grouping and Thinking ownership inspect
selected returned text without Markdown compilation, then each visible Item's
header is compiled once in its final active/settled mode. The latest todo read
is a separate shared selector and never builds transcript presentation. Web and
Native each own a `ReasoningPresentationCache` for a mounted Turn, replaced when
its Turn key changes and released on unmount. It compares Item ID, selected
content/source and active parser mode, so immutable reprojection does not reparse
unchanged history; text/source edits, empty replacement and completion invalidate
the affected Item. The LRU retains at most 128 presentations and 1,000,000 source
plus header characters; larger Items still render in full without being cached.
No ASTs, disclosure choices, execution authority or persistent text cache are
shared through it. Headers continue to use the same assistant Markdown grammar
as the unchanged canonical body, including reference definitions and streaming
repair. The display-math tokenizer skips its boundary regex when neither actual
delimiter is present, retaining the existing rule for documents containing math.
Streaming reference, standalone image and link-target suffix repair scans input
linearly, preserving the existing output without repeated regex suffix searches
on untrusted model text.

Both platforms initially fold reasoning, even while streaming. Only an explicit
View action changes that choice; new deltas or completion never automatically
expand, collapse or write a preference. Web reuses its existing View restore
receipt and disclosure reflow owner; Native keeps Item-keyed inner choices on
the stable outer work component. Collapsing the outer container may unmount its
body but must not reset either reasoning or tool-group choices. The header uses a short localized status plus the latest
nonempty visible document line when active, or first visible line when settled.
The status label stays readable in full; the document-line preview yields space
and truncates when the header is narrow or the line is long.
Embedded the downstream product status labels follow the host locale for all supported site
languages; returned reasoning text stays in the language supplied by the engine.
`chat-document` owns the shared assistant Markdown grammar and plain-text
projection: labels omit formatting controls and link destinations, but preserve
escaped literals and code identifiers. `chat-core` selects the line and keeps
the selected Markdown body unchanged; neither platform regex-strips content.
The expanded body uses the ordinary Web/Native document renderer, with stable
Item document identity, the existing Host resource/media policy and the Web
viewport measurement ingress. Block Markdown is never nested in a raw paragraph;
its renderer owns whitespace and narrow code/table overflow. Only current live
feedback animates the document. Rendering a resource or a stream update cannot
change either disclosure choice or take tool/final-answer ownership.
The full selected text is available during and after execution. It is not
copied into the final response's copy action or tool statistics.

Adapter event names are not content authority. In the inspected Hermes agent
revision `3c3ab69abb9b08683b5eb15b4e2b8be1198c875f`,
`turn_response_intake._relay_thinking` sends up to 500 characters of
`assistant_message.content` as `reasoning.available`; it is an assistant-body
preview, not returned reasoning. The Hermes bridge uses this only for liveness,
leaving body ownership to `message.delta/interim/complete`. Actual
`reasoning.delta` and durable reasoning columns own separate reasoning Items;
an answer with equal or prefix-continuous text cannot erase them. History
aliases select one returned representation instead of duplicating it.
An empty or opaque reasoning source Item remains a work observation; it does not
flush/re-key a work slice, close an adjacent tool group or create a history-count
heading. Actual nonempty text owns a source-identified chronological disclosure.
First returned text inserts a new inner disclosure, including when later Items
already exist in restored history; it never splits or re-keys the outer work
container. Source identity and existing valid View choices survive. Nonempty
reasoning separates adjacent inner tool groups, not responses or outer folds.
Within the same contiguous response, a real final answer grants exactly one
outer work disclosure containing both reasoning and tools in source order.
The final answer remains outside. Tools never move into the reasoning body.
Real user input, an asynchronous question or other content/interaction retains
its existing ordering boundary; separate completed responses keep their own
legitimate folds even though execution shares one Turn. Only one work container
owns the Turn-total clock; reasoning cannot redirect it across a response/input
boundary. Actual reasoning alone is meaningful work, so a completed reasoning-only
response has a real outer fold, even with no tools. Its Worked-for label uses
only the provided clock, never fabricated timing. Empty reasoning alone does
not create an empty toggle. Outer visibility and independent inner choices are
different authorities; streaming, completion and outer collapse never rewrite
those inner choices.

The interaction draws on DSH `ReasoningRow` in locally inspected
`@deepseek-ai/dsh-client-ui-conversation@0.1.1-rc.2`. Shared model and adapter
tests plus `scripts/smoke-reasoning-disclosure.ts` cover empty/summary/detail
content, first control activation, browser touch/mouse/keyboard, separate tool groups,
in-place streaming, completion, prepended history and View restoration. The
browser fixture uses synthetic engine text; it does not claim paid-provider
execution, hidden reasoning availability or iPhone OS acceptance.

The embedded canvas permits the existing `vela.voice-input.toggle` Composer
action. Dictation uses the platform speech provider and the same transient input
transaction as the full Workbench; no microphone starts until user interaction.
Unsupported browsers retain the provider's disabled-state explanation.

All floating primitives in that canvas resolve through one Workbench
Presentation Root. This includes Composer model/effort menus, Draft project and
Host selectors and application modals. The root also owns the
semantic theme variables required by those primitives; a Portal must never fall
back to the embedding product's document body.

Global type-to-compose resolves input ownership through the keyboard event's
composed path, including editable descendants inside the embedded Shadow DOM.
It never inserts printable keys owned by an editor or control, or IME keys
marked composing / keyCode 229 (including the initial composition key).

The Web renderer localizes the Thinking status through one `ThinkingLabel`
for turn placeholders, live reasoning and activity-group gaps between tools.
Core status strings remain renderer-neutral; real reasoning summaries are preserved.

## Agent-originated async questions

### Hermes direct approval ownership

Direct/embedded Hermes Threads translate native `approval.request` into
`item/commandExecution/requestApproval`. The existing OpenCraft approval card
owns presentation; Hermes owns the pending request and authorization policy.
Native request ID plus durable Thread ID identifies the prompt independently
of its revocable live session route. Each prompt has its own synthetic Item ID,
so the interaction ledger cannot replay another prompt's grant.

The optional OpenCraft `approvalScopes` extension carries the provider's offered
`once/session/always/deny` scopes. Canonical `accept`, `acceptForSession`, and
`decline/cancel` map to native `once/session/deny`. An explicitly offered
persistent grant uses `{decision: "accept", _meta: {persist: "always"}}`;
it is not a Codex exec-policy amendment and cannot be sent to an unextended
Codex request. Web and Native require a separate confirmation for that scope,
using their existing interaction card controls and design tokens. Backend
restrictions such as smart denial and disabled permanent grants remain binding.

Resume restores `pending_approval`; a quiet heartbeat is not completion while
approval is outstanding. Disposing a View/bridge never answers it. Native tool
completion and successful answers refresh the oldest pending approval snapshot,
not a fabricated complete queue. Snapshot absence clears stale prompts; newer
events and revoked live-session routes fence late snapshots. Failed RPCs or
`resolved=false` retain the approval. A delivery failure needs reconnect to
restore the response channel; it must not manufacture an empty or approving
response. Follow-up snapshot failure cannot turn an accepted grant into a
request to send it again. Group-conversation approval routing is unchanged.

Codex `agentMessage` Items with `delivery: "async"` and `questions` are not
`item/tool/requestUserInput` server requests. The former remain ordinary
assistant messages: their question cards are projected from the Item ID and
question index, stay visible in the Timeline, and do not replace the Composer
or suspend the Turn. The latter use the existing blocking interaction response
port. Device type must not select between these two protocol forms.

An async question's title is model-authored Markdown, not a form-control label
string. Web renders it through the same Chat Document and resource policy as
assistant content, so safe links are usable and unsafe targets stay inert. The
card gives its fieldset an accessible name from the rendered title instead of
placing block Markdown inside a `legend`. Suggested answer strings remain
literal labels and submission values; presentation must not rewrite the answer
envelope or create a second Markdown/link policy.

An async answer is a normal user submission carrying Codex's
`send_user_message_question_reply` envelope. The active Turn uses the steer
submission path; an idle Thread starts a normal Turn. The reply is rendered
readably in the user message, while its structured question ID resolves only
that card. Later ordinary user messages supersede unanswered cards. Pending,
queued, sending, uncertain and answered states derive from the shared Timeline
and follow-up queue so a second subscriber or a reconnect sees the same result.

The Web/Electron inline async answer textarea submits with Enter or Cmd/Ctrl+Enter;
Shift+Enter inserts a newline. IME composition (including legacy key code 229),
Alt+Enter and held-key repeats do not submit. Keyboard and button actions use the
same guarded answer callback and the Conversation's existing synchronous in-flight
guard; empty, queued, disconnected or resolved answers cannot send. Failed sends
retain the draft for retry. This textarea policy does not change the main
Composer's device-specific Return behavior or blocking interaction response port.
Regression: `scripts/smoke-async-question-keyboard.ts` mounts the real Conversation
and replaces only its external answer port.

## Current migration ledger

### Disclosure scroll anchor lifetime

While a user expands or collapses an activity, its heading retains its screen
Y coordinate. Numeric disclosure height samples are projected onto whole CSS
pixels by the shared Web animation adapter before Motion commits layout,
matching the scrollport's conservative pixel grid. Otherwise rounded scroll
writes can leave the heading oscillating by almost a pixel even when its final
position is correct. Natural `auto` layout and later streaming growth are not
fixed or rounded by a second observer. The disclosure owns its
animation and reports completion through a View-scoped reflow lease; the Web
conversation viewport is the sole owner of scroll writes and observation. It
keeps the anchor through the animation and final stable layout frames, including
body removal and reduced motion. No fixed timeout decides completion for the
activity row, group or Worked-for controls.

Worked-for animates entry only. Its closed branch removes content in the same
React commit; it must not add an exit-presence owner that defers unmount after
the parent reports synchronous layout completion. Completing a reflow lease
applies the committed layout compensation immediately, then waits for stable
frames before retiring observation.

Each viewport has at most one interaction anchor. Reversal or a new heading
supersedes the old lease; delayed completion can only complete the lease from
its own render. User scrolling, control unmount and viewport replacement cancel
preservation immediately. Unmigrated expanders keep their separate bounded
compatibility policy and cannot create a second owner alongside an activity lease.

Browser regression measures the visible label's entire path and peak-to-peak
movement, not only final position or each frame's distance from the starting
point. It covers measured multi-Turn layout, fractional starting geometry,
mouse/touch input, reduced motion and interrupted/reversed animations. A
separate nonvirtualized control checks retirement of the interaction anchor;
normal virtualizer compensation during later growth is not evidence of a leak.
That control also holds a real viewport lease without an animation deadline:
body growth is initially pinned, then actual wheel/touch-pointer input must
release it before subsequent growth. Growth checks wait for the measured body
height to change before sampling the heading. Detaching the viewport releases its anchor
while the former DOM is still connected. Actual disclosure unmount separately
verifies hook cancellation. These adapter lifetime checks complement the real
mouse/touch animation path; they do not claim Native or Electron acceptance.

### Established

- AppServer client, WebSocket, memory and Replay transports.
- Resume strategies for legacy, tail, paginated and Durable history.
- V4 Replica authority/client/storage primitives and V3 compatibility source.
- Cross-host `ConversationKey` and opaque Turn/Item identities.
- Extensible Timeline projector registry with an unknown fallback.
- User, assistant, event and interaction Frames.
- Typed Blocks for text, reasoning, execution, patch, tools, plan, todo,
  subagents, approval, question, errors, compaction and images.
- Portable Composer Document/Draft/Target/SubmitIntent and target-scoped drafts.
- A Conversation Runtime that derives its snapshot from a Replica reader only.
- `AppServerWorkbenchRuntime` with per-Thread Replica clients, typed command
  ports, reconnect and stable Thread selection.
- Real WebSocket bootstrap for Web and Expo; IndexedDB on Web and Expo SQLite
  on Native cache only painted state beneath Replica authority.
- Web ProseMirror and Native input adapters controlled by the same
  `ComposerController`; submission freezes an immutable `SubmitIntent`.
- A typed Composer-to-AppServer compiler for new/fork/turn/steer/queue,
  interrupt, approvals and questions.
- Web and RN Timeline renderers consuming the same Turn/Frame/Block projection.
- Shared Turn virtualization: one full-height list, Turn-count overscan,
  measured-height anchor compensation, route restore and common geometry/scroll API.

### Turn identity handoff and mounted window

The canonical `turnKey` remains the protocol locator. When a submitted Turn
acquires its authoritative ID, its primary user-message client ID owns the
stable React row identity. Known measured height transfers across that identity
handoff before estimating the new layout; an already measured target height
wins, and unrelated messages never inherit geometry.

The intermediate mounted window retains both its anchored slots and every
surviving mounted row. History insertion cannot evict its former last row, and
a same-count ID replacement cannot exclude a newly acknowledged edge. The
viewport refresh consumes layout identity, not only entry count or a later
platform scroll event. Natural and response-placement policies share this rule
without acquiring bottom ownership from a reader, forcing scroll, reordering
history, or remounting the Conversation.

### Compatibility boundary

- `appserver-session` currently materializes a Thread View before exposing it
  through the ReplicaClient-shaped reader. This is the compatibility ingestion
  boundary, not proof that Codex V3 has a V4 Authority or retained Journal.
- `DisplayTurn` remains exported only for older fixtures. Neither application
  host uses it as its conversation read model.
- Browser attachment blobs require a compatible Host attachment-staging
  capability before they can become server-readable AppServer attachments. The
  compiler remains a final fail-closed boundary, not the primary upload-state UI.
- the downstream product Hermes advertises that capability only when its authenticated
  Dashboard filesystem exists. Client bytes are staged under the controlled
  `<codexHome>/opencraft-attachments/<client-id>` directory with a durable
  manifest, a location-keyed display-metadata index, replay/content checks and
  bounded recursive removal. Images may continue to use the independent inline
  data-URL path. Host-staged non-image assets, including audio files, compile as
  file mentions; their MIME type alone must not turn a server-readable file into
  an audio modality that the Host does not support. The staging service receives
  its SHA-256 digest from the Host platform: browsers use Web Crypto, while Expo
  supplies its native crypto module. It does not assume React Native exposes
  `crypto.subtle`.

### Browser image attachment presentation

The Web Composer displays a selected image immediately from a browser-owned
object URL. The object URL and original `File` belong to the Composer
Controller's draft-owner attachment session, keyed by Draft ID and attachment
ID; neither enters the serializable Draft or AppServer input. The session owns
compression/resolve work across React mount changes, updates only the Draft
that initiated the work, and aborts/revokes on removal, clear or Controller
disposal. A retry uses the retained original `File`. `processing` means local
image preparation, not measured network upload progress. The existing
`canSubmit` rule remains the admission gate for unresolved or failed assets.
For iPhone camera HEIC/HEIF input, browser image decode and canvas encoding
produce a JPEG upload derivative. This is required format conversion, so it is
kept even if larger than the selected HEIC; the original File stays with the
draft-owner session for retry. A browser without that decode/encode path leaves
the attachment failed rather than sending HEIC under an unsupported MIME.
The post-conversion inline byte cap still applies before base64 allocation.
Failed image cards show the preparation error beside the thumbnail, so touch
users can identify a decode, size or encoder failure without a hover tooltip;
retry still uses the original selected `File`.

After acceptance, image presentation is derived from the authoritative
Timeline. Sent-image thumbnails resolve direct image data or Host-backed media
through the existing media source boundary; their click opens a modal image
viewer rather than generic link navigation, which deliberately rejects `data:`
URLs. The viewer uses the Workbench Presentation Root so embedded Shadow DOM
keeps its modal styles and focus behavior; an explicit modal portal target
still takes precedence. No generic resource-policy exception is introduced. Full page reload
does not preserve an unsent browser `File`; that requires a separate durable
draft/blob storage contract.

### Native Composer input boundary

The Expo Composer uses the same Controller, Draft, attachment lifecycle, model
catalog and Host attachment-staging capability as the desktop renderer. The
Hermes bridge returns catalog timeouts as AppServer request failures, so a
later catalog read can retry without resetting the conversation. The Expo Host
records only a fixed failure category in its developer log; handled RPC
failures must not be reported through `console.error`, which Expo Go renders
as a full-screen development error.
workspace and permission controls consume the same AppServer project and
permission-profile catalogs; they appear only when the connected Host returns
actionable entries. The current the downstream product Hermes bridge returns empty catalogs
for both methods, so its iOS Bot chat has no workspace or permission choice
until that Host implements the corresponding capability. The renderer does not
manufacture selectable projects or permission profiles.

The platform picker produces a local `File` URI; supported images become bounded
inline data URLs, while non-image files use `client-bytes` staging only when the
connected Host advertises it. Pending work is bound to the initiating Draft ID.
The native attachment sheet exposes the file picker only while that Host
advertises `client-bytes`; the photo picker remains available independently.
An OS photo/file picker result is also bound to the Draft and mounted Composer
that opened it; a result arriving after navigation or unmount is discarded
before adding any attachment. After admission, a Controller-owned native
attachment session retains the local source URI and in-flight task across
input remounts and target switches. A failed attachment can retry from that
same source; removing it aborts the task and releases a late Host result.
Picker jobs are serialized within one Controller-owned session: a waiting file
stays pending in its Draft while only one source is read, encoded and staged at
a time. This bounds concurrent Base64 memory on iOS without changing Draft
ownership. Removing a waiting file takes it out of the queue; removing the
active file still waits for any in-flight Host response so its late ref can be
released before the next job starts.
The native image chip previews that same local URI while the attachment belongs
to its Draft; it does not decode the staged base64 payload for display. Switching
Drafts or removing the attachment removes its preview from the active input.
Disposing the Controller releases unsent ready Host refs. A Draft already in
`submitting` retains its staged refs until that asynchronous send settles, even
if the Controller is disposed during navigation. Acceptance transfers ownership
to the conversation; failure or rejection releases refs that can no longer be
retried from the disposed View. Picker metadata is
normalized before entering
the Draft: a photo with no MIME
uses its original name or URI extension, and an unidentifiable photo remains an
image for JPEG conversion. This avoids routing such photos through the Host's
ordinary file-staging capability.
Unsupported native image formats are converted into a temporary JPEG. The
resolver removes that conversion file after encoding, including on cancellation
or size failure; the Draft's preview continues to use the original picker URI.
The Hermes staging bridge decodes Base64 in bounded chunks and checks canonical
padding in the final quartet. This avoids keeping an extra full-size binary
string and re-encoded copy beside a large file before its Host write; its
platform SHA-256 provider must not mutate the supplied bytes.
Removing an attachment aborts the job; the Host release callback receives only
a ready ref, including one returned after cancellation, never a pending item.
Late completions cannot mutate a different conversation. Picker and staging
errors shown in the client remain generic and do not expose internal details;
the iOS developer log records only fixed failure events.
Once a `client-bytes` request reaches the Host, the native resolver keeps
waiting for its reply even if the local picker item is removed. Aborting only
the RPC wait would hide a successful Host write and leave no ref to release;
the attachment session instead receives the late ref and removes it.

Native text edit bounds use one full suffix scan to resolve ambiguous changes
in repeated text near the last native selection. This keeps per-keystroke
work linear in the draft length while retaining the existing mark ownership.
The mobile paragraph-format action transforms contiguous selected top-level
paragraphs, quotes and simple lists in the shared document without replacing
inline marks or list item identity. Its visible selection maps across generated
list markers and the separators between blocks. A
native Return inside a simple list item splits it into a new item; Return on
an empty item exits the list. Unsupported nested blocks remain unchanged rather
than being flattened. The same action can create a code block from plain text
or convert an existing code block to paragraphs, quotes or lists. Converting
marked or atomic inline content to code is rejected because code blocks cannot
retain those identities. The input's native buffer is reconciled to the new text
projection, and the caret update is scoped to the same Draft generation. A pure
native text transaction decides whether an input event is accepted, rejected or
rewritten by a structural list or quote operation before the View publishes it. The
iOS Fabric adapter records the native event count and text before invoking the
parent callback, so a synchronous Draft update uses that event's generation
when it writes the controlled projection back.

At the start of a simple list item, native Backspace changes the first item
to a paragraph or joins a later item to its predecessor. Both operations keep
surviving inline marks and untouched item IDs; ordered markers are regenerated
from the remaining items. A complex item still rejects marker deletion rather
than losing its nested blocks.

On a quote's trailing empty paragraph, a second Return moves that paragraph
outside the quote while preserving earlier quoted content and its inline marks.
The plain-text projection can remain unchanged even though the block structure
changes; the native input reconciles the extra Return to the shared Draft and
keeps the caret in the new paragraph. Other quote edits still use the normal
paragraph path.
Backspace at the beginning of a quote following an ordinary paragraph joins
its first paragraph to the preceding paragraph. The remaining quoted children
stay in the quote, and each inline mark stays with its original text. The
resulting projection already matches the native deletion, so it needs no text
buffer rewrite. A quote after another structured block remains protected.

An async send settlement carries the initiating Draft ID and immutable
`SubmitIntent`. The shared Controller clears or restores only that active or
target-cached Draft; a late A result never mutates the B Draft now on screen.
If A acquired new content while its submission was pending, a successful
settlement preserves that content and returns it to editing instead of
clearing it. The native input is noneditable during its Draft's submission.

The shared AppServer compiler lowers Composer strong, emphasis and code marks
to Markdown in `UserInput.text`, because the AppServer text-element wire type
does not carry those marks. Desktop and Expo therefore submit the same
formatting semantics, while unmarked text remains byte-for-byte unchanged.

The native TextInput edits a text projection of the shared `ComposerDocument`.
Its adapter preserves inline marks and untouched mention identities for edits
within a paragraph, supports one format selection across ordinary paragraphs,
keeps marks when joining adjacent paragraphs, and turns Return or pasted line
breaks into paragraph blocks without dropping surrounding blocks. A selection
inside a link edits its text and marks while retaining the link destination;
text replaced across the entire link without surviving linked characters
becomes ordinary text. Link text in nested quote/list paragraphs uses the same
shared document reconstruction. A selection entirely inside a quote or list
leaf can edit and format that leaf, including splitting its paragraph. Edits
across two paragraph leaves within the same quote
or list item can join them while retaining the parent structure and surviving
text marks. Generated list markers and separators between distinct parents
remain protected. The iOS attributed editor uses the same exact text projection
for paragraph, quote, list and code-block Drafts, so nested marks appear at
their input positions. Other platforms show those marks in a read-only preview.
The native selection toolbar also creates or removes Web links across selected
paragraph text, including quote and list leaves. It retains the selected text's
strong, emphasis and code marks, plus surrounding block and inline identities;
generated list markers, code blocks, dividers and atomic inlines stay protected.
A keyboard-aware
native sheet accepts only HTTP(S) destinations; it percent-encodes Markdown
destination parentheses before the shared AppServer compiler serializes the
link. The selected range is bound to its Draft ID while the sheet is open, so
switching conversations cannot write a link into another Draft. Linked runs
are underlined and tinted in the attributed input.
React Native 0.86.3's public iOS `TextInput` wrapper drops rich Text children,
although its Fabric multiline
shadow node accepts them. The pinned iOS adapter forwards document text runs
to that native component and tracks its event count, focus and selection;
this is the path for displaying strong, emphasis and code marks while editing,
pending device verification. It also provides React Native's `TextAncestorContext`
around the native component so nested runs render as virtual text. Without that
context Fabric treats the nested `Text` view as an inline attachment character.
Because this adapter bypasses the public `TextInput` wrapper, it also compares
the last native text event with the shared Draft projection after rendering and
uses the current event generation to restore rejected edits or apply external
Composer text changes. The native command temporarily uses default text
attributes, so the adapter then refreshes the attributed child tree to restore
the document's marks without remounting the input host. The visible native
buffer must not diverge from the document that will be submitted.
When its Draft or Bot unmounts, the attributed input also clears the focused
native host before release, mirroring React Native's own TextInput cleanup so
the keyboard and focus do not remain attached to a previous conversation.
Native text, focus and selection callbacks carry the Draft ID of the input
instance that produced them. A late event from an unmounted input cannot edit
the newly active Draft or replace its focus/selection; accepted selection
offsets are bounded by that Draft's current plain-text projection.
Shared Composer `insertText` actions replace the current native selection or
insert at its caret; when no selection has been reported, they append. The
view then asks the native input to place the caret after the inserted text.
Native undo and redo record the full shared document and caret for each edit,
format action and external text insertion, keyed by Draft ID. The history stays
with the Composer Controller across input remounts, is bounded, and refuses to
replay when another action has replaced the document. Attachment refs remain
under their separate Host lifecycle and are never restored by text undo.
Between native text and selection events, the view rebases its last known
selection across the accepted text edit. The document adapter also uses that
selection to distinguish edits of identical adjacent characters with different
marks, so the unchanged run keeps its formatting.
Rebuilding an atomic inline requires every projected character in its span;
editing inside a mention, command or resource converts only the edited span to
text instead of duplicating the full inline. Before a native edit enters the
shared Draft, the adapter checks that the rebuilt document projects to the
exact text received from the input; an unrepresentable edit keeps the previous
document. The auxiliary controls scroll within the Composer on narrow windows
while the send action remains visible.
Other platforms retain the controlled text input and a read-only format
preview. Changing Drafts remounts the input so an empty Draft
cannot retain the previous visual text. Text edits that cross distinct quote,
list item or divider boundaries are rejected with a simple editing prompt rather than
flattening the Draft. A format selection can cross paragraph and quote
boundaries or multiple paragraphs inside one list item; generated list markers,
dividers, code blocks and atomic inlines remain protected. Model effort, Host permission profiles
and AppServer projects are selected through the shared Draft and catalogs.
Project choices appear only for a new-thread Draft and retarget its execution
workspace without replacing its content. Existing threads keep their bound
workspace. The iOS adapter uses a private React Native component and must be
checked after React Native upgrades; inline behavior, Chinese IME and selection
still need device verification. Native editing across distinct structured block
boundaries remains an editor gap.

### Production hardening, not architecture blockers

- Extend the native rich editor to structured `ComposerDocument` block types
  and edits across their boundaries without flattening them.
- Add Remote RPC/SFTP and Cloud object-store attachment-staging adapters
  without changing Composer lifecycle semantics.
- Tune platform-specific response-spacer animation curves while retaining the
  shared placement and follow state machine.
- Split the large desktop renderer chunk at explicit capability boundaries.

## Evidence required for completion

Both apps have removed `createDemoWorkbenchRuntime`. Deterministic Memory and
Replay suites cover create/list/resume/page/send/stream/interrupt/retry,
interaction RPCs, cursor gaps and reconnect. The live 9988 gate deliberately
uses the existing canonical Thread read-only: it proves WebSocket → Session →
Replica authority, forced disconnect, reconnect and same-Thread recovery
without mutating a user's conversation. Production Web, Expo Web and iOS
bundles are independent quality gates; a static fixture alone is not accepted.

控制台内嵌的新会话由宿主选择 Bot，Shell 通过 showExecutionControls=false 隐藏整个项目/执行环境工具栏和连接状态点；独立工作台默认展示。连接生命周期与发送就绪检查保持由 runtime 负责。

内嵌新会话标题与新建/已有会话的差异化占位提示覆盖控制台 en-US、zh-CN（含 zh-SG）、zh-Hant、id-ID、es、ja-JP、ko-KR。额外五套文案由 embedded-companion-messages.json 提供，通过嵌入专用 catalog 注入 LocaleController，跟随宿主语言切换；这不代表其他工作台文案已完整翻译，未覆盖项继续使用 defaultMessage。独立工作台语言选择项保持原样。

内嵌新会话（draft 存在且尚无 submission）由 sessions bridge 显式发布 isDraft；启用右侧预览时保留顶部面板开关，已有会话继续展示标题与重命名。国内控制台内嵌聊天的加载、新会话和已有会话均无宿主圆角外框，内嵌主内容表面无阴影；保留标题重命名入口与输入框边界。预览面板默认关闭，网页标签随会话 scope 切换；文件只读预览不展示目录树、搜索或编辑。

内嵌会话列表由宿主分页呈现。OpenCraft 的 Thread catalog 仍以 30 条为一个后端分页单元，sessions bridge 将当前已取会话和 `hasMoreSessions` 一并发布，并通过 `loadMoreConversations()` 显式读取下一页；宿主初始展示最近 20 条，每次「查看更多」最多增加 20 条，「收起」逐批撤回。加载失败时不推进宿主的可见数量。
首次连接的 Thread catalog 在查询尚未开始或尚未取得结果时也报告加载中；Host 进入错误态后停止报告加载，由聊天主区呈现错误和重试。空列表只有在首次读取结束后才能作为已确认的空状态投影。宿主切换 Bot 时不显示短暂的「默认对话」或可见的加载文案，待目标 Bot 的会话结果到达后再呈现列表或空列表入口。

内嵌右侧预览面板的入口、标签列表/空态、缩放与关闭提示、宽度调整无障碍标签以及不可用状态均通过稳定消息 ID 跟随宿主语言；网页自身正文由目标站点控制，不由控制台翻译。

Embedded file previews retain the mutation-level read-only guard alongside snapshot-based saves in the standalone workspace editor. Markdown preview/source switching and lazy syntax editors share the same resource lifecycle. The read-only regression renders the real panel and invokes its captured Query mutation, asserting zero filesystem writes and cache invalidations.

Document preview entry: explicit `.md` / `.markdown` / `.html` / `.htm` paths in completed inline code are clickable and use the same resource policy and Host-scoped right panel as Markdown links. HTML opens in a sandboxed, read-only page preview with a Source switch. Scripts cannot run; the preview's content policy permits inline styles and embedded data/Blob media while blocking external subresources. Before creating the frame, the preview removes link destinations, refresh redirects and SVG animation elements that can restore navigation because Chromium can navigate a sandboxed frame away from its original content policy. The Source view preserves the original file. This supports self-contained reports without granting page code access to the Workbench. Bare names, commands, external URLs, streaming paths and code within an explicit link retain their original semantics. No file is read before clicking.
Completed standalone `MEDIA:<path>` text or inline code uses that same click and resource policy flow regardless of the engine that produced it. This delivery directive is independent of file type: images, audio, video, PDFs and unknown files all open the existing resource preview. Absolute and relative file paths, quoted paths with spaces, and HTTP(S) addresses are recognized; external addresses retain the existing external-navigation policy. Embedded prose, malformed paths, streaming content and code inside an explicit link remain inert. The Renderer never treats the literal `MEDIA:` prefix as a browser URL or reads a file before clicking; ordinary bare inline paths retain the document-extension rule above.

The shared media classifier selects an image, audio, video, PDF or generic file
branch using the path's extension as a presentation hint. Actual decoders still
validate the bytes. Resource previews read through the Host filesystem and the
existing Blob cache. Audio and video use browser controls over a View-owned Blob
URL; this is whole-file playback, not an HTTP Range streaming contract. Unsupported
codecs and unknown binary files retain a download action.

PDF previews lazily load PDF.js and its build-owned Worker, CJK CMaps, standard
fonts and image codecs; no CDN or remote-file URL is introduced. PDF bytes bypass
the text editor's 4 MiB limit. One selected page is painted at a time, with
pagination, fit-width, zoom, text selection and original-file download. The
backing canvas has a bounded pixel budget. A View owns its document loading and
render tasks and destroys/cancels them on replacement or unmount; late results
cannot paint a different resource. Invalid or password-protected documents show
a generic failure with download available. Web and Electron share this Renderer;
this does not declare a native Expo PDF viewer.

## Product Thread badge slot

The Shell offers one trusted `threadBadge` contribution. Its React contract supplies
Host/Thread identity, portal root and controlled Popover state; enterprise identity owns the circular
participant badge and data reads. The badge is a sibling of the Thread navigation
button. Sidebar owns exclusivity across participant Popovers and existing context/
dropdown menus, clears state on selection/hidden-row/unload, and prevents a retired
Popover from restoring focus into a newer one. Escape retains normal focus return.
No enterprise identity-specific query, count, identity or badge styling belongs to Sidebar.

Chinese emphasis uses the standard Marked tokenizer first. If it rejects an asterisk delimiter at a Han/punctuation boundary, the compiler retries with a length-preserving delimiter mask and a relaxed Han opener boundary. This preserves canonical source, code/escape masking and standard English/underscore behavior.


Mobile Web Composer ordinary Return inserts a paragraph on coarse primary-pointer devices, including iOS native paragraph changes routed back through ProseMirror Enter. Suggestion, code and list commands keep their own precedence. Desktop Enter and explicit Ctrl/Cmd+Enter submissions remain available. Standalone and the downstream product embedded Composer consume the same placeholder message IDs: new conversations use `chat.companionPlaceholder`, and follow-ups use `chat.companionFollowupPlaceholder`.

Standalone and embedded Web entry points share one minimum Composer editing height: 64px for desktop viewports (at least 768px), and 48px below that breakpoint regardless of pointer type. This applies to new-thread and narrower panel containers; embedded styles do not override the height. Document growth and the scroll cap retain their existing behavior.

Sidebar omits inline Server-origin marks; the Server filter and complete row tooltip retain provenance. Project names use independent complete badges.

## Selection Add to chat

Conversation owns one selection menu beside its scroll root. A range wholly inside
one rendered assistant or user document opens a non-autofocusing Radix popover.
Activation revalidates the live range; the application checks that the current
composer targets the visible host/thread. Scroll, resize, Escape and unmount close
the menu. Sender labels, controls, composer and cross-message ranges are excluded.
Selection extraction reuses sanitized Markdown content extraction, removing copied
full-code metadata first so a partial code selection stays partial.

ComposerController.appendQuote is an optional View capability with an explicit
acceptance result. Submission, active transient input and detached Views reject
it. OpenCraftComposer inserts literal text into a quote block and appends an empty
paragraph in one isolated undo transaction. It retains prior draft content,
attachments/context and focuses the trailing paragraph; it never submits. The
existing AppServer compiler retains `> ` prefixes in native input. This Web/Electron
interaction does not change Native or workspace/terminal selection behavior.

Validation: `scripts/smoke-selection-add-to-chat.ts` exercises real rendered messages,
selection popover and editor through native submission compilation without inference.
It covers draft retention, undo, partial code, caret placement, exclusions, stale
selection cleanup, theme palettes and Chromium touch. Set OPENCRAFT_CDP_URL to an
isolated Electron preview for the same client test.

The virtual anchor is clipped to the intersection of timeline bounds and browser
viewport. Long selections anchor at the first still-visible selected line while
retaining all selected text; wholly offscreen ranges do not open a floating action.
## Restored baseline versus live entry motion

Web/Electron Conversation owns a narrow entry-motion context. Initial display,
Host/Thread changes and paint/sync recovery (including the first authoritative
live snapshot) establish a baseline, rather than a new work event. AgentActivity's
outer content and WorkStatusDivider consume that gate for their initial motion;
restored content is visible at its final geometry on the first DOM commit. Once
that baseline has committed, live insertion and user disclosure opening retain
existing transitions. This does not delay content, change elapsed-time authority,
add a cache or require backend protocol changes. A settled collapsed work header
remains synchronous. Verification: `scripts/smoke-conversation-entry-motion.ts`
uses the real Conversation, checks first-commit opacity/height, repeated remounts,
in-place scope switches, progressive preview/authority promotion, live work entry
and manual expansion in light/dark and desktop/touch.



## Sidebar catalog lifecycle and row metadata

The application subscribes to native Thread lifecycle events per client lease.
Catalog notifications cancel older catalog reads, including an unresolved first
fetch, before updating existing rows with `thread/status/changed` or `turn/started`.
Both paged and sidebar caches receive the same status, scoped to their Host.
The shared Thread query prefix is heterogeneous: archived settings hold a bare
array, not a catalog page. The notification owner patches only page-shaped
projections and preserves other cache values/identities for ordinary invalidation;
a non-page projection cannot throw and poison subsequent notification ordering.
A fresh invalidation then reconciles metadata; it does not serialize subsequent
events behind network latency. Disposal fences queued callbacks. Neither unknown
rows nor selected-route execution state are invented to force a group placement.
Running precedes attention, pins and recent in the existing task-flow projection.

The row container paints one continuous selected/hover background across title,
project, status, participants and actions. Server marks are omitted; provenance
continues to own server filters and tooltips. A leading project badge reserves its natural width before title ellipsis, capped
at 35% of the row and 112px. Labels never wrap; exceptionally long names ellipsize,
with complete project text retained in the row tooltip. The server filter reuses the display-mode radio indicator column. Unread receipts remain participant-only, rendered as a muted 5px gray dot; running/wait/error indicators remain visible. Account-bound receipts use the fixed server authority described in [platform architecture](platform-architecture.md#account-read-receipt-authority); local storage is a cache/outbox and migration source. Account changes fence stale receipts; reading one exact Turn does not acknowledge later replies. Foreground devices converge on focus/online/visible recovery or the15-second refresh, including fresh browsers.

`smoke:thread-management` mounts the actual Sidebar and verifies that rename
draft/focus and held fork state survive task-flow regrouping. Its desktop/touch
and light/dark matrix covers independent menu hit targets, capability filtering,
navigation/current-row semantics, stable status geometry and input-specific hover
behavior. Action RPCs are synthetic. These observable checks replace JSX/SCSS
spelling assertions in `tests/sidebar-activity.test.ts`; pure grouping, metadata
and stale-menu-close behavior remain covered by that unit suite.


## Navigation preview author

Conversation navigation previews carry optional MessageSender provenance from the exact projected user message. A Turn marker continues to address its first prompt; another participant steering that Turn does not replace its author. The Web hover/focus card resolves this identity through IdentityAvatarContext and renders AvatarImage in a fixed 20px slot before the prompt. Missing photos use the shared fallback; absent provenance omits the slot. No viewer/Turn-owner inference or separate identity request is introduced; lazy hydration and generation fences retain ownership.

## Server-owned native Codex history

A Durable Host placement does not imply paginated Item support. When a resumed
Thread explicitly declares `historyMode: "legacy"`, the Durable history strategy
reads `thread/read` with `includeTurns: true` and commits a complete history
baseline. It does not call `thread/items/list`, which native Codex may expose as
unsupported. Paginated Durable Threads retain separate Turn and Item loading;
message-window history keeps its own higher-priority strategy. This applies to
normal navigation and to conversations opened from linked Tasks alike.

### Composer material and native caret

The shared shell paints ordinary/Newera glass in a pointer-transparent background
pseudo-element. Backdrop filters must not wrap the ProseMirror editing subtree;
layout, keyboard viewport projection and the browser's native selection remain
separate owners. Material variables consume theme tokens and opaque fallbacks.
Scroll/viewport regressions verify selection and adjacent-character geometry without
writing a second caret or resetting focus. Chromium checks do not establish iOS
native caret painting correctness; device-only failures require device verification.

Queue/goal rails use independent theme glass tokens on desktop Web and touch,
regardless of Newera. Desktop editors stay opaque; touch editors use their own glass.
Both have non-interactive background layers and opaque accessibility fallbacks;
no footer gradient may mask the rail's backdrop. The rail glass ends at the editor
seam to avoid double tinting the tuck. Material choices do not alter queue ownership.

Queue rows and the independent live-diff pill have their own compact density: 28px on desktop,
36px for touch queue rows and 32px for touch diff summaries, with no block padding.
The queue viewport is bounded to three rows plus its optional status header and
scrolls internally. Keep text roles, count animation and queue actions intact;
do not compress the Goal surface or editor to obtain this density. The shared rail
uses 94% theme material coverage (editor glass is independent), so the moving
transcript does not compete with accessory text. Reduced-transparency and
unsupported-filter fallbacks remain opaque. The live-diff pill uses its own opaque elevated theme surface and does not share the rail glass.

Newera defaults belong to the Workbench entry's preference runtime: standalone on,
embedded off when no valid user choice exists. Defaults are not stored on startup;
explicit choices win and the density projection still gates the touch presentation.
Preference reset and malformed-record fallback use that runtime's entry defaults.

Newera触控时间线浮动回底部控件：箭头与运行点共用ScrollToBottomButton的玻璃外壳和44px圆形触控区，图形放大15%并增强笔画；沿用主题Newera材质及减少透明/强制色彩/无滤镜实底回退。两态不得改变锚点、尺寸或滚动语义；桌面与关闭Newera的呈现保持。

Composer四角保持对称，共用shell radius token（普通16px/Newera28px）；附属rail以同半径互补圆弧mask适配shell肩部。结构tuck等于radius且padding/负margin相消，材料扣除shell范围，仅1px边界覆盖；不得压平shell上圆角或用整块双层玻璃掩盖接缝。验收包含实际像素覆盖、四角相等和编辑器/内容间距不变。

Composer输入辅助菜单焦点策略独立于模型/权限业务和Radix基础设施：仅触控/笔且编辑器正在聚焦时保留其焦点lease及原生选区，取消自动focus转移；键盘/AT或非编辑入口仍由Radix导航。触控期间继续输入/Escape可关闭、ArrowUp/Down显式进入菜单；外部关闭/卸载不得迟到抢焦点。该策略按props可插拔，不冻结视口、不伪造光标、不承诺控制系统软键盘。

附属rail背景在结构tuck之外仅覆盖1px材料接缝（coverage-composer-material-seam），到输入框边框下方，避免两份伪元素背景的外/内缘留下亚像素未覆盖带。验收测材料绘制边界，不能只比容器bbox；独立材质与无缝约束保持，结构tuck按完整对称圆弧计算。

非空附属rail与shell连接处不重复绘制shell顶部边框/内侧高光；空rail恢复独立输入框完整边界。用户确认本轮对象为静止时中间横缝。

### Mobile Composer content bounds

OpenCraftComposer owns a local editing-focus presentation session, independent of
draft and auxiliary menu open state. Only entering the editor starts it; toolbar
and owned portal focus may retain it until focus leaves. Empty single-line Add
open/close, submenu and keyboard navigation keep the same shell/anchor geometry.
Radix close cleanup (including a host dialog continuation) finishes before the
session checks its final focus destination. Content/attachments and active
submission states keep their existing full presentation, with one EditorView.
Dictation is an input interaction, not an implicit text-editing session: an empty
unfocused Newera composer gives its existing row to voice controls, including
preparing/listening/transcribing/failed/retry. Existing text or editing retains
the expanded geometry. Selection reservation records the activation entrance without
focusing the View; pointer entrance is captured independently of native button
focus, and keyboard activation uses its focused control. Cancellation restores
that entrance after inert is revoked. Focus settlement follows the final React
DOM projection on the next animation frame and is canceled on replacement or
unmount; controller and draft identity reject stale restoration.
Successful final text returns focus to the same editor only after the editable
projection commits. No recording state is inferred from CSS or a second draft.

The dictation footer is a presentation consumer of the current transient
interaction. Its independent module buffers at most 512 valid numeric samples,
coalesces paint requests and releases the subscription, resize observer and pending
frame when the source changes or disappears. It does not capture audio or write
draft content. Stop delegates to finish, retry to the failed transaction and send
to the existing Composer submission owner. Duration updates only while listening;
startup uses shared neutral progress and failure retains the existing retry slot.



The existing Radix model-menu surface owns the available collision height, including
its padding. Its shared inner grid and both scrollable panes have a zero minimum
height; a narrow single-column presentation allocates shrinkable tracks to the
model list and model details. Details (including every declared reasoning effort)
remain reachable by native scrolling, rather than extending beyond an outer clip.
The menu keeps the existing auxiliary-input focus policy and viewport authority.

Generated placeholder copy is positioned against its editable paragraph, bounded
by the editor column. Empty, unfocused Newera inputs ellipsize that copy on one
line; expanded inputs allow wrapping inside the editing area. The placeholder is
not document content and does not change native selection, draft or input size.
`smoke-composer-mobile-layout.ts` exercises initial Home chrome with long English
and Chinese copy, short/panned keyboard viewports, reasoning selection and desktop.
Chromium synthetic viewport evidence does not substitute for iPhone device testing.

Chinese elapsed durations use the shared chat-core formatter with a space between each number and unit (for example `3 分钟 17 秒`), including work dividers and tool durations. Other locales retain their native narrow-unit formatting.

### Activity disclosure spacing ownership

Activity rows (reasoning, command groups and image views) declare a stable
`data-conversation-row="activity"` at the renderer boundary. Lists project that
role through a direct row or one known timeline slot and use the grouped-item
gap between activity rows. The role does not depend on open/closed, running,
settled or streaming state. A prose/work section containing nested activity is
not itself an activity row; its content boundary keeps the list's content gap.

The list alone owns external row spacing. The shared disclosure owns its
summary and detail region, including readable internal padding. Opening only
grows that region; neither it nor a nested disclosure can change ancestor or
sibling margins, unrelated row sizes, order or DOM identity. The same contract
holds during animation, streaming growth and rapid reversal. Closing restores
the original geometry without leftover detail space. Viewport anchoring may
move the viewport and following rows naturally move down, but neither is a
spacing authority. Do not use descendant open-state selectors to reclassify
rows, or replace the regression with per-reasoning overrides or delayed layout.

`scripts/smoke-activity-spacing.ts` samples actual Conversation geometry before,
during and after mouse/touch disclosures, including first/middle/last reasoning,
image details, nested commands, streaming, rapid reversal and reduced motion.
The regression is sibling-boundary and unrelated-size stability, not constant
absolute screen coordinates while content grows.

### Conversation process visual ownership

Interactive and passive process records share metadata typography and an
ActivityIcon rail. Context compaction is a process record, not reading prose,
and must consume ActivitySummaryRow rather than inherit chat metrics. The
scoped activity stylesheet alone owns optical size/stroke; renderers supply
unchanged glyphs and content. Reading preferences retain control of expanded
reasoning/documents. This visual contract does not reclassify spacing roles or
change compaction lifecycle. See [activity visuals](../design/ui/activity-icons.md)
and `scripts/smoke-conversation-activity-metrics.ts`.

## First-submit pending conversation

After the first submit, the pending conversation consumes the immutable SubmitIntent and reuses UserMessageBlock, the shared thread width, viewport and top inset. It renders the original text through the normal document renderer and lists every submitted attachment; attachment-only input has no fabricated “New task” text. Shared bubble colors and chat typography apply before and after the server binds the Thread. The root supplies the current render theme and resource context, without fetching identity or deriving an author from the current account. The pending status and retry remain owned by the existing draft submission phase; this presentation does not create Threads or replay accepted first Turns.


### Bounded history recovery

A paginated provider may explicitly advertise `initialTurnsPage: true` and
`boundedRecovery: true` in its version-1 `opencraft/resume-history` capability.
Resume then returns the full initial page, avoiding a second Turn list and one
Items read per Turn. Older history is user-driven by default; the explicit legacy
background-drain option remains available to non-interactive callers. Navigation
seeds its loaded window and starts enumeration at the older boundary, not at the
tail already read by Resume.

`ThreadView.historyCheckpoint` is a provider-owned epoch and native sequence,
independent of connection generation. A capable provider can return unchanged,
append or replace. Unchanged keeps the exact transcript array while control state,
permissions and stream ownership still reconcile. A gap/rewind/new epoch replaces
the old window, preserving observations made during the request and unresolved
admitted work through `reconcileRecoveryWindow`. Cached running status alone
cannot override a terminal snapshot or retain an old disjoint canonical range. The older cursor
exposes skipped history. Old-page results are fenced by the Resume context and
connection generation. A binding keeps a weak immutable projection cache across
Replica source replacements. The V3 compatibility Replica epoch remains honest
about its connection-local revision model; it is not a durable server journal.

Recovery navigation caches bind to provider epoch **and nextSeq**, so unchanged
reconnects retain the index while changed history revokes its completeness.
Enumeration checks that version before publication; a superseded read cannot
mark newer history complete. Discovery begins when rail/search calls prepare,
not merely because a conversation is retained in the cache.


### First-submit Thread handoff

A successful creation receipt retains the immutable submitted message in the existing account-scoped display continuity service before Draft promotion. The handoff is synchronous, memory-only, bounded to 64 Threads and keyed by Host/Thread. Pending presentation and the retained message share submittedMessageDisplay. A newly mounted Thread keeps this paint-only message through an empty authoritative baseline until a canonical user message arrives, without a cold-history spinner or an extra syncing notice. Real recovery errors remain visible. Old cold Threads still use normal recovery presentation. Account changes replace the service and discard all transient handoffs. Preview data never authorizes commands, acknowledges reads, restores Replica cursors or persists unconfirmed input; Resume/Replica and first-Turn retry ownership remain unchanged.

OpenCraftComposer selects its layout from composition: context chrome requires stacked context, input and footer rows, independent of whether the draft is empty. Composers without context chrome retain the automatic single-line empty touch presentation. Focus alone does not change either policy. Model and permission controls belong to the normal-flow footer, whose real width owns progressive disclosure; they are not absolutely projected into the context row. The same editor, selection state and menus stay mounted across typing, clearing and viewport changes. Draft and Conversation share Shell floating chrome, so the Home does not retain a separate opaque toolbar band above the keyboard.
In short visual viewports, the Home grid reserves the Composer’s measured content height instead of fixed hero/composer row minima, keeping the send action above the keyboard.

### Recovery technical details

Cold and retained-history recovery errors expose a collapsed native details
panel. Runtime composition projects the existing transport/activation/history
owners into an allowlisted presentation snapshot; it does not schedule retries.
Connection failures carry the same local attempt ID as the server diagnostic
report, a fixed occurrence time, socket phase/cause and optional close code.
History/activation errors expose only a bounded machine code (or UNCLASSIFIED)
and local observation time, never an error message, stack or payload. Runtime
and transport states report current observations; recoveryPolicy describes the
transport's existing automatic/manual classification, not proof a retry ran.
Navigation fences expanded/copy state; successful authoritative recovery removes
the panel. Copy uses the shared clipboard helper with legacy fallback and an
announced failure. Narrow and themed layouts wrap technical fields while retaining
history, scroll and drafts. Protocol mismatch still requires an update rather
than a retry loop. The clipboard-only package export avoids importing renderers
and their styles for this utility.

## Web search activity detail projection

The shared tool detail formatter owns only display-field selection and compact
search text. It preserves the current nested action envelope, operation aliases,
query/pattern/URL precedence and existing hostname/first-query helper contracts.
Ordered site facets and ordinary punctuation are presentation compatibility data.
The presenter continues to own phase, summary, grouping and expandability; the
Timeline owns protocol projection and call identity. A detail string neither
executes a search nor authorizes or opens a resource. Web and Native consume the
same pure projection.

## External conversation presentation and history reads

Trusted local application composition may provide `conversationPresentation` to
both WorkbenchRoot and an embedded App. It receives scoped Host/Thread facts and
existing metadata-read/fork actions, and contributes a subtitle and content before
or after the Composer. Core does not interpret product channel metadata, disable
the Composer, change delivery, or grant fork permission. The product owns its copy
and the decision to opt a conversation into visible history refresh.

`AppServerThreadRuntimeLease.refreshHistory(signal)` is a read-only operation for
resumed message-window history. It skips disconnected, non-authoritative, streaming
and pending-command states; it never sends Resume or acquires execution ownership.
The coordinator serializes it with older-page loads, reads metadata first, and
loads a fresh tail only when the metadata revision changes. It retains observations
received during the read. Connection replacement, released ownership and abort
retire late results. Existing initial-page, legacy and bounded-recovery paths remain.
The Web hook polls every five seconds while visible, checks immediately on return,
backs failures off to sixty seconds, aborts on conversation retirement, and leaves
the transcript, draft DOM and reading position mounted. It is opt-in rather than a
second automatic refresh policy for all conversations.

### In-progress recovery observations

The existing recovery owner also projects read-only progress while a connection
or a conversation is still recovering. Connection, initialization, queued history,
active history reads, retry backoff and manual stop are separate stages. A Host
snapshot carries connection progress; each resident Thread carries only its own
history progress. UI never substitutes background Thread work for the current
conversation. Timestamps, actual starts, the scheduler's retry deadline and a
bounded machine-code failure are local metadata, with at most twelve stage events.
A visible recovery notice and cold-history surface expose elapsed time and a
collapsed copyable report before failure as well as during automatic retries.
The presentation clock pauses in background tabs and never schedules work.
Authoritative recovery removes the notice; invalidation fences late observations.
No remote error text, content, endpoint or credentials enter this report.
A fresh work item after a terminal failure starts a new history observation;
its correlation ID and attempt count cannot inherit the completed report.
Coalesced retries of an active work item still share the original observation.

### Product desktop composer shortcut

The desktop panel adapter owns availability and launch authority. Installing it does not opt the workbench into a composer shortcut. A containing product may explicitly enable `WorkbenchPresentationPolicy.composerDesktopEntry` and include `opencraft.cloud-desktop.open` in its panel actions; full and generic embedded presentations leave the shortcut disabled by default.


## Owned Composer naming

The shared editor lives in `@opencraft/composer-editor` and exports
`OpenCraftComposer`, `OpenCraftComposerHandle` and `OpenCraftComposerProps`.
Its DOM/style namespace is `opencraft-composer`. The naming migration changes
no draft, selection, queue, submission or lifecycle ownership. Runtime consumers
and existing smoke selectors move together; Codex AppServer wire identifiers
remain external integration contracts.

### Owned projection metadata identity

Internal message projection metadata uses the `__opencraft` prefix. Normalized
message writes canonicalize only the five known saved projection aliases
(message kind, source item ID/IDs, turn-params marker and steering status).
Readers accept the exact legacy aliases for saved data, with canonical values
taking precedence; unknown external fields and native AppServer formats remain
unchanged. Message identity, acknowledgement matching and display policy retain
their existing owners.
