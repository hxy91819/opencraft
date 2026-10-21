# 工作区不变量

## Internal projection metadata identity

OpenCraft message projection writes use `__opencraft*` keys. The five exact
legacy aliases remain readable for saved snapshots; canonical values take
precedence. Normalization removes only those legacy aliases from newly derived
message payloads, preserves opaque fields and never mutates the saved input.
Source identity, steering acknowledgement and native protocol parsing retain
their existing behavior. Compound-command projections use the same canonical
source-item key as message projections.

## Floating material ownership

Shared floating surfaces consume design-system `material.web` and theme-owned
neutral frost roles. Backdrop color may show softly through the panel; a brand
fill or page-wide blur cannot substitute for glass. Menus/search are denser
than panels; circular touch chrome has inset-only shading. Geometry, Radix
focus and modal lifetime retain their owners. Solid accessibility/unsupported
filter fallbacks and explicit extension popover surfaces remain readable.
See the workbench language and `scripts/smoke-frosted-materials.ts` for real
consumer, backdrop and fallback verification. Native appearance is unchanged.


## Floating sidebar presentation boundary

Shell owns visibility, live width, mobile progress and content identity. The
floating container projects those ports into stable header/body/footer slots;
ordinary prop and width changes preserve drafts and mount identity. Exit presence
immediately becomes inert, aria-hidden and pointer-disabled. Desktop entrance
translates the surface by -8px while its header counter-translates, then settles;
exit translation keeps opacity. Reduced motion skips settling. Mobile depth
consumes the same Shell progress, clamps 90–100% scale and 45–100% opacity, and
adds no separate exit animation. Its stationary wash remains a sibling outside
the scaled layer, consumes the same progress from 65% to zero opacity, and stays
transparent in reduced motion; Shell CSS retains material and hit-test ownership.
Existing resize transactions own bounds,
keyboard/default width, commits and cancellation; the floating resize port cannot
collapse the sidebar.
Other Shell, navigation, style and spring implementations retain their owners.

## Discrete slider fill

The shared track owns capsule clipping. Its selected range has a square inner
edge beneath the circular thumb, so the accent fills the entire track to the
thumb without a rounded notch. The range end must coincide with the **actual
thumb center**, including Radix's radius-based in-bounds offset at each stop.
A raw percentage aligns only at the midpoint: use the selected fraction and the
shared thumb-size token to correct the logical end margin, so density changes
and RTL retain the same geometry without another DOM measurement owner.
Radix retains value, pointer and keyboard ownership.

Visual regression checks measure fill end versus rendered thumb center at every
stop and during held preview, with a subpixel tolerance. A CSS-property assertion
or screenshots of one favorable stop cannot establish this invariant. Preserve
a failing pre-fix case; inspect near-start, middle and near-end output in addition
to theme/density/DPR coverage. `scripts/smoke-reasoning-slider.ts` verifies the real
Composer consumer and keeps per-stop screenshots and geometric samples.


## Composer input action icons

The shared voice action consumes the design-system composer input icon role:
20px at regular density and 24px at touch density, including the unavailable/error
glyph. Density changes the vector canvas only; the existing centered button,
44px touch target, Composer height and dictation lifecycle retain their owners.
Home and Conversation consume the same action. Real-component verification
covers narrow/wide, light/dark/custom themes and recording transitions; browser
emulation does not establish iPhone microphone or recognition acceptance.

## Optional conversation overview

`features/conversation-overview` owns the removable Appearance setting, entry,
attention ordering and latest-two-turn cards. A local read-only MiniChat projects
shared ChatDocument syntax into static miniature message bubbles and assistant
prose. Links are inert labels, media are text placeholders, and code/math stay
static; no HTML, media loading, full chat runtime or Composer is mounted. Only
the preview canvas is scaled; the separate card title/status and touch targets
retain normal UI metrics. The outer card owns navigation and retry remains an
independent action above it. Thumbnail clipping is bounded and does not create
nested scrollports. Its installation preference is
off by default. The entry uses a lightweight preference hook; Settings, grid
and card styles remain demand-loaded. Shared typography utilities and the
Shell's header action appearance avoid adding another initial style owner.
Overview notification consumers import the stylesheet-free context port;
the existing provider remains the only notification/history presentation owner.
Consumer imports must not duplicate typography CSS in either Headless or
independent website release startup graphs.
Mobile renders one entry immediately before sidebar search;
compact navigation projects that same action. The directory and its Host/auth
admission remain authoritative. Cards are keyed by Host and Thread, never title.
Review/error, unread, running/active-goal, pin and recency determine the default
order; an explicit recency sort is available. Only visible foreground previews
read summary history, at most two concurrent requests per Host; active previews
catch up every four seconds. A hidden/closed/revoked surface cannot publish a
late reply or queue further reads. The overview never resumes Threads or
acknowledges their results. The covered conversation suspends presentation
activity, preserving its DOM, draft, scroll and remote execution. Selection
uses the existing navigation owner and dismisses only after successful commit;
failure leaves the grid and preview intact. Browser validation uses the actual
Shell/setting/overview and synthetic admitted preview sources, without claiming
real employee or iPhone acceptance.

## Tasks V1 editor continuity

One activation-scoped TasksEditorSession owns dirty task, inline-create and
progress drafts. Quick editing, full details and conversation navigation consume
that owner; a clean task reopened after a remote update reads current content.
Content CAS conflicts remain visible, and posting progress never rebases or
overwrites a content draft. A retained progress eventId is reconciled by exact
read across lost acknowledgements before any retry.

Radix owns quick-edit focus/dismissal and full-detail modality. Detail close
uses the same accessible X icon at every width, with a localized hover title
and shared icon-button hit target; closing and busy-state behavior stay Radix-owned. Wide details
place activity beside content; narrow containers switch the same mounted inputs
with content/activity tabs. Metadata uses labels above controls on phones.
Column creation captures only a title in place, respects IME composition, and
keeps its stable ID until the authority confirms creation. Card summaries show
only available metadata and the latest explicit progress; conversation activity
never changes the business status.

## Sidebar Server filter continuity

The installation UI preference owns the Server filter's stable ID and display
label. Refresh, missing rows and physical reconnect never reset it to all Servers.
Within the same recipe and authorization scope, loaded rows retain identity and
placement through offline/reconnecting phases; only navigation and mutation
availability change. Logical phase transitions update controls immediately;
ordinary runtime notifications do not repaint the catalog. Cached management
`open` cannot bypass reconnect backoff. Ready refreshes the catalog. Explicit
removal, disablement and authorization/recipe changes still revoke cached rows.

## Mobile Sidebar theme surface

The mobile drawer owns one theme Sidebar/window composite. Context children do
not replace it with main-content surfaces; sticky headings and the floating
header use the same opaque composite to cover scrolling content. Changing theme
or mode updates every layer without remounting navigation. Desktop material,
geometry, scrolling and gesture ownership remain unchanged.

## Sidebar scroll ownership

SharedSidebarContent owns scroll receipts for its logical content throughout
AppShell's lifetime. Shell supplies an explicit keyed external viewport when
mobile layout scrolls outside the portal; descendant DOM receipts continue to
cover desktop lists. Layout coordinates are independent. A new viewport restores
its receipt in layout effect before paint. Empty, detached, hidden or exiting
viewports cannot overwrite receipts with clamped zeros; a deliberate scroll to
zero in a visible viewport is valid. Hidden selection updates do not auto-scroll.
No new persistence, polling or drawer keep-mounted policy is implied.
Acceptance: `OPENCRAFT_SIDEBAR_SCROLL_ONLY=1 npx tsx scripts/smoke-mobile-sidebar-gesture.ts`
uses the actual AppShell/Sidebar and verifies reopen, zero, quick reversal,
hidden selection updates and desktop/mobile handoff in light/dark/reduced motion.

## User message sender display

Web/Electron show each user message's verified employee `loginName` above its
content, with a 20px circular photo beside the small muted label aligned to the end.
The 企业身份 plugin resolves the photo through the trusted identity-avatar contribution;
failed images retain a same-size person icon. Attachment-only messages use
the same label. Unknown or absent senders leave no label. The label consumes
the individual message snapshot, never the current footer account or Turn author,
and is excluded from copied message text and native model input.
For a locally submitted message only, the runtime captures a verified account's
presentation hint before publishing the optimistic message. The immutable hint
is keyed by exact client message ID and survives acknowledgement in that runtime;
explicit server sender (including null) wins. No current-account fallback applies
to restored history. The bounded in-memory hint is neither a command credential
nor persisted provenance.

## Queued-message authors

Each queue entry displays its own submitter photo in the leading drag control,
with fixed geometry and a neutral fallback. No decorative return arrow is shown
there; action icons retain their own meaning. The shared Composer receives generic
name/avatar URL values resolved by the 企业身份 contribution. Server sender, including
explicit null, takes precedence over exact-client optimistic hints. Current-account
changes, edits and reorder cannot reattribute old entries. Error/recovery warnings
and accessible pointer/keyboard sorting remain available.
The drag target expands into existing spacing while the desktop photo and text
stay fixed; touch targets occupy non-overlapping 44px rows. Hover/keyboard focus
reveals the grip in the avatar slot without adding a permanent handle column.

## Queue modified-Enter shortcut

In Queue mode, Cmd/Ctrl+Enter keeps draft content first: text, attachments,
context and provisional input use the existing inverse submit action. An
unsendable draft is not empty. Only an empty ordinary draft delegates to the
visible queue head's existing Steer/Send action. It never skips an unavailable
head or bypasses Host readiness, atomic capability, reconciliation or unknown
delivery. Queue edits and dictation keep their original paths. Autorepeat and
concurrent queue actions cannot consume additional rows; late completion cannot
clear a different conversation's input. Mobile software Return remains newline.

## Tasks View

- 概览只保留标题与任务操作，不展示标语或全局统计行（包括手机筛选展开时）；状态列计数与负责人/项目/逾期筛选保留。

- TSK-01：任务属于插件 View，Sidebar 与应用 Router 拥有呈现和会话导航。列表与看板读取同一批任务；任务/关系表为 tasks/task_conversations，v2的task_members仅为责任目录；没有独立卡片/列权威。
- TSK-02：六个业务状态由用户维护；原生会话活动单独读取，未知不等于空闲，空闲不等于完成。拖拽不触发执行或中断。
- TSK-03：固定工作台后端拥有 SQLite；聊天 Host 切换不改变数据库。多会话关系引用稳定 Server/Thread，允许跨 Server 与多个任务共享会话。旧卡片不迁移、不删除。
- TSK-04：插件激活拥有控制器和草稿，View 消失清理观察者，返回保留草稿。迟到读取不能覆盖写入；事务 revision 防止并发覆盖，冲突保留输入，明确载入最新内容。
- TSK-05：容器宽度不超过 600px 时展示共享 SegmentedControl 与单列；宽屏六列。状态和视图按钮沿用共享 toolbar 外观，触摸区扩展至 44px。各列滚动位置保留；看板整卡可启动拖动，动作按钮独立，触屏普通滑动保留滚动、长按激活；列表保留手柄启动，两者保留键盘手柄。拖动预览不被列裁切，跨列落下以起始revision提交状态/邻居，取消不写入。宽屏列与吸顶标题使用主题拥有的不透明 surface，滚过的卡片不得透字；窄屏继续隐藏重复列标题。真实长列遮挡与主题/断点连续性由 `scripts/smoke-tasks-column-scroll.ts` 验证。
- TSK-06：详情是采用共享模态视觉契约的 Radix 弹窗卡片；宽容器显示属性栏，窄容器堆叠同一组字段并在顶部保存，宽度变化保持输入节点。进入聚焦标题而不唤起手机键盘，点击外部、Esc 或关闭按钮收起，保留各任务未保存草稿与原 revision。模态背景不可交互；关闭恢复概览原节点/滚动及仍有效的入口焦点；不添加另一套浏览器历史。看板仅显示标题、活动摘要和一个会话捷径，列表使用独立紧凑行。写入期间禁用编辑和关闭，异步会话验证在 View 关闭后不能关联到新草稿。
- TSK-07：任务进入原生聊天只准备草稿，用户发送才创建会话和执行；同 Server 项目进入执行位置，跨 Server 不复用项目/目录。确认 Thread 回执后关联，首次 Turn 失败不丢关系；关联未知结果只核对和重试关系，不能重新执行。客户端交接记录按产品/账号隔离，SQLite 始终拥有任务和关联；账号撤销、销毁或新导航隔离迟到工作。
- 执行连接行的宽屏动作与下拉控件底边对齐；窄屏沿同组控件堆叠、按钮靠起始边，保留共享触控尺寸与原 DOM，布局不改变新建会话语义。真实几何和换宽连续性由 `scripts/smoke-tasks-team.ts` 验证。
- 看板的一条会话捷径将图标、标题、已知原生活动和进入箭头合并为一行，不重复数量/Unknown文本；长标题单行截断，完整标题保留提示及可访问名称。缺少标题或读取回退的Thread ID显示本地化打开会话，未知活动仍保持未知。多关联仅补充其余数量和查看全部入口，由现有详情拥有关系管理；直接行仍消费原Server/Thread导航，不触发卡片详情或写入。共享按钮、metadata排版和主题token拥有外观与键盘焦点，触屏目标至少44px。
- 看板卡片负责人仅为底部左侧头像，位于会话摘要/入口之后；姓名通过提示和图像可访问名称呈现，列表/详情继续显示姓名。头像复用现有照片/缩写/未分配回退，不改变分配、登录、权限或个人筛选。
- TSK-10：负责人/优先级/截止日期由任务事务保存，成员标识显式维护、不等于授权。旧客户端省略属性仍保留，Agent CLI与UI复用唯一authority与CAS。Skill仅摘要常驻、正文按需，CLI分页摘要不把整库注入上下文。
- 验证入口：`tests/tasks-*.test.ts`、`scripts/smoke-tasks-workbench.ts`。实际产物与平台验证状态见 Task Pack。
- TSK-08：已有会话的顶部“…”位于右面板按钮左侧，通过固定任务 authority 设定多个归属任务；使用稳定 Server/Thread 身份，不把当前聊天 Host 当任务库。每个关联行单独反馈写入，冲突或未知结果重新读取而不重放。草稿不显示入口，切会话/账号关闭旧选择器，解除关系不改变会话执行。
- TSK-09：会话顶部菜单的重命名与置顶操作消费已有 ThreadTitleWriter 和原生 thread management port，与侧栏共享持久状态。只显示 Host 支持的动作；不依赖 Tasks 插件可用性来授权会话管理。重命名使用共享 ModalSurface，失败保留输入、处理中禁用重复提交；置顶失败留在菜单可重试，不伪造已成功状态。菜单/编辑会话按账号、Host、Thread 隔离，切换撤销旧 UI。


## Link label action ownership

A link owns its resource action. Its label retains Markdown formatting and image
children but suppresses text decorations that would create nested interactive
mentions. The document compiler preserves target/title and source-range contracts;
the renderer owns target safety, streaming activation and semantic open intent.
Changing node construction must not create a second resource or identity owner.


## Conversation recovery feedback

- Conversation background synchronization uses the shared neutral loading ring in
  its existing overlay slot, with screen-reader-only status text and no badge
  surface. Reconnection/failure copy and retry actions remain visible. Retained
  timeline, scroll and Composer identity do not change. Verified by
  `scripts/smoke-thread-loading.ts`.

## Conversation work-status entry motion

Conversation presentation owns entry eligibility. Its initial snapshot, a changed
Host/Thread and paint/sync recovery through the first authoritative live snapshot
are a restored baseline. Existing activity content and work-status dividers are
visible at their final opacity/height on that first commit; DOM mounting does not
mean work just started. Subsequent live insertions and manual disclosure opening
retain their existing entry motion and reduced-motion behavior. This changes no
Turn clocks, provenance, history persistence or execution state.

## Turn completion reminders

- TURN-NOTIFY-01: Turn completion reminders are a shared OpenCraft platform
  capability, independent of standalone/embedded entry, product brand and engine.
  Only live terminal Turn events can trigger them; history and assistant phases
  cannot. A reminder cannot change execution, queue, draft or navigation until
  the user clicks it.
- TURN-NOTIFY-02: Explicit opt-in and browser permission are separate authorities.
  No automatic permission prompt at startup/completion; disabled, revoked or
  unsupported delivery is harmless. Async completion is fenced by current
  permission, preference and Application lifetime.
- TURN-NOTIFY-03: Clicks focus the originating browser Client and reuse the
  existing conversation navigation. Notifications disclose no answer text.
  Page-open notifications must not be presented as closed-browser Push delivery.
- TURN-NOTIFY-04: Notification display context belongs to the same Host/Thread/Turn.
  It quotes the Thread title and latest accepted user message excerpt, never the
  active View's unrelated text, a draft or a queued future request. Existing live
  traffic/history can supply display context without triggering reminders or
  introducing completion-time reads; hidden attachment instructions stay hidden.

## Employee account entrance

- The 企业身份 plugin owns stable browser-loaded `directory.example.com/photo/150` URLs for
  employee photos. The account menu/footer and each verified message sender use
  the same directory lookup; sender identity never follows the footer account.
  Failure preserves fixed geometry and the verified name/default visual.
  Account changes replace URLs; plugin unloading removes the sender resolver.
  Foreground revalidation must retain loaded avatar DOM and same-account display
  metadata while preserving authenticated expiration. Display-only caches belong
  to 企业身份, are bounded in memory, and clear on confirmed revocation/account change.
  Warm row remounts reuse metadata; notifications and connection changes revalidate.


- A configured enterprise OA identity provider automatically projects the verified
  request identity into the existing Sidecar footer. The label is the employee
  login name, or “员工身份” when anonymous; clicking opens details and refresh.
- Footer precedence changes presentation only. Product account credentials and
  resource authority remain independently owned; equal precedence is rejected
  and unloading an employee provider restores the product entrance.
- No fixed employee login URL, synthetic identity or unsupported logout control
  is presented. Authoritative 401/expiration clears the footer; details remain
  available for refresh. Covered by `tests/enterprise-identity.test.ts` and the real footer
  controls in `scripts/smoke-enterprise-identity.ts`; live gateway evidence is separate.

## Embedded panel host presentation

- Product-only draft heading decoration and its responsive rules belong to the
  explicit embedded product and are composed into its existing ShadowRoot. Shared
  styles do not select product artwork or reserve space for that artwork.

- Embedded panel viewport and its complete DOM content reuse the current conversation's panel service,
  renderer registrations and resource lifetime. Host commands must match the
  current runtime, Bot instance/Profile and conversation owner; unknown tabs or
  actions cannot bypass the product presentation policy.
- External container layout is explicit opt-in. Expo and standalone Web/Electron
  reuse the complete original toolbar, menus and content. Expo adds only host
  geometry and native shell controls/input, without a replacement tab manager,
  new Applications or per-tab WebViews.
- Host geometry uses available container space and the shared panel minimum/Chat
  reserve. A single embedded parent allocates sibling grid columns; Chat AppShell
  consumes its own containing viewport. Only narrow/full-width mode replaces Chat.
  One transient motion owner follows held input and completes/interrupts service
  intents; it does not own tabs or create a second persisted open state.
  Overlay makes only Chat inert; the same DOM plane remains accessible for
  panel content. Resize/full-width changes preserve tabs and drafts; closing
  releases resources through the original service lifecycle.

## Native conversation pinning

- PIN-01：置顶由原生 Server 持久化；OpenCraft 不维护第二份数据库或浏览器置顶集合，DSH 不支持时不补本地 fallback。
- PIN-02：接口准入不等于原生能力。当前连接成功发现支持后才显示置顶菜单；暂时失败不冒充不支持或空置顶列表。
- PIN-03：置顶读写只处理元数据，不 Resume/Start；Hermes 明确携带所属 profile，身份歧义拒绝写入，压缩链由 Hermes 自身处理。
- PIN-04：置顶目录返回完整摘要、独立于近期窗口；侧栏去重后单独分组，待处理优先于置顶且去重；置顶不占十条最近区预算。刷新/重连从后端重新读取。
- PIN-05：同一会话写入串行；操作前列表不能覆盖操作后状态；连接撤销拒绝晚到结果且不重放写入。菜单复用现有受控互斥 owner，不拥有存储或轮询。
- PIN-06：下游产品站点的外层会话侧栏只消费嵌入式 Workbench 投影的置顶状态、能力和动作；置顶会话不占近期分页名额，站点不持久化第二份置顶集合。

## Desktop input ownership

Desktop control presentation preserves the mounted control strip's geometry
while hiding and making it inert before current video/input readiness. Confirmed
ownership fades the shared action's solid decorative layer over 240ms; intent,
press feedback and reduced motion do not delay input retirement or cancel.

The mounted desktop interaction scope, confirmed backend grant and physical
gesture have separate lifetimes. Unknown mobile focusout does not prove leaving:
internal toolbar/media/editable handoff retains control; explicit outside presses
(including blank space), known outside focus, hidden page and window blur retire
it. The interaction owner never grants input or restores focus. Geometry changes
retire held input and queued samples without revoking the grant; old physical
contacts must lift before another gesture can start in the new geometry.
Managed-media native touch activation consumes a fixed Take command once on
single-finger tap release; movement, second contact, cancellation and capture
loss cancel it. It never emits a synthetic click or replays a compatibility
click. Ordinary toolbar buttons retain native click/keyboard activation.

Desktop visor shoulder masks preserve their exterior curve and world-space
origin while extending only the interior fill into the center background.
Independent raster edges must have opaque overlap, not a butt joint; moving
the entire shoulder to conceal a seam is not equivalent. Mobile and wide
container variants share this contract. Pixel regression distinguishes ordinary
rendering from simulated background-edge retraction; neither proves iOS Safari.

WSP-36 桌面输入补充：手势与坐标仅由媒体适配层一个owner写入，decoder显式关闭
原指针输出。观看缩放/平移不等于远端操作；捏合始终调整本地画面，只有确认授权
后单指点击/拖动与双指滚动才发远端输入。滚轮和触控滚动共用有界规则，双指按
同一帧采样，防止先后到达的事件造成错误分类。停止、失焦、新授权取消未消费帧、
按键和滚动；旧物理指针须抬起才可被后继授权消费。缩放后坐标从实际画面与留白
计算，不能拿Shell宽度当远端像素。手机文字入口在显式操作及确认授权下创建，
候选词不发送，确认一次发送一次；撤权销毁该DOM而非复用给下一次输入。
Take在用户激活时先取得媒体焦点而不提前启用输入；平台只读焦点归属在请求与确认
两端检查，迟到授权不得再次聚焦。文字事务短于控制授权：远端点击/拖动/粘贴前先
将焦点在Panel内交接，平台同步确认的组词先发到原目标；其余候选随原事务退休。
旧输入DOM不得在同授权下后继输入复活；交接中撤权/换代也不得发送原指针按下。
Surface消费Shell的同一逻辑active投影：隐藏立即退出模拟光标覆盖层及监听，不能
等待触屏不保证的mouseleave；隐藏中迟到光标形状只更新媒体状态，不能复活覆盖层。
本地控制光标资格复用输入授权投影与active，不另存控制开关；观看/申请中不挂载。
停止、撤权或失焦立即移除覆盖层与监听，并恢复普通鼠标；迟到形状或mouseover不得复活。
重新展开保留媒体连接但不抢焦点或恢复控制；只有新确认授权才挂载最新形状。
此规则不清除远端画面内已有的光标像素；重复启用不能清空仍有效的光标附件。
模型/真实decoder浏览器验收不等于iPhone系统键盘或原生执行器验收，详见
[桌面输入策略](../docs/cloud-desktop-plugin.md#pointer-viewing-gestures-and-mobile-text-input)。

Confirmed coarse-pointer desktop control may expose a relative trackpad through
the mounted media capability. The pad interprets gestures only; media owns the
same pointer position/writer, bounded scroll, text handoff and backend grant.
It never duplicates a connection or resumes control. A stationary single finger
holds the left button after 300ms, then moves relative to the existing cursor;
release ends the drag. Movement reaching 8px before the deadline cancels arming.
Tap, two-finger scroll/right-click and double-tap drag stay available. The timer
is fenced by gesture lifetime, grant and geometry, including reentrant text
handoff. A second finger cancels pending arming; after a drag starts it releases
the button and quarantines contacts without another click. Cancellation fences retained
contacts, and an idle pad cannot release a direct media press. Design System
places picture, controls and neutral theme-derived touch surface in disjoint
rows, consuming Shell's existing visual viewport height when keyboards contract
it. Direct touch and fine-pointer layouts remain available. This fits the page
picture rather than moving remote OS windows; synthetic viewport coverage does
not establish iPhone system-keyboard acceptance. The panel consumes Shell's
existing Composer/latest-turn reserve once. Its trackpad must remain hittable
through the real full-width Shell, with the same editor, draft and media; an
isolated media fixture cannot establish freedom from Shell overlay occlusion.
The pad is an exclusive input surface through Shell's existing
`data-sidebar-gesture="ignore"` ancestor contract. Touches beginning on its
children cannot also acquire sidebar movement. Full-Shell native-touch coverage
checks held/released horizontal pad moves and two-finger scrolling, preserved
remote clicks and ordinary-content sidebar reveal.

Local cursor feedback aligns the decoded image hotspot with the same input
anchor used by managed touch/trackpad movement. The decoder owns hotspot
subtraction; the adapter never compensates by shifting RFB coordinates. Real
decoder tests include nonzero hotspots and shape changes, not just visibility.

## SSH connection management

- SSH-01：部署后端数据库是管理连接的配置/凭据唯一 authority，字段和 revision/CAS 同事务；秘密只写不回读，密钥留在私有后端文件。未知或冲突 schema 历史保留原数据并拒绝写入。
- SSH-02：安装管理员会话同时保护 HTTP 与远端 WebSocket；每帧/回传及过期撤销不能只依赖握手。匿名本机通道拒绝所有 SSH ID；Renderer ID、同源或界面登录投影不冒充授权主体。
- SSH-02 地址策略补充：固定 HTTPS Origin 是默认公开策略；部署 owner 可显式选择不固定地址，但每个管理员会话仍绑定解锁时的 Origin。不同地址独立解锁，不能复用另一 Origin 的会话；HTTP 模式不冒称传输加密，不能因为域名可变而取消凭据、会话或主机身份校验。
- SSH-03：信任绑定端点、会话、指纹和期限；扫描不是认领。服务器/用户身份变更建立新 Server ID，不把旧会话身份重定向到不同机器。
- SSH-04：AppHost 是物理通道 owner；重连屏障先撤销旧认领、完成关闭再准入新认领。显式管理连接通过同一后端通道准入，不伪造 Client、不取得 Thread 或执行权限；建立失败清理资源后仍保留失败状态。设置页不停止远端服务，失联回执不自动重放业务或文件写入。
- SSH-05：Application 只维护后端只读投影，View 只维护当前编辑草稿、单一菜单和行级操作；菜单复用共享 surface/item 契约，不依赖控件内部 DOM 属性定位布局。旧查询、认证失败或取消结果不得复活已锁定连接；暂时无法发现不等于不支持。
- SSH-06：物理连接就绪、逻辑读取就绪与 Thread 交互订阅分开。已认证且 revision 匹配的显式 open 连接允许侧栏通过唯一 registry 取得目录 reader；不能改 autoConnect 偏好、切换聊天目标或 resume/执行 Thread，idle 配置不能擅自拨号。目录读取在连接前、连接后和发布前核对配置有效性与认证代次；锁定、停用、删除、替换及 logout/unlock 不接受旧准入的迟到结果。
- SSH-07：SSH Codex 目录热读在 Runtime 唯一入口使用原生索引，不隐式扫描修复；显式修复仍可覆盖参数，provider/source 默认筛选不变。已准入查询的加载、失败与成功空列表不得合并，停用查询不能冒充加载；失败只重试当前 Host 的读取，不拨号、不选目标、不激活 Thread。失败及物理 connecting/reconnecting/idle/error 保留同配置与授权作用域内的有效缓存和其他 Host 成功行；读取就绪不等于缓存展示资格，展示缓存不准入读取/执行。锁定、停用、删除、配置替换及授权代次变化不显示旧缓存。任务流最近区默认十行之外的已读取远端行通过明确更多入口展示，不冒称全量历史。
- SSH-12：自动连接重试按既有序列递增至 60 秒；只有持续就绪 60 秒才清零，短暂恢复不把频繁断线重置到 500ms。恢复提示遵守已排定退避，手动重试仍即时。瞬时连接状态不删除同授权目录缓存或改变列表身份、次序和几何；自动重试失败保持重连阶段，不反复切换错误/加载呈现。
- SSH-07 呈现补充：侧栏目录加载不渲染转圈、文字或占位行，既有历史的布局和 DOM 身份保持稳定；加载语义通过 `aria-busy` 保留，未完成时不显示成功空列表。目录失败保留对应重试入口；此规则不移除会话正文的加载提示。真实 Sidebar 明暗/鼠标/触屏回归见 `smoke:sidebar-thread-catalog`。
- Sidebar page reveal: Recent retains its ten-row display budget; click and a downward pull at the actual scroll boundary share the same page action. A pull may begin on rows or empty space belonging to the scrollport, while unrelated navigation controls stay excluded. Only explicit user intent advances it: mounting, resizing, background catalog updates and programmatic scrolling never auto-drain pages. A React transition owns the footer spinner/disabled state, without a second fetch owner or artificial delay. Existing rows and scroll position survive expansion, including when the selected row is newly revealed. Pinned paging and product grouping remain independent; exhausted Recent shows a localized end label. Passive input adapters respect native vertical scrolling, horizontal Shell gestures and reduced motion. This explicit pagination feedback is the exception to SSH-07's quiet background discovery. Verification: `scripts/smoke-sidebar-recent-pages.ts` (mouse/touch, light/dark, English/Chinese); browser emulation is not physical iPhone acceptance.
- SSH-08：管理目录恢复属于 Application/controller 生命周期，不依赖设置页挂载。手动重试、在线/可见恢复与周期读取共享单飞；完成后再调度，失败退避有上限，隐页/离线暂停，销毁清理并拒绝晚到回复。授权变更暂停后台读并撤销旧代次；显式操作后的核对不能复用操作前的旧轮询。尚无 SSH profile 时的管理读取失败仍有侧栏重试，不冒充成功空列表；正常后台读取无闪动，不支持/已锁定不冒充错误。读取不隐式连接、重连、切目标或执行 Thread。
- SSH-09：SSH 只拥有传输，不重定义原生 Thread 分页历史；共享 broker 唯一方法准入表同时约束执行、Runtime 与 UI，保留上游无关 metadata。准入不冒充上游实现保证；本机 store 与尚未映射的连接句柄不能被声明成远端能力。读取成功不推出写入能力，偏好不制造 Queue 等能力；跟进按钮和逆向快捷键仅选择可准入动作、不改保存偏好。不可准入提交在草稿/乐观队列收养前拒绝，草稿保留；后台读取也不得发出已拒绝的 queue/watch/search 方法。旧 Server 无声明保持兼容，畸形声明封闭拒绝。

证据/边界见下游产品工作区的 SSH 管理记录（不在本仓库），不以源码声明替代实际准入验收。

状态：实施及验证中。下表记录目标与责任，不把测试名称当成已运行的证据。最新结果在 [progress.md](progress.md)。

## Mobile sidebar gestures

Narrow browser Shells reveal the unified sidebar with a rightward touch drag from
content; a leftward drag dismisses it, following the iOS direction convention.
The Shell owns one progress MotionValue for direct manipulation, reversal and
settling. Short slow gestures return to the starting intent; distance or a
horizontal flick commits. Cancellation, multitouch and resize return to the
starting intent. Vertical scrolling, editors, horizontal scroll areas, selection,
menus and dialogs keep their own input; the outer 24px remains reserved for
browser/OS gestures. Ordinary buttons, links and clickable content (including
reasoning/tool disclosures and image previews) do not own horizontal input merely
because they are clickable. They may start a sidebar gesture; taps and small
unrecognized movement still activate the original control. A recognized swipe
suppresses its synthesized click without blocking the next deliberate tap.
An image lightbox or a genuinely overflowing horizontal gallery retains its own input.
Acceptance: `OPENCRAFT_GESTURE_CONTENT_ONLY=1 npx tsx scripts/smoke-mobile-sidebar-gesture.ts`
uses real reasoning, inspected/generated/sent-image renderers and CDP touch to
check held following, no activation on swipe, original tap actions, cancellation
and native input exclusions in light/dark and normal/reduced motion.
Mobile uses a page stack: the sidebar stays anchored behind the foreground page.
One progress translates the foreground and brings the rear layer from 90% scale /
45% opacity to its full size and clarity, with a left-center origin. A stationary, pointer-transparent theme veil fades
from 65% to zero with that same progress, stronger toward the foreground edge.
Light themes wash toward white; dark themes retain their own elevated surface.
Reduced motion disables the veil. It releases with panel presence/inertness. A stationary
full-viewport theme Sidebar/window material backs this animated layer while the
floating panel is mounted, including the top/bottom safe areas. The scaled
mobile panel surface is transparent: only the stationary owner paints the full
material, avoiding fractional-edge double compositing. Scaling/fading
content must never expose window-colored horizontal strips. The exiting/inert or empty portal
paints nothing when the foreground returns to its ordinary stacking order. There is no
horizontal sidebar entrance, blur, separate depth timer or inherited animated
variable. The foreground retains its full
layout width, round leading corners and theme elevation; the untransformed root
continues to own viewport/gesture coordinates. At least 64px of the page stays
visible for tap-to-dismiss. Per-frame progress stays in MotionValues. During floating presence the page
uses a fixed theme radius, released once the page has returned home; interpolating
its radius repaints the full foreground/shadow during each drag frame. Mobile
foreground opts into transform compositing while present, so nested masked
composer scrollers do not repaint against the viewport on each translation;
rear depth opts into transform/opacity compositing only for its mounted floating
lifetime and normal motion. Neither changes content identity or freezes updates.
The moving page disables CSS transition properties: the global reduced-motion
minimum duration must not add a second transition to each MotionValue write.
Do not publish inherited animated CSS variables through the conversation subtree.
`OPENCRAFT_GESTURE_COMPOSITING_ONLY=1` records a real held/reversing touch trace
and checks that steady movement does not repeatedly paint either Shell layer.
While open or directly dragging, the original page is
inert and its exposed strip is the accessible close action. Closing intent
immediately releases its ordinary header entrance, including Escape focus return;
retained exit presence must never block reopening. No screenshot clone or second
conversation tree is created. Desktop floating panels remain overlays.
Dock/overlay continue sharing the same DOM, scroll and drafts. Browser safe-area
insets reserve notch/Home Indicator space in the drawer and toolbar. Reduced
motion skips settling animation and sidebar depth, but still follows direct touch movement.
Selecting a conversation in the narrow browser drawer dismisses it immediately,
including selecting the current conversation again. Shell owns this presentation
policy; selection does not toggle or collapse a docked desktop sidebar. Group
headers and row menus remain independent controls and do not dismiss the drawer.
Evidence: `mobile-sidebar-gesture.test.ts`, `smoke-mobile-sidebar-gesture.ts`;
real iPhone Safari and native Expo remain separate verification surfaces.

## Unified sidebar scroll

On desktop, unified navigation remains independent of list scrolling: docked and
floating sidebars retain the 60px vertical rail. Buttons retain at least 44px hit
areas. In the desktop list column, the heading and its filter button stay fixed;
`.sidebar-activity-list` is the conversation scroll owner. Mobile uses the shared
native viewport described below, rather than a separate fixed navigation strip. Selection reveal targets that
viewport. Moving the shared content portals preserves its DOM and scroll position.
Evidence: `scripts/smoke-sidebar-thread-insets.mjs` (real AppShell/Sidebar).

Mobile navigation rows, including Home, scroll out with conversations in the shared native viewport. No Home-only sticky surface or top scroll offset remains; the floating New chat and settings actions remain reachable at the bottom. Desktop navigation is unchanged. Acceptance: FAB-only mobile sidebar smoke measures Home displacement against actual scrollTop and verifies it leaves the viewport while creation/settings stay fixed.

## Application navigation restoration

In the unified core Sidebar, application destinations and available Work tools
consume the same navigation actions in the desktop icon rail or mobile drawer stacked menu. They do not precede the
conversation groups in the list column or add a divider there. List controls and
conversation scrolling have separate slots; navigation restoration preserves
the list viewport and the existing application Router authority.

任务草稿保留：Application 级输入槽拥有原 Controller、File、预览与处理任务，View 只借用。桌面 20 个、移动端 4 个非活动页面的缓存淘汰不得删除非空输入；输入槽按 50 份非空草稿单独执行 LRU，空输入不计数，淘汰同时丢弃持久文档并释放附件资源。正在编辑或发送的所有者不可淘汰；全部受保护时拒绝新内容，不超限。侧栏完整 A→B→A 回到最后成功呈现的槽位，显式新 View 与 POP 仍独立。Scope promotion 必须更新无页面但仍保留的草稿；账号撤销清除全部槽位与目标缓存。验证：`test:task-draft-switching`、`smoke:task-draft-switching`。

浏览器草稿补充：任务输入槽由 ConversationDraftOwnerRegistry 保留，ConversationDraftContinuity 仍是唯一文档持久化写入者，不叠加另一套持久化写入者。Bot Composer 通过平台存储端口保存 document、context 与附件元数据，不保存提交回执、执行状态、临时听写或发送锁；存储按产品／账号和 Host + Conversation 身份隔离。只有显式内容编辑和接受发送后的清空写入存储，生命周期变化与卸载不能覆盖其他 View 的输入。账号作用域变化撤销并清除旧适配器，迟到写入不得复活旧内容；新应用实例绑定新账号。浏览器 File 字节及临时侧聊不在当前持久化承诺内；失效 Object URL 或未完成附件恢复为可移除、不可发送的文件卡片。验证见 `chat-browser-drafts.test.ts` 和 `smoke:browser-drafts`。

确定被拒绝的排队跟进由 Conversation Runtime 本地持有，尚无 Server 队列 ID；用户删除只撤销该本地记录，不请求 Host 队列删除，也不自动重发。投递结果未知的记录不得当作失败项删除或再次提交，直到同一 client message ID 出现在 Host 队列或权威历史中。提交中的记录不可删除，已确认入队的消息仍以 Server 队列 ID 删除。

历史记录只持有聊天引用，不拥有草稿的存活事实。启动与历史恢复必须先由 Host 配置、ScopeRegistry 和 BindingStore 校验/规范化，再让 Router 与激活层消费同一个目标；有效当前 entry 优先于跨标签页共享的最后使用偏好。失效 Draft 不按旧 ID 重建，已提交 Draft 经持久 alias 找回 Thread。Router 唯一写回纠正结果并保留 Settings/Extension 目的地；失效引用回到当前实际保留的 View 与输入，View 不能跨 Scope 复用。规范化为 REPLACE 的 POP 仍须被资源事务消费。

返回同一个保留 View 不依赖远端就绪：Chat、当前会话入口与 POP 共用本地呈现/后台续接语义，晚到结果受导航代次和释放约束；提交中的草稿仍拥有导航。侧栏只表达 `selectConversation`，不自行解释活动 Thread、pending 或设置页返回；重复目标合并、保留 View 复用与可见项早退都由导航事务决定。显式 `navigate` 不等于选择，不能按 Thread ID 合并独立历史 View 的输入。后台草稿准备、返回、POP 与提交转换共享 intent/释放/Router revision 资格及接受或释放路径；非活动草稿不得获得当前导航权。嵌入式 memory Router 不读写外层页面历史。责任与入口见 [Application Router authority](../docs/platform-architecture.md#application-router-authority)、`workbench-location-restoration`；验证使用 `test:application-route-restoration` 与 `smoke:application-route-restoration`，不将隔离 Host 替身验收冒充手机或完整账号启动实测。

## 工作区契约

| ID | 不变量 | 责任/验证 |
|---|---|---|
| WSP-36 | 云桌面标签属于 Conversation；短期观看连接属于桌面显式常驻视图；远端桌面与独占输入授权属于后端。隐藏/切换工具保留观看但立即撤销输入，关闭标签或更换 owner 回收观看，不影响 Agent；其他插件不隐式常驻。观看续期必须双端声明能力、后端重验身份并匹配确认，不能删除到期门禁、复用票据或重新接管。未接通真实适配器不发布入口；观看默认无输入，两项就绪与有效授权缺一不可，握手不能冒充首帧；关闭、换账户、取消后迟到结果只释放，不复活连接。自动恢复仅限 adapter 声明安全的新观看授权与已分类传输中断，有限退避，不继承控制权、不重放资源创建。反馈不替换媒体宿主；申请立即投影可用的停止意图，授权确认前仍不绑定输入。View 捕获一次原生激活的固定动作，controller 按连接/控制意图代次消费一次；失焦不能把停止 click 翻成接管，旧动作不能撤销后继授权。不补发 pointerup 点击、不延时撤销；剪贴板仅显式手势读取、按原 grant 失效；物理能力与输入授权分开，不支持粘贴不画无效入口。设计系统拥有空态/进度/紧凑控件尺度，短状态及本征槽位保持相邻几何稳定 | cloud-desktop / DesktopViewController；Host-wire-controller 跨期限组合、真实 socket 授权复核、React 与主题/窄屏 Shell 验证；本轮媒体/输入外部边界合成，公网授权和手机实机/弱网未验收 |
| EXT-01 | 可选内置扩展的启用意图由统一 ExtensionInstallationRepository 持久化，产品默认值只在首次发现时填充；Collaboration 默认停用，不加载实现或注册导航。用户启停驱动真实激活/资源释放，不影响平台账户与 Agent 会话；内置来源不能被 URL 安装覆盖或单独移除/更新 | ExtensionManager/catalog；启停、重启恢复、来源保护测试与真实 Web 组件验收 |
| WSP-01 | 同一主会话只有一个可交互主 Composer；普通/工具展开分支互斥，Side Chat 不叠加父输入 | ThreadComposerPresentation；Web smoke |
| WSP-02 | 显示位置不改变草稿/附件/提交目标；Host 相同裸 threadId 不得碰撞 | composer-core + ConversationScope；既有 composer/binding 测试及新 smoke |
| WSP-03 | 兼容恢复旧标签时不调用关闭资源；MRU/active 有效 | panel reducer/service；workbench-workspace-presentation.test.ts |
| WSP-04 | 重开/刷新不重复创建同一资源；旧 bottom 状态归回 right | WorkbenchPanelService + restoreRightPanelTabs；同上 |
| WSP-05 | 显隐、卸载、显式关闭各有语义；隐藏后入口可达 | AppShell/Panel type；Web smoke、browser/terminal 单测 |
| WSP-06 | Portal 位置消费当前 Shell 矩形，背景鼠标可达；不能逃出主题/模态层级 | Shell anchor + design-system layer；主题/缩放/拖动 smoke |
| WSP-07 | Side Chat 是源 Host 上独立 ephemeral fork 和独立 controller，不导航父任务 | SideChatService；聚焦单测 + 支持 Host 集成待验证 |
| WSP-08 | 已取消/已退出的 fork 结果不能重新挂载；释放原运行时订阅，不新建连接清理 | SideChatService 代次检查；聚焦单测 |
| WSP-09 | Side Chat 关闭确认绑定准确 owner/tab；取消确认不影响任务 | Shell ModalRequest；UI smoke 待验证 |
| WSP-10 | Browser 物理 slot 使用实际 region/visibility；旧 lease 不覆盖新 slot | BrowserPresentationCoordinator；迁移 smoke 待验证 |
| WSP-11 | 右侧/侧栏拖动实时改变几何；显隐 target、progress、mounted 分离。浮动侧栏与外侧命中层由 AppShell 共同 Portal 到 body 级覆盖宿主，成为窄屏唯一交互前景，盖过独立 Browser Surface portal；关闭时直到退出动画结束，其内容 Portal、导航投影与外侧命中层仍归浮动呈现所有，外侧命中层显式恢复 pointer hit testing；首次外侧触摸（包括空白）只关闭侧栏、不点穿浏览器或正文。右面板状态不因遮盖而重建，侧栏关闭后恢复呈现 | usePanelAnimation、FloatingLeftPanel、AppShell、BrowserPresentation；侧栏模型/真实组件帧采样及手机触摸验证 |
| WSP-12 | Thread 菜单与 Side Chat 只消费版本匹配、显式声明的 Host 生命周期能力；菜单 Fork 仅需 fork，Side Chat 须同时声明 fork/ephemeral/injectItems/unsubscribe。不支持时明确失败，不用空会话模拟或删除父历史。顶部会话菜单与侧栏 Fork 共用 forkAndOpenThread；顶部使用分叉图标，未声明 fork 时不展示，等待期间原位显示进度并禁用重复操作，未知结果不自动重试。菜单 Fork 收到 child ID 后不等待目录刷新即可打开；若用户已切换 route scope，迟到结果不得抢回导航 | 协议能力解析、Workbench 门控、forkAndOpenThread、smoke-conversation-header-menu；Codex/DSH 真实 Host 与负例验证 |
| WSP-13 | ephemeral fork 返回结果是 baseline，不请求持久 Resume/queue；旧连接代次不能被采用 | Session.adoptFork + HostRuntime；appserver-session.test.ts 与 smoke-side-chat-appserver.ts |
| WSP-14 | 当前产品没有下方面板、移动到下方/Show bottom panel 入口或底部占位；旧标签无损归回右侧 | AppShell/RightPanel、restoreRightPanelTabs；类型、聚焦测试、Web/native smoke |
| WSP-15 | 账号登录或零云端 Bot 不接管本机/其他 Host 工作区；创建仅来自主动环境操作；只有选中 Host 的真实连接错误可请求干预 | App connectionIntervention、下游产品 contribution；匿名/已登录零 Bot 回归 |
| WSP-16 | Skills 与 Cloud Storage 可作为 Workbench 侧栏中的下游产品独立路由；它们与 Start 消费同一 Shell navigation action 模型，Web/Electron 桌面一级导航位于60px图标栏，底部为设置/账号，列表为独立列；既有移动抽屉信号下改为列表上方纵向全宽菜单、新建/设置在底部独立悬浮且不显示账号底栏、列表全宽，复用同一 action 与状态；内建与贡献入口按当前locale解析短标签和完整可访问名，不显示额外的 “Work” 标题。应用级工具入口由页面的 `management.entryPoint: "workbench"` 显式声明，核心不按产品 ID 判断；撤回贡献同时撤回入口。导航只选择既有贡献页，不能创建/切换 Host、Bot 或会话 | 下游产品 Work navigation；聚焦路由/几何测试与 Web/Electron 验收 |
| WSP-16a | 连接器管理入口消费已激活 View 的 `connector-management` role 与唯一可见 Settings Page；平台/audience/renderer 同时可用才呈现。无提供方不跳转默认设置，退役和同 ID 重激活撤销旧回调。原生连接器操作不因缺少管理页而停用 | Extension contribution projection；角色 owner、路由可达性和真实 Workbench 浏览器验证 |
| WSP-16b | 导航的完整/紧凑标签及徽标由贡献声明，随locale热更新和激活回收；Shell保留完整可访问名，既不按插件ID覆写文案，也不授予徽标权限。语言切换不重挂载工作页、不清空草稿 | NavigationContribution/SettingsPageContribution及Shell投影；冻结/非法声明测试、四语言真实工作台与浅深/宽窄截图 |
| WSP-17 | AppShell 窗口 chrome、原生拖拽区和侧栏 resize owner 跨路由常驻；独立管理页只替换内容区，不得通过 `header=null` 改变物理窗口结构 | AppShell/AppShellHeader；Skills、Cloud Storage 路由测试与桌面 held-drag 验收 |
| WSP-18 | `New chat` 是回到 Home 的本地导航事务，不是远端 Thread 创建：Draft、conversation application route 与 View 同步提交，Host/Workspace 在页面可见后异步准备；失败留在 Home 原位反馈，不得继续显示 Skills/Settings | `navigateToHome`、WorkbenchNavigationTransaction、Coordinator；慢/失败 Host 单测与桌面 Skills→New chat 验收 |
| WSP-19 | 扩展页面由 contribution 声明 `document/master-detail/edge-to-edge` 布局，Settings Shell 只解释一次；`edge-to-edge` 只移除 document inset，Shell viewport 仍是唯一纵向 scroll owner，只有 `master-detail` 将滚动下放内部 panes。Skills 的 catalog toolbar 不叠加 padding，安装目标与 tabs 同行 | SettingsPageContribution、SettingsContent、Hermes Skills；布局契约、Electron scrollHeight/scrollTop 与 Skills→Storage 验收 |
| WSP-20 | 路由可向持久 AppShell 注册 Header region，但不拥有物理标题栏；注册按 route scope + owner 清理，平台 portal 保留原组件 Context。Skills tabs/安装目标在 Header，搜索与目录留在 Content；切路由不能残留旧 Header | AppShellRouteHeaderRegion、PlatformViewRegions；Radix Context 回归、Skills→Storage 桌面验收 |
| WSP-21 | Terminal visual inset 与无 padding measurement host 分离；终端排版边界隔离正文 tracking/word-spacing/text-transform，字体与网格间距由 xterm 拥有，不覆盖其内部行补偿。测量、绘制、光标和 PTY 使用一致的 cell 度量，累计位置误差不能随列数增长；不仅 screen ≤ host，满行字符推进与末列光标也必须位于 screen 内（允许像素舍入容差）。字体/主题/zoom/隐藏后重显使旧网格失效；PTY resize 只发布变化后的最终 cols/rows | TerminalPanel、FitAddon、AppServerTerminalSession；真实字符 Range/光标边界、负/正正文 tracking、长 ASCII/宽字符、双向 resize、字体加载、隐藏重显与 PTY `stty size` 验收 |
| WSP-22 | Host 是 PTY/process 唯一 owner；Application 按 Conversation Scope 维护有序 terminal session 集合和最近激活项。Panel tab 只投影/更新 active session，切换到非 Terminal tab 不清空最近项。Agent 的 `read_thread_terminal` 仅通过调用 Host + Thread 的 binding 读取该 Scope 当前终端的有界输出，不接受 session ID、不枚举或跨会话读取 | ConversationTerminalSessionRegistry、ConversationBindingStore、Terminal Panel plugin、dynamic tool handler；多终端激活/关闭回退、Panel owner 与 resource owner 分离、非法参数/Host+Thread 隔离、UTF-8/截断测试 |
| WSP-22 | 导航 hover 与当前路由是不同状态：Theme Engine 定义统一 `navigation-hover/current/pressed` token，Design System `navigation-control` 解释 `aria-current="page"`/selected；Sidebar、Work、Settings 与平台 Shell 不得自定义停留背景 | Theme Engine/controls.web；明暗主题 token 测试、Skills↔Storage Electron computed-style 验收 |
| WSP-23 | Embedded Workbench 只拥有宿主右侧画布；外层 Sidebar、Explore/Chat 路由与 History 归宿主。嵌入 Composer 在 ready/show 前只读，hide 先撤销写 lease 但保留 Application、会话与 Panel；Host 侧仅消费 session snapshot/action，不复制会话真源 | EmbeddedWorkbenchElement、EmbeddedChatWriteAuthority、transient ConversationBinding；双跑/fallback 单测、真实下游产品页面与 Browser/Terminal Panel 验收 |
| WSP-24 | Sidebar Activity 按等你处理(review/error)→置顶→最近去重分区；running不独立分区，按置顶与最近归类且保留行内运行状态；等你处理组两行桌面最小48px、触屏密度最小56px；含工作目录的各组采用标题与辅助目录两行，桌面最小48px、触屏密度最小56px；无目录且无待处理状态时为单行桌面最小32px、触屏密度最小44px，最近内部running优先，运行行按原生createdAt倒序（缺失创建元数据的行排在已知创建时间之后）；其余按规范recency倒序，完成后退出运行优先，已读不参与排序。排序先于十条分页；日期标题按实际可见行连续日期段投影，不重排会话，不新增进行中分区或定时挪位。各区可折叠；只有最近区消费十条预算。可选产品参与筛选默认关闭，由插件判定与按账号存偏好，snapshot.data为空（loading/error/unsupported）时保留行；数据已就绪但creator/participants均为空时不匹配“我参与的”，仅在顶部筛选控件调整，不追加底部隐藏人数或显示全部入口；displayIdentity为null时插件不输出filter描述符，Shell隐藏菜单参与筛选组；身份恢复沿用账号mineEnabled偏好，身份消失不改写偏好。停用插件隐藏菜单参与筛选并恢复完整目录。标题搜索与稳定Server筛选由Shell持有。企业身份 badge按实际内容宽度右对齐，仅显示最近已识别发言人，未知时回退创建人，多人时追加总人数圆标（上限99+、tooltip保留精确人数），头像20px、间距4px、圆标24px，不保留空人数槽；无内容不占位，分组模式遵循hideRowBadge；稳定来源是 `serverOrigin.serverId`，Hub route、tenant、Host placement 与 Thread 状态正交。行内不显示Server图标/色点，Server身份仍供筛选与完整tooltip使用；项目目录位于标题下方辅助行，使用label/tertiary排版，弱于metadata/secondary日期分组；必要待处理状态仍使用metadata，无底板、色点或独立配置项；待处理状态与目录共用辅助行，以中点分隔，不重复运行中文字；长目录按正文可用宽度省略，完整目录保留在行tooltip。头像右侧仅保留原菜单尾槽，与头像间隔4px；pending/running/Goal/review/error/unread与菜单共用该槽，内容网格仅正文和头像两列，不再预留独立18px状态列；状态或菜单能力变化不得推动正文/头像几何，错误/待处理/未读圆点统一5px中性灰。触控与桌面共用同一 Activity 组件、状态与 Design System token，不分叉业务语义；仅瞬时 hover 与菜单命中区按当前输入能力适配；移动抽屉纵向菜单固定顶部，搜索与筛选随列表滚动；底部仅悬浮新建与设置，不显示个人头像/账号底栏。Activity 行容器独占 hover/选中底色，按钮与伪元素不得重复叠加背景，“…”入口背景透明，指针移到入口时行 hover 不断开；文档级当前输入信号令触控滚动不产生鼠标 hover 底色。无 hover 或当前触摸输入时，独立“…”入口直接可见、有足够命中区，并为项目标签与尾部状态槽位预留空间；鼠标 hover、键盘焦点和选中态各自独立 | client-hub-server.ts、MultiHost compatibility projection、SidebarActivityItem/ThreadRowMenu、同 Server 跨 Hub route/改名/状态正交测试、触控/鼠标浏览器验收与真实 Electron 窄侧栏验收 |
| WSP-25 | Web/Electron unified Sidebar 的桌面60px图标栏或移动抽屉纵向菜单只保留 Home，通过openChat恢复已有会话或草稿；桌面Conversations标题下的全宽New chat横条与移动端底部悬浮按钮复用navigateToHome新建草稿；移动新建与圆形设置按钮由Shell同排悬浮在滚动区上方，设置在右侧，不显示账号入口/底部底板，列表留出末尾空间；展开时折叠控件属于侧栏，收起时 persistent titlebar 仅保留展开入口，不再追加 Write。浏览器标题栏不再保留独立下游产品/Home 按钮；transient/floating Header 不复制 Write。动态 action 必须进入 Header rail 测量和 macOS safe area | AppShellNavigationControls、window-chrome；展开/收起、persistent/transient、首帧宽度、真实浏览器和 Electron 点击验收 |



| WSP-26 | Right Panel 显隐与宽度模式正交：全局 Header toggle 唯一负责开关；Panel toolbar 只负责用户显式 maximize/restore。空间不足导致 auto-full-width 时不得重复 `Back to chat` 或呈现无效 restore 动作 | AppShell、ShellPresentation、RightPanel；auto/explicit full-width 源码契约与 Electron 窄窗验收 |
| WSP-27 | Frost 是独立 Theme ID，Light/Dark/System 与其正交；浅色 Sidebar material 固定为 `rgb(226 244 250 / 35%)`，不由其他主题的 material 动态推导 | theme-engine、appearance-theme；主题目录、持久化、CSS token 与真实 Electron computed-style 验收 |
| WSP-28 | Lavender 是独立 Theme ID，以下游产品 frontend 的低饱和紫色语汇投影完整 window/sidebar/panel/input/popover 表面；只改变主题色与材质，不复制组件 CSS 或改变字体、密度、圆角和布局 | theme-engine、appearance-theme；浅深色 semantic token、主题目录、持久化与真实 Electron 验收 |
| WSP-29 | Conversation 可见恢复与执行 capability readiness 分离：`thread/resume` 和首屏历史完成即可退出全页 Restoring；动态工具/Connector 注册按 Thread + client generation 单 flight 预热，不得占住历史 authority。任何执行型 mutation 必须等待同一 capability lease；预热失败可在执行时重试，但不能清空或降级已恢复历史 | AppServerWorkbenchRuntime binding、Local Host capability broker；悬挂/失败注册、历史先呈现、发送门禁与重试测试 |
| WSP-30 | DSH engine plugin 的 capability register/unregister/release 按 native session 串行、跨 session 并行；两个相同并发注册必须幂等，不得各自创建 scope/Skill 后以重复工具 400 失败。Bridge 非 2xx 只回传插件生成的有界单行错误摘要，不回显 token 或请求 payload | DshCapabilityLink/plugin；真实 loader 完整 Workbench capability 并发注册与错误摘要测试 |
| WSP-31 | Electron 主窗口与 Renderer Shell 消费同一 `workbenchWindowMetrics.minimumWidth=480`；达到下限时进入 immersive fallback，临时隐藏 navigation/context/right，不改写保存的开关、Pin 或宽度。业务内容最大宽度不得反向成为原生窗口下限 | shell-space、Electron Main；320/480 几何矩阵、480px 真实 Electron Header/Composer/Settings/Skills/Panel 验收 |
| WSP-32 | 目录选择只消费当前 Server 的 browse root 与目录读取；选择器保留暂态路径/加载/错误，读取失败须清旧条目并禁用确认，Project 创建和 Draft 绑定仍归 Application。ModalSurface 与共享 Button 拥有焦点、按钮语义状态和主题前景/背景，不允许业务 CSS 推导反色或复制主按钮；浅深及扩展主题下启用/禁用/处理中/焦点均须可读 | WorkspaceDirectoryPicker、AppServer file/project port、Button/ModalSurface；目录模型与真实 Web computed-style/键盘/长路径验证 |
| WSP-33 | Web 文档唯一记录当前触摸/笔或真实鼠标输入；媒体 hover 能力不能代替当前输入。共享 quiet/navigation/menu/Settings 控件只在细指针且非触摸输入时显示瞬时 hover，键盘 `focus-visible` 与选中/菜单打开状态独立；粗指针 Settings 操作与菜单命中区至少 44px。Codex 账户行滚动不粘 hover，独立操作入口触控可见。所有主题只替换语义色，不复制交互规则；未迁移的功能局部 hover 不得声称全控件已验收 | pointer-modality、controls.web/menu.web、Settings/Codex Account、Activity；状态单测、Web CSS 构建、触屏/鼠标与明暗扩展主题真实呈现待验收 |
| WSP-34 | 面板插件注册标签不自动取得右侧标签栏图标；`icon` 仅指定图标语义，`showTabIcon: true` 才在标签栏及其切换列表显示。插件恢复的标签必须保留同一声明；缺失声明不画默认图标 | PanelTabDescriptor、RightPanel、各面板插件；类型检查、面板聚焦测试与 Web 呈现待验收 |
| WSP-35 | Conversation 活动折叠标题统一为“原生按钮覆盖独立呈现内容”：按钮拥有鼠标、触控和键盘激活，`aria-labelledby` 指向可见标题，内容层不接管指针；无可展开内容时不渲染按钮。`Worked for`、普通活动项和分组各自保留展开状态与动画 owner。触控设备上的 Worked-for 助手消息操作栏必须在首次触摸前稳定可见、无 hover 显隐过渡；桌面鼠标 hover 与键盘焦点规则保持独立。不以 `pointerup` 补发点击替代原生激活 | OverlayDisclosureTrigger、三个活动消费者、消息操作栏；DOM/状态测试与手机首次轻触对照 |
| WSP-36 | OpenCraft 自有 Web DOM 的焦点描边由 Design System 统一拥有，不露出浏览器默认蓝框：低优先级规则压住包括浏览器自动聚焦滚动容器在内的 UA outline；主题化兜底只在当前为键盘模式且 `:focus-visible` 时绘制。iPhone 触摸文本框或弹窗自动聚焦按钮也可能匹配 `:focus-visible`，不能单独用它判定键盘输入；触控模式必须压住组件后续自定义的 focus outline/shadow，硬件 Tab 恢复可见键盘焦点。原生预览弹窗共享打开来源模型：触摸打开时自动聚焦按钮不画键盘环，进入 Tab 导航后恢复；不能依赖全局最近输入方式始终正确。`:focus-within` 画在容器上的焦点环也必须受输入模式约束。非交互内容不添加无用途 `tabIndex`；Markdown 表格操作按钮可聚焦，滚动区与代码滚动区只保留键盘焦点的自定义内描边。触控按下、键盘焦点、选中态分别呈现；强制颜色模式仍有焦点轮廓。第三方 iframe 与浏览器 chrome 不属于应用 CSS 所有权 | focus.web、pointer-modality、Table/Image/Mermaid preview、CodeBlock；焦点契约测试、Web 构建、手机触控与键盘 Tab/浅深/强制颜色验收 |
| WSP-37 | Conversation 折叠交互期间，被操作标题的屏幕纵坐标保持稳定；Web 共享动画适配器将数值高度样本投影到整 CSS 像素网格，避免分数高度与滚动取整形成往返抖动，不锁定自然 auto/流式布局，不另加 DOM 高度写入者。控件报告动画完成，视口唯一拥有滚动锚点与补偿，最终布局连续稳定后才释放。快速反向或切换标题先撤销旧 lease，旧完成回调不能释放新交互；用户主动滚动、控件卸载与视口替换立即取消。减少动态效果与同步收起也须完成末帧测量，不以固定超时替代动画生命周期；验收测可见标题全程及往返振幅，不能只看最终位置或以每帧半像素误差放行一像素振荡 | useDisclosureHeight、DisclosureReflowContext/useDisclosureReflow、WebConversationViewportOwner、TimelineReflowLease；真实组件、多 Turn 测量、分数初始几何、鼠标/触控、长正文展开/收起、快速反向、减少动态效果、取消与视口替换验证 |

WSP-32 远端目录补充：目录选择与持久 Project 记录是独立能力。Server 明确返回方法不支持时，Application 可只将已浏览的同 Server 路径绑定到当前 Draft；不得构造本机 Project、伪造 projectId 或声称已保存远端项目。权限拒绝、网络失败与未知创建结果不能降级为成功，旧选择结果仍受原 Draft/Server/导航代次约束。真实界面验收包含无 Project API 的 SSH Server，以及选择期间草稿保持；整页刷新后的草稿持久化不是当前内存 Draft 的承诺。

## Conversation loading presentation

会话首次加载只在无可见历史的空槽中显示居中中性圆环，不显示加载文字；辅助技术可读取本地化状态名。Thread runtime 拥有加载/失败事实，视图不添加恢复计时器或第二套 authority。Design System 拥有共享圆环、主题色与减少动态效果规则；Conversation 拥有空槽几何和滚动。后台重连保留历史、输入和 View 身份，失败切换为可操作的重试而非永久转圈。

Bot 的空展示页与历史耗尽分开：仍有更早源记录时，视口可在没有滚动手势的情况下
按一次恢复意图最多推进三页，串行且有界；额度耗尽或失败在原状态槽提供继续／重试，
不呈现新会话欢迎页、不自动排空全历史。重同步保留有持久锚点的已加载前缀及独立
本地提交，不以展示缓存恢复执行权限。协议所有权见
[Hermes message windows](../docs/chat-ui-architecture.md#hermes-message-windows-and-bot-history-continuity)；
`hermes-bot-history-integration.test.ts` 和 `smoke-hermes-bot-history.ts` 验证真实组件与模拟远端端口，
不代表已替换运行预览或实测远端 Hermes。

## Application navigation glyphs

- Navigation contribution 只声明图标语义和当前目的地；Web/Electron 的 NavigationIcon 拥有轮廓/选中图形投影，Design System 拥有 20px 图标、36px 基础控件、圆角、间距和状态色。不得套用菜单行的 14px 图标或独立次要颜色，也不以收缩时整体 scale 改变图标物理大小。
- 选中态仅对明确支持的闭合图形填充；Bot 面部、Server 指示灯和 Gear 中心等内部细节保留轮廓，不能统一 `svg { fill }` 抹掉。不同状态共享同一 SVG 盒子，不改变页面意图；不恢复 Home 或添加参考产品的未接通入口。
- Shell 的 compact/expanded 内容保持同一实例，应用行的视觉盒子与触控命中区分离；粗指针或当前触摸输入时至少 44px，仍容纳于原 52px 紧凑栏中。鼠标 hover、键盘焦点、当前目的地与菜单打开分别投影。账户菜单保持其独立密度与反馈。
- 证据：`workbench-navigation-icons.test.ts`、`smoke-navigation-icons.ts` 检查尺寸、图形、状态色继承、明暗/扩展主题、紧凑/展开、触控/鼠标、普通菜单负例与键盘/强制颜色；真实手机和当前预览替换须另行记录。

## 证据纪律

共享 AppShell 标题栏不在会话标题前绘制装饰性代码／项目图标；会话标题、项目说明和导航操作保留，独立与嵌入模式遵守同一规则。

会话菜单仅呈现该会话的操作，不提供“在 Host 上新建任务”或“Host 设置”捷径；
这些能力继续通过应用原有的新建任务与设置导航进入，删除菜单入口不删除能力。

目标入口契约：无目标的可写会话通过 Composer 的“＋”菜单设置持续目标，
不保留独立创建胶囊或空白占位。Goal surface 拥有编辑草稿、弹窗和既有目标
进度；既有目标通过attachedContent进入Composer附属区，共享队列/摘要的边界与材质，不再独立悬浮反色胶囊。桌面一行显示状态/截断摘要/紧凑耗时与快捷操作；按Composer实际容器空间收起摘要和编辑按钮，菜单保留操作、触控最小44px；只读保留查看；complete为终态，立即退出附属区但不自动clear。已完成目标经“＋”菜单回看，可写Host保留显式移除及设置下一个目标；新建经共享Runtime先读取并确认旧complete目标已clear，再set(active,tokenBudget:null)，新周期的耗时/token由原生从零计量；暂停/继续及编辑保持原周期。取消不写入；clear后新建失败保留只读完成摘要与草稿，不冒称原生旧记录仍在。摘要仅在当前资源/连接内存活，显式移除时清除；未知创建结果先读确认、不重复启动；连接更换阻止后续写入。普通消息和旧编辑不隐式重启。暂停/阻塞/受限态继续保留附属区入口。详情用Radix负责定位/外点/Escape/焦点恢复，编辑用ModalSurface与共享Button；切尺寸不重挂载Composer。Goal 文案、状态、错误与耗时通过现有 Intl/语言资源呈现；语言切换不重建编辑器、不清目标草稿，不翻译用户目标正文。新建草稿在 Host 支持可写 Goal 时同样提供入口，
确认后直接原生创建会话并设定目标，无需先发送普通消息；取消不创建会话，失败
重试保留已创建的 Thread，不重复开启目标。只读或无能力 Host 不提供创建入口，
切换会话撤销旧目标编辑但不得重挂载 Composer 或丢失输入草稿。

WSP-36 焦点视觉补充：鼠标/触屏按下由document统一记录指针来源；菜单/弹窗回焦保留真实焦点但非编辑控件不画残留outline。Escape关闭不切换输入来源；Tab/方向键/导航确认恢复键盘提示，单纯移动鼠标不抹掉键盘焦点。编辑字段自身的光标/选区/边框、按钮的选中/open/elevation保留；无强制blur。普通焦点颜色独立于品牌 accent，使用共享中性 token；旧 focus-ring 别名投影同一颜色。全局兜底的整个选择器为零优先级，组件自己拥有焦点呈现，不能被兜底重画外框。Composer 编辑区只保留光标/选区，不画外框；键盘按钮仍有可见中性提示，强制颜色模式尊重系统配色。真实 Composer 的鼠标点击、Tab、触摸以及无局部样式按钮的 fallback 必须同时验收，不能仅凭源码中的 `outline: none` 判定成功。

桌面面板 motion：共享 Design System 拥有加载矢量、两秒60步旋转与 Document timeline 同相；减少动态效果只撤销旋转，不改反馈盒几何。紧凑 outline 按钮状态即时投影主题色，不新增缩放或文字/连接遮罩淡入；触屏保留44px命中区且不粘 hover。插件只投影状态，不在动画结束后确认授权或撤销控制。真实组件验收包括分离挂载的相位、采样中间帧、按住反馈、减少动态效果和接管/停止几何；不把组件验证称为 Mac/iPhone 逐帧验收。

WSP-29/30 所有权补充：Renderer 的 capability 声明接受与 Engine 挂载 ready 分开。执行准备与替换共用 Host Thread 队列，停止/审批回复/队列删除不等待工具准备；owner 先撤销后清理，迟到提交失效；首次 native setup 挂载失败不发布新会话，已有历史不参与回滚。Bridge 仅透传允许列表错误码，不以截断字符串代替脱敏。

## 听写输入所有权

底栏仅消费当前瞬时事务，独立呈现阶段、计时和有界音量历史；录音、重试、最终
写入与提交仍由原owner负责。采样源替换/卸载释放订阅、观察器及待绘制帧；停止
调用finish，发送交回Composer提交入口，不新增麦克风或草稿状态。

- DIC-01：听写Footer由当前Composer瞬时输入事务拥有；切换草稿、清空、物理View替换或卸载同时释放文本与呈现。旧事务不能更新新Footer。
- DIC-02：普通与听写操作互斥；普通内容保持挂载但inert/aria-hidden，不重建编辑器。Composer拥有区域几何、主题控件和提交编译，插件只提供状态/采样/完成动作。
- DIC-03：停止只写入；Enter/确认发送必须等最终文本，并核对同一草稿与View。取消、失败或失去归属不能迟到发送；重复停止复用同一完成事务。
- DIC-04：平台录音适配器唯一拥有物理录音；Mac Main拥有原生录音，Web浏览器适配器拥有MediaStream，波形只消费有界数值采样。波形不发布草稿snapshot、不二次录音，没有采样时不伪造声音。
- DIC-05：单击与150ms长按分开；长按释放完成听写，合成click不能再次开始；Escape取消。真实权限/识别与合成UI验收分别报告。
- DIC-06：听写session与识别task/片段不是同一对象。真实task ID/sequence隔离final账本，片段确认不能终止Capture；用户stop后完整收尾才交付一次。录音保留原草稿/选区且只读，partial不参与编辑或提交；失败/取消不得自动写入部分结果。Browser result index是实际身份，不以文本长度/公共前缀猜分段。
- DIC-07：dictation追加文末并同步确认真实View已应用；泛用输入默认selection。原Draft/View/contentEpoch在写入前后须一致，replace-content/目标重置/View交接令旧lease失效；false/commit-rejected禁止自动发送，不用文字非空伪装成功。
- DIC-08：Web云听写的录音、转写attempt和草稿写入分属平台、应用服务、Composer。后端验证真实WAV字节和时长；凭据不进入Renderer，所选SSH/Agent Host不拥有语音输入。捕获结束后释放麦克风，完成/取消/失去所有权/过期释放临时音频。
- DIC-09：转写失败使旧发送意图失效；显式重试复用原音频、创建新attempt，不重启麦克风、不延续旧发送。重试/失败反馈使用原Footer槽位，仍受原Draft/View/contentEpoch约束。暂停等待上游不等于云端取消或退款。
- DIC-10：语音连接复用模型配置与凭据仓库，语音默认与聊天默认独立；转写模型/密钥不得进入聊天目录与引擎投影。应用服务绑定安装级配置，SSH/Thread/Bot 选择不得改变语音所有者；旧环境密钥不得作为运行时第二真源。
- DIC-11：录音与显式重试绑定开始时的语音配置票据；转写前比较当前模型/凭据，变更时拒绝，不静默转投。配置缺失、停用或删除保留不可用选择，不隐式选择目录首项。配置页面不得自动触发计费探测。
- DIC-12：启动不等于系统授权弹窗；启动反馈只在原Footer槽位显示共享进度图标，无可见授权文案，读屏使用中性准备提示。平台确认listening后才呈现波形并计时；启动中可取消，迟到就绪不能复活旧事务。反馈不增加最短等待、不预热或常驻麦克风。

本次验收边界见 [听写整改计划](dictation-interaction/task_plan.md)。

## Floating composer ownership

| ID | 不变量 | 责任/验证 |
|---|---|---|
| FCO-01 | Shell 的路由注册表持有显隐意图；各浏览器标签的 manual/auto-collapse 原因互不覆盖，自动策略不得改写用户手动选择 | floating-composer-state.ts；确定性状态测试、原生标签切换 |
| FCO-02 | 紧凑/聚焦展开、peek、最近轮次展开和显隐阶段分别派生；退出和 peek 内容不可交互 | ThreadComposerPresentation；焦点/键盘/动画回归 |
| FCO-03 | inline/overlay 共用同一 portal destination 和编辑器 DOM；草稿、附件、撤销、提交目标不随位置重建 | Stable editor host；native smoke 的 DOM identity、草稿和 WebContents identity |
| FCO-04 | 收起把手绝对定位，不增加 Composer 内容高度；唤回把手有独立 Shell 锚定宿主，背景区域不截获网页操作 | thread-workspace.scss；native pointer/hit area smoke |
| FCO-05 | 最近轮次预览不重复用户 intro；滚动只由预览视口拥有，Composer 手势排除预览内容和惯性事件 | ConversationTurn.startAfterTurnIntro、ComposerWheelSwipeController；真实组件长回复测试 |
| FCO-06 | 菜单/对话框属于 Composer 焦点边界；窗口失焦和布局迁移不误解释为用户离开；隐藏后的入口支持键盘 | focusin/focusout adapters、Radix popup recognition；native keyboard/menu checks |
| FCO-07 | 原生底边追踪由 Main 持有已登记 guest；事件按 guestId+trackingId 过滤；旧订阅清理不能撤销新的 tracking | browser-guests / ElectronBrowserSurfaceHost；真实 webview pointer smoke |

最终矩阵记录于 2026-09-14-floating-composer-replacement Task Pack。


## Shell pane ownership

2026-10-14 主工作台导航拓扑更新：Web/Electron 的应用入口与当前页面上下文合并为单个 Sidebar（`ShellNavigationConfig.layout=unified`），桌面内部60px图标栏承载Home/扩展目的地，既有移动抽屉信号下同一组入口改为列表上方纵向全宽菜单（新建/设置在底部悬浮、列表全宽），桌面邻接列承载会话或设置列表，Settings/账户在竖栏底部。在任务等未提供上下文列表的桌面页面，Sidebar 仅保留图标栏宽度，主区域紧邻图标栏填满释放的空间；不显示空上下文的 resize 入口，不写回会话列表的保存宽度，切回会话恢复原宽度。窄屏保留完整抽屉与同一组应用导航动作，新建与设置在底部独立悬浮，隐藏个人头像/账号入口且不保留底板。整个 Sidebar 只有一个宽度、一个显隐入口；不显示独立 Applications 抽屉、Pin 或 compact 应用栏。旧 rail 偏好不参与该布局的空间预算，也不改写它们。浮动/固定呈现移动同一组 portal 内容，不复制上下文、草稿或滚动 owner；窄屏选择目的地关闭浮层。此条替代主工作台原有并排 Primary/Context 呈现，嵌入产品无 Shell 导航时沿用原契约。单一 leftPanelSlot 保留现有路由、扩展与空间策略。


| ID | 不变量 | 实现责任与证据 |
|---|---|---|
| SHL-01 | Pane 几何只投影一次；内容面板宽度、占位、聊天 Frame 均从同一 paneGeometry 读取 | workspace-pane-geometry.ts；纯函数矩阵及帧采样 |
| SHL-02 | Viewport 是 flex 裁切区域；Frame 宽度为 max(min(W,mainMinimum),W-min(R,A))，并且 min-width:100%；Frame 由原生 layout 右对齐 Viewport，X=min(0,Viewport−Frame)，空间不足时保留可读排版并向左平移；聊天容器查询归 Frame | AppShell + app.scss；最大化中间帧 Frame≥普通并排下界 |
| SHL-03 | 显隐与全宽进度分离，由一个 Shell 事务入口写入；模式切换先终止残余显隐，scope/reduced-motion 直接落到端点；旧完成回调被清理 | useWorkspacePaneAnimation；快速反向及 reduced-motion native trace |
| SHL-04 | 退出阶段保留同 scope 的主布局描述，完成后更新；模式交接不卸载聊天草稿或浏览器 backing；普通 resize 仍实时改变排版宽度 | mainLayoutSnapshot；草稿/WebContents身份＋held resize验证 |
| SHL-05 | 不绘制 Sidecar/main 边缘渐变。Header 的主表面上沿随既有 primary/context 实时宽度与 context 显隐进度向左延伸，形成包含原生按钮预留区的连续标题栏；不得等 context 卸载再切换绘制，或另设 CSS 动画时钟。上沿下边缘消费同一主面板主题 elevation，连接边裁切避免重复接缝，flat 不额外加阴影。横向细线与 Sidecar 标题栏下方的竖分界共用绘制进度；内容生命周期仍由 pane exit owner 独立保留。safe-area/几何/命中区不改、不复制原生按钮；主面板主题阴影/描边/flat、expanded/context 材质与浮动阴影保留，强制颜色使用系统分界 | Header + Sidecar + live motion + Design System/theme tokens；真实 AppShell 前 100ms 与中间帧上沿跟手、native reservation、十种主题 shadow authority/下沿像素与白色接缝负例、快速反向/held resize/显隐与浮动回归 |

边界：普通并排使用 shellSpaceMetrics.mainMinimum（480），保持既有空间策略。状态：63项聚焦测试、完整门禁、最终包556帧验收通过；Frame最低480而Viewport可到0，普通held resize及取消恢复通过。证据 /tmp/oc-pane-4aFgS4；草稿和WebContents ID保留。

## Browser 源实现迁移不变量

| ID | 不变量 | 责任/验证 |
|---|---|---|
| BRW-01 | Browser Host registry 唯一管理 backing host、挂载 claim、持久化状态；独立 transition 管画面交接，React 只提供 slot 与测量 | opencraft/browser-manager.js；历史来源与当前模块分开锁定、冻结行为及实际 Web consumer、opencraft-browser-manager.test.ts |
| BRW-02 | 上一个页面在新页面收到对应代次的 attachment ack、预热完成前继续承载画面；提交后一帧才释放旧画面与新页面交互 | opencraft/presentation-transition.js；确定性调度测试 |
| BRW-03 | 替换/取消 pending handoff 后，旧 ack、timer、frame callback 不得重新显示旧 incoming 或清理新页面 | A→B→C 和迟到回调回归 |
| BRW-04 | Claim release、presentation detach、logical close、backing dispose 相互独立；旧 reference/generation 不撤销新 claim | 独立状态机＋标准 host port；原生多标签回归 |
| BRW-05 | Page storage ID 与 renderer/host/mount generation 分离；管理器拥有 ephemeral→persistent 与 restore-expected 状态，平台负责持久化同一分区 | manager storage tests＋桌面重启 Cookie 回归 |
| BRW-06 | 弹窗请求经 Main 验证并按原 Page Scope 创建标签；不改写原页面、不生成不受管窗口 | native managed popup smoke |
| BRW-07 | 权限按 partition/origin/type 隔离；旧页面与撤销后的迟到授权不得生效 | browser-permissions.test.ts＋原生拒绝/撤销/清除数据回归 |
| BRW-08 | browser-use 与 UI 挂载独立；操作互斥且 finally 释放；隐藏页仍可渲染/截图，无面板激活副作用 | browser-background.test.ts＋原生后台读取/截图/关闭回归 |
| BRW-09 | 恢复未完成不是用户关闭；close 与清除站点数据分离，重启不因 localhost 端口变化丢失归属 | desktop metadata＋native restart smoke |
| BRW-10 | 设备工具栏只投影父层 viewport mode/zoom；聚焦数字草稿独立，范围内编辑即时提交、失焦规范化，预设/旋转不夺取 Page 或持久化所有权 | 独立 toolbar/input；136 静态、64 Web 检查点及两组258边界；手柄/布局保持原owner |

历史迁移验收：66 项聚焦测试、完整门禁，以及当时最终打包应用的多标签/隐藏保活/分区重启验收通过（/tmp/oc-browser-MGEbk1）。没有新增 bottom-panel UI；非标准 WebContents adoption 不在标准 Electron port 内伪装支持。标准宿主桥接单独验证，不沿用旧原生验收证明 registry 与 toolbar 的后续实现。

模型成立、编译通过、真实控件通过、真实 Host 通过、Mac 产物通过是不同级别。未经相应验证不得提升状态。不得擅自增加未经定义和验证的行为约束；结构互斥、稳定前缀和同步移交本身可构成合法保证。
# 会话生命周期补充（2026-09-15）

文件更改呈现补充（2026-10-06）：Turn 变更汇总是独立资源，不是消息或工作结束边界。Web 实际 Composer 是指定 active Turn 的唯一运行中入口 presenter，主/浮动 mini transcript 按相同身份避免重复；结束卡再进入消息区。资源更新保留数字、展开与 Review 的身份，展开重排由 viewport lease 协调；卡片/悬浮用主题与成熟 Button/Radix，不新增 Host 写权。实现与真实组件验收见 [ChatUI Changed-file review](../docs/chat-ui-architecture.md#changed-file-review)，当前不是生产替换或 Native 实机验收。

Interrupt interaction policy is a pure protocol projection: decline/dismiss
legacy blocking requests with fresh payloads; dynamic tools await server resolution.
The conversation runtime owns turn filtering, all-settled cancellation sequencing,
interrupt provenance and failure cleanup. No UI view or response factory grants
permissions or removes pending requests.

Connector 交互不变量：Composer 入口消费应用级 Manager；授权完成、连接、会话选择与写审批分别表达用户意图。面板卸载不销毁已就绪共享连接；审批由共享 Modal/Radix 管理焦点和层级，配置恢复不恢复执行授权。见 [Connector 设计](../docs/platform-connectors.md) 与 `smoke:connector-controls`。

Connector 目录属于 Skills 能力页的同级 Tab；配置弹窗复用 Settings 原语，不引入 Octop 的 Antd/Less。共享 SettingsListItem 显式投影是否有图标，无图标不能保留空图标列挤压正文；配置弹窗内容按本征高度滚动，检测结果不能压掉必填字段。凭据不出现在会话、Skill 或持久 UI 状态里；第三方服务运行结果与静态目录说明分别呈现。

Connector 目录浏览不套用设置行：采用限宽品牌卡片，已配置实例单独管理，分类/搜索和返回位置不因打开详情丢失。详情的侧边/窄屏呈现由共享 Modal `inspector` variant 持有，业务不能手写 focus trap 或遮罩；正文滚动不带走操作区。不保留旧长列表模式或为测试专设的第二套管理入口。

- 持久 Thread 元数据、引擎上下文、逻辑订阅、View 是独立生命周期；普通退订不等于中断或归档。
- 临时 Side Chat 分支完整原生上下文，继承历史边界在获取 view 前提交；创建/关闭失败保留清理身份，旧失败不得覆盖主要错误。
- 两个 renderer 共享物理 Host 时，订阅和审批仍按逻辑客户端隔离；后台卸载与新订阅序列化，SDK 迟到退订必须重新订阅。
- 顶部会话菜单按 Host archive capability 显示归档（Archive 图标），复用 threadManagement.archive 并刷新该 Host 目录；点击即关闭菜单并由应用通知层持续显示正在归档，确认后替换为成功提示，失败提示结果未确认并允许用户检查后重试；处理中禁用重复及相冲突操作。归档回执不等待目录刷新，成功或失败均后台刷新目录核对；迟到回执不得关闭用户重新打开的菜单，不提前宣称归档成功。归属任务入口使用 ListTodo 图标与同一菜单图标槽。
- 菜单和 Settings 归档页消费唯一 Host 命令及共享 Radix/主题控件；主 Sidebar 只展示活跃会话，不持有归档入口或撤销提示。归档是可恢复目录状态，不删除 workspace。
- Sidebar 会话行的右键菜单触发区与触控“…”下拉入口互不包含；两者共享操作项、各自处理输入事件，但整个 Sidebar 只允许一个按 Host/Thread/入口标识的菜单打开。切换行或入口须关闭旧菜单，旧入口迟到的关闭回调不得关闭新菜单。选择菜单项不能重新触发另一菜单，重命名/删除的后续交互由 Modal 持有。
- 当前证据：聚焦模型/SDK 测试、真实隔离 DSH Fork/边界/落盘审计、归档重启、完整门禁及实际签名桌面菜单/恢复窗口验收通过；不代表发行或生产发布。见 [本轮账本](thread-lifecycle/progress.md)。

## 会话权限目录（2026-09-26）

- 标准权限档位只能由 Host 根据引擎真实 profile/preset 投影；未验证的自定义 profile 保留为引擎原生选项，不因名字相似归类。
- 目录的 `openCraftMode`/`openCraftLabel` 只在 Host 声明 `opencraft/permission-modes` v1 时有效。缺失能力时，客户端不得自行猜测标准档位。
- DSH 的 Thread 创建、Turn 执行与 Fork 必须先校验所选 preset；新建 Thread 在创建时应用并回读生效值，不能等到首轮 Turn。DSH 的外部沙箱投影不能冒充 Codex 沙箱。
- 标准档位用稳定的 `opencraft:permission-mode:*` 提交值，Host 在每次提交时解析当前引擎目录并翻译为原生 profile；会话恢复后原生生效 profile 由目录重新映射为产品档位。产品级权限上限与独立的请求值/生效值持久对账尚未建立，不得声称已实现完整的产品级权限策略。

## 会话顺序与展示分段（2026-10-05）

- 一个执行轮次可以有多个有序问答与活动片段；执行所有者唯一，不等于折叠组唯一。问答、追问与交互边界不得被“回答区/活动区”重新分桶。Renderer 只消费共享呈现计划。
- 异步提问的可见文字与原生 phase 不赋予最终回答资格；折叠边界、最终回答资格和执行完成相互独立。折叠只控制连续片段的显隐，不改变消息位置。
- 源消息与边界身份决定显示 key；流式、完成与补历史不按数组索引重建已有回复。历史片段保持结束状态，当前响应最多一个 Thinking owner；总用时与完成信息不因分段而重复。
- 引擎实际返回的思考摘要/文本与 Bash/Read 工具记录是同一连续响应工作容器内的独立 Item 折叠面，不是工具标题的正文，也不是与“用时”平级的工作区。各引擎默认接入且内层初始折叠；无实际内容不暴露空按钮，不切开工作区或制造“历史消息”标题。真实思考仅分开相邻内层工具组，不重建外层身份；有效最终回答授予该连续工作容器一个外层折叠，最终回答保留在外面。只有真实思考、没有工具也属于有内容的工作，完成后可在真实用时下折叠；不得伪造时间。用户输入、异步提问与交互边界保持原顺序，不同已完成响应保留独立折叠。Turn 用时与实时 Thinking 各只有一个 owner，不跨响应回派。流式、完成及外层收起不改内层用户选择；Web View 与 Native 稳定外层组件按 Item 身份保存选择，动画组件只管理过渡。共享 `chat-core` 选择一份非空内容、保留时序和唯一实时 owner，Web/Native 只消费；契约与证据见 [Returned thinking content](../docs/chat-ui-architecture.md#returned-thinking-content)。
- 思考折叠行以脑形轮廓图标区分状态，不用 Bot 图标暗示另一个智能体；短状态文案须完整可读，嵌入式聊天按宿主站点语言本地化，空间不足时由后面的内容预览收缩并省略，不挤压状态文案。实际返回的思考正文保留引擎原文。
- 回归须覆盖同轮次的异步提问→用户回答→工作→回答→多次追问，包含桌面/触控、折叠、刷新、补历史和正在输出期间的 DOM 身份。
- 2026-10-06 折叠资格补充：共享 `AgentActivitySegmentEnd` 只记录时序结束原因；插话、异步问题、审批、图片及 Turn 完成不赋予折叠资格，旧回答也不赋予后续工作段资格。普通任务段须到达自身有效非异步最终回答，才可默认折叠；取消保留正文。资格、默认值、用户选择与临时强制展开独立，显隐结果不得反写选择；禁止收起按钮的呈现必须保留完整有序正文，不丢失/重复 persistent 项。最终回答保留独立槽位，内层分区也不得隐藏有效最终回答。两端消费唯一 reducer，保留既有 ID、时钟与视口 lease。契约/测试见 [Activity closure and disclosure authority](../docs/chat-ui-architecture.md#activity-closure-and-disclosure-authority)。

## 图片附件呈现（2026-09-27）

- 草稿图片的语义身份和处理状态只属于 Composer Draft；浏览器 `File`、临时预览 URL 和处理任务属于 Controller 的草稿所有者附件会话，不写入可序列化 Draft。切换会话或页面缓存淘汰保留资源，晚到结果只能修改原 Draft；移除、清空或草稿所有者销毁须中止任务并释放 URL。新内容准入失败必须回收尚未被草稿接收的 File 预览，不启动孤立任务。
- 图片选中即在输入卡片内显示方形缩略图；处理中、失败和删除均原位反馈。触控删除始终可见，不能依赖 hover；处理中不宣称网络上传百分比，失败图片不允许发送。
- 已发送图片由 Timeline 及媒体加载边界投影。缩略图进入图片查看器，不绕过通用链接策略来打开 `data:` URL；查看器按原资源身份加载并在关闭后恢复焦点。

### 下游产品国内嵌入预览面板

国内控制台隐藏发布允许右侧浏览器标签与对话文件只读预览，默认收起，复用 Shell resize owner。只读预览不提供目录树、搜索、编辑与终端入口；权限仍由 Host 决定。新草稿保留面板开关所在标题栏；面板元数据与会话绑定由本次 Bot 的 Application 内存持有，销毁时释放，不从其他账号或独立站点的 localStorage 恢复。

## 会话顶部信息

手机宽度（不超过 640px）不展示会话标题旁的 Project/工作区附文，标题与操作按钮保留。桌面继续展示附文。已有“…”菜单的会话详情以只读方式展示实际项目名与工作目录：优先当前会话执行信息，目录尚未恢复时可用同一会话的规范 Thread 元数据；未知字段不伪造，不更改执行目录或启动会话。

会话信息使用共享 InformationPanel 两行元数据和 ModalSurface 自适应呈现：可用视口不超过 640px 为贴底 sheet，超过 640px（含 iPad 常规横竖屏和宽分屏）为至多 420px 居中弹窗；不按设备型号或 UA 分支。标题、右上关闭与目录复制均本地化，不保留重复底部关闭栏。长项目名/路径完整换行且可选，目录复制沿用共享控件的成功/失败反馈与非安全上下文回退。Radix 继续拥有模态、焦点、Escape 和遮罩关闭；窄屏仅顶部手柄拥有下拉关闭，短拖/取消回弹，不拦截信息区的选择与滚动，减少动态效果关闭进出动画。下拉手势由Web平台可选AdaptiveSheetHandle持有，与信息内容一起按需加载，通用ModalSurface不将手势实现加入首屏。主题、排版与触控命中尺寸由共享设计系统持有；不更改会话或执行状态。

Application Markdown link scanning is a pure raw-text projection. UTF-16 source
ranges, escape compatibility and later-candidate recovery stay stable; unescaping
and Host-scoped resource admission remain caller responsibilities. Scanner matches
do not open a resource or grant navigation.

Formula delimiter projection preserves application syntax and raw source ranges;
code-fence precedence and structural placement remain compiler responsibilities.
Display line-tail admission and inline LF rejection cannot silently change during
source replacement.

User-message list/block projection preserves the existing newline and fence
compatibility; indented continuations retain list context and empty lines reset
it. Source replacement must not silently adopt another Markdown dialect.

Global streaming segment keys survive Markdown container reparsing through the
shared reconciler: same-position exact/growing text wins before unconsumed global
exact occurrences. Reused text settles, new text enters only while streaming,
and completed text stays visible. This pure projection cannot commit a session,
change syntax identity, schedule animation or own execution.

## Markdown 文件预览
- 文件标题栏提供文件树显隐开关；收起后内容占满宽度，树保持挂载以保留展开、搜索和滚动位置，不重建预览或编辑器。只读嵌入预览仍无目录入口。验证：`scripts/smoke-file-tree-toggle.ts`。
- 文件树的目录数据归Host作用域Query缓存，展开/键盘活动项/滚动归当前面板；按数据版本排序、展开分支拍平，DOM仅挂载可视窗口和overscan。侧栏/聊天更新不得触发未变化目录排序或每目录会话订阅。隐藏和搜索保留展开/滚动，键盘上下/Home/End/左右/Enter与选中文件仍可达；目录折叠后迟到数据不恢复子行。验证：`tests/workspace-file-tree-model.test.ts`、`scripts/smoke-workspace-file-tree.ts`。
- 下载按钮沿用文件标题栏同排操作的尺寸、图标和反馈样式；不单独放大下载控件或为它撑高标题栏。
- 文件预览标题栏右侧提供下载原文件；包括空文件、图片和不可预览的二进制。下载使用当前 Host/path/runtime generation 下已读取的 Blob 和文件名，不导出渲染 HTML 或未保存编辑草稿，不写回 Host。读取未完成、读取失败或旧资源 URL 尚未替换时禁用；切换身份/关闭释放 URL。只读内嵌预览同样允许下载。
- 文件面板默认将 `.md` / `.markdown`（大小写不敏感）交给既有 WebChatDocument 排版，可切换到原始文本；不将原始 HTML 注入 DOM。相对文件链接与图片以当前文件目录解析，继续消费当前 Host 的资源接口和 Blob lease。
- 内嵌模式维持只读、无目录/搜索/监听/写入；写入执行入口必须先检查只读状态，拒绝后不得调用 Host 写入或失效 Blob 缓存。预览/源码是文件身份下的局部状态，不修改会话或源文件。
- HTML 预览在创建沙盒 iframe 前移除普通链接、图片热区及 SVG 链接的目标、自动刷新跳转和可恢复链接目标的 SVG 动画；点击预览正文不得将 iframe 导航到外部页面，避免离开初始 CSP 后加载外部资源。源码视图继续显示未经改写的文件内容。

## 通用媒体与 PDF 文件预览

- `MEDIA:<path>` 是与扩展名无关的资源交付入口，图片、音频、视频、PDF 和未知文件均先经共享资源策略，再进入当前 Host 的文件预览。PDF 不按 Codex/Hermes 或本机/SSH 判断，所有能够提供文件字节的 Host 共用 PDF.js；未知或无法解码的文件保留下载动作。
- PDF 文档、Worker、当前页绘制与文字层属于资源 View；换文件或卸载取消旧任务，晚到结果不得写入新资源。每次只绘制当前页，限制高 DPI 画布像素，Worker、CMap、字体和编解码资源随构建提供，不依赖外部 CDN。
- 文件预览不修改原附件、文件、会话或引擎能力。Web 的共享 Renderer 不宣称已完成 Expo 原生 PDF 阅读器。

独立与内嵌入口共用 Composer 编辑区域高度规则；新会话与已有会话保持一致，增长由同一输入区域承担，工具栏继续位于底部。

Markdown preview entry: explicit `.md` / `.markdown` paths in completed inline code are clickable and use the same resource policy and Host-scoped right panel as Markdown links. Bare names, commands, external URLs, streaming paths and code within an explicit link retain their original semantics. No file is read before clicking.

HTML preview entry: completed inline-code `.html` / `.htm` paths use that same right-panel resource flow. The read-only file panel defaults to a sandboxed page preview and can switch to escaped source without reading the file again. Scripts and external subresources are blocked; inline styles and embedded data/Blob media can render. The file remains owned by the Host, and changing files replaces the preview document.

国内嵌入聊天采用 compact 右栏初始宽度：既有默认宽度的 2/3，并继续遵守面板最小宽度和聊天内容保留宽度；拖拽调整由原 Shell owner 负责，独立工作台保持 standard 默认。

国内桌面嵌入聊天由控制台占满侧栏右侧的内容列，去除设置页外围 gutter 和宽度上限；宿主通过 `--lightvela-console-header-height` 对齐 68px 导航表头。嵌入根将其投影到 toolbar token（缺省 46px），消息正文保留内部间距；移动端与旧聊天入口沿用原布局。

只读 Markdown 文件预览的“源码”直接呈现转义后的原文，可选择复制和键盘滚动，不依赖按需加载的编辑器模块；可编辑工作台继续由 CodeMirror 持有草稿。

### Shared side-panel glyphs

Web/Electron and Expo consume one platform-neutral geometry definition in
`@opencraft/design-system/sidebar-toggle-glyphs`. The renderer owns SVG primitives
and platform hit testing; the 16-unit optical box does not dictate the touch
target. Mobile keeps 44-point targets with neutral, transparent toolbar buttons.
Panel visibility remains a projection of its existing owner, including after
a swipe; icon adaptation must not introduce a parallel navigation state.

### Plugin-owned conversation participant badges

- 企业身份 projects verified authors of retained user-message history, not viewers,
  submitted identity bindings, queued input or Turn count. The same distinct set
  supplies the latest-speaker photo and its login-name list. The fixed trailing slot is right-aligned across single-/two-line rows, with no inline names; only the most recent person is pictured, followed by a separate total count when more than one person is known. The count is a20px theme-owned circular badge, capped at99+ with exact tooltip; it does not overlap the photo. The badge fits its20px photo and optional20px count with a4px gap (44px total), with equal photo/count dimensions and vertical centers; no empty count track or trailing spacer. Its right edge stays aligned to the host action lane; photo position may follow count width. Creator
  provenance comes from a successful authenticated start/fork, never inferred
  from first/last participants. Missing historical creator remains unknown.
  The distinct participants array orders each sender by their latest observed message,
  ascending, most recent last (`MAX(rowid)` in presence); history reconciliation inserts
  chronological messages, live messages use arrival order, duplicate Items do not reorder.
  Snapshot-array comparison still drives revisions, including order-only changes.
- Presence is a derived index in the existing Host SQLite file. First-read native
  reconciliation, fork/rollback and live Item fences prevent stale or unused mappings
  from creating participants. Model failure does not remove accepted user input.
  List returns current snapshots without awaiting native history; cold reads reconcile
  in the background with four active jobs and a five-second cancellable history deadline.
  Timed-out/closed reads cannot apply late results. Failure and recovery invalidate
  readers even without a participant-set revision change; first full reconciliation
  always notifies completion, including an unchanged empty result. Unreconciled
  list rows carry optional pending=true (v1); clients keep phase=loading and prior
  data (null initially), never treating provisional empty rows as ready. Watched pending/errors retry
  at 5/15/60 seconds (capped), retain prior metadata and stop when unwatched or disposed.
  Cold pending rows have no client data and remain visible until readiness is known.
- The generic Thread metadata hook and badge slot carry no 企业身份 domain policy. The
  plugin is enabled by deployment and advertised capability, never a client switch.
- Sidebar owns one open Thread overlay. Badge buttons are independent of navigation;
  old close/focus callbacks cannot close or focus away from a newer overlay.
- Optional list modes use the generic `threadListGrouping` contribution: Shell
  owns menus, collapse chrome and navigation; the product owns grouping and order.
  企业身份 groups each loaded Thread only by recorded creator, own employee first,
  other accounts alphabetically and unknown last. Loading/error are distinct;
  collapsed groups keep metadata subscriptions. Group headers alone show avatars.
  Null mode/unload restores taskflow activity. Optional participation filtering
  defaults off, preserves saved explicit choices, keeps rows without snapshot data visible, hides ready empty results,
  omits its descriptor without a display identity and stays plugin-owned. Plugin-local mode/collapse/filter
  preferences are isolated by product/extension/verified account, never credentials
  or shared account authority; they do not change the active conversation.

Composer 编辑区最低高度按 viewport 统一：达到 768px 时为 64px；低于该宽度为 48px，不依赖指针类型。独立与内嵌入口、新会话与已有会话以及窄面板均使用同一规则，内嵌入口不得另设高度覆盖。内容继续自动增高至既有滚动上限。

Sidebar Server 来源以 metadata 项目名前的7px实心圆点呈现，仅 remote 显示，颜色来自 stableIdentityColor(serverOrigin.serverId)；容器保留 role="img"、From {server} 可访问名和至少12px命中区。提示使用可 hover 进入、可选中文案的 Radix Tooltip，通过 Workbench Presentation Root 脱离滚动裁剪；行 title、行高、状态槽和右对齐内容宽度头像槽不变。视觉复用符合 frontend/DESIGN.md 的浅色 Tooltip contract。

### 设置中的执行端归属

- 应用设置与执行端设置分别组织；已配置且启用的 Host 按独立身份呈现，同一物理地址不得合并逻辑 Host。
- SettingsPage 的 `targetHostId` 声明固定配置 owner。导航、概览、页面身份和传给 View 的 Host context 使用同一目标，不借用当前聊天 Host。未配置/已停用 owner 不挂载配置 View。
- Web 的 `local` 表示执行服务所在机器，不表示浏览器设备；呈现优先使用配置的 executionLocation，缺失时显示服务器端运行。状态只投影对应 Host runtime，不由页面制造连接。
- 执行端概览与配置入口走既有应用 Router，不改变聊天 Host，不新增服务器创建/编辑流程。主从页保持自身滚动，身份头由 Settings Shell 持有。
- Web 启动按 Host ID 补齐部署声明但尚未保存的连接；已有连接的地址、名称、停用与可见性偏好不被部署默认值覆盖。Codex 账户只有读取成功且为空时显示无账户，读取失败原位报错并允许刷新，不引导重新绑定。

- 验证：`tests/settings-machines.test.tsx`、`tests/settings-machine-navigation.test.ts` 检查当前机器入口、一级插件页面、高亮、PUSH/POP 与返回；`tests/extension-runtime.test.ts` 验证固定 owner 与无效 owner 原子拒绝。2026-10-12 已验证真实 Web 直连执行端及当前源码 Linux Electron 隔离 profile；macOS 桌面尚未实机验证。

- 执行端名称、位置和状态灯组成一个语义 button，点击名称行打开该 Host 概览；不再增加“概览”子项。概览只高亮名称行，配置页只高亮对应子项；所有入口继续使用同一 Router 路由，保留旧概览链接与 POP 恢复。

### 运行在（Work in）与机器分组

- 以下可选运行位置适用于完整工作台。嵌入的 WorkbenchPresentationPolicy 固定执行目标，关闭机器管理与 runtime Host 配置；不显示 Work in/Agent/机器设置，并在 action 边界拒绝选择、配置和 retarget 写入。固定 Profile 的观测只在 Application 内存，不能打开 standalone Host catalog。
- 机器分组只由 daemon 上报的 machineId 决定，不按 URL、域名、名称或 hostKind 推断；分组只影响呈现，不改变 Host 与 `(hostId, threadId)` 身份。机器显示名可由部署 `--machine-name` 设置，改名不改变 machineId。
- 读取机器身份不初始化引擎；未连接 Agent 的模型目录只在用户打开模型菜单时加载，加载与失败在菜单内原位反馈。
- 新的机器、Agent、项目选择撤销旧准备；晚到结果不得覆盖较新的意图。切换机器或 Agent 只读：目录在目标 Host 存在才保留，不创建项目记录。
- 切换运行位置保留草稿内容；暂不可用的附件原位标注，不静默删除。
- Web 不显示「这台…」；只有桌面端本机 daemon 所在机器显示「这台 Mac / 这台电脑」。云端资源生命周期与连接状态分开呈现。
- 设置的「运行 › 机器」使用同一 `groupWorkInMachines` / `workInMachineName` 投影：一台机器一行，未知身份 Host 独立成行，云端独立成组。机器内按 Agent 呈现目标 Host 的设置与连接，不在侧栏重复列 Host；旧 `execution-<hostId>` 以及身份晚到前的未知机器路由由 Router REPLACE 纠正。「运行」分组依次提供一级入口「模型服务」「Codex 账户」「机器」；前两项直达现有固定 targetHostId 的插件页，仅高亮对应入口，并以「用于」标签呈现机器归属。机器内入口与返回机器行为保留；idle 表示尚未启动，连接地址单行省略并提供完整 title。模型服务与 Codex 账户仍归各自 Host，不提供服务端统一中转或多机器选择器。
- 验证：`tests/settings-machines.test.tsx`、`tests/settings-machine-navigation.test.ts`、`tests/work-in-*.test.ts`、`tests/opencraft-daemon.test.ts`；Web 与 Linux Electron 实测，macOS 窗口、真实多机器与下游产品云端链路尚未实测。

### 服务器更新范围与任务连续性

- 更新页消费部署状态声明；仅显式配置并接通受管执行端时呈现「更新网站和执行服务」，普通网站保持原更新范围。本地源码与 npm 只在归档获取上不同，共用一个安装事务和持久化版本权威。执行版本来自实际网关健康响应，目标版本由执行指针持有，不能用网站目标版本冒充执行结果。
- 下载/启动失败不提交新网站；执行切换失败恢复旧执行版本，回退失败原位呈现真实状态。异步更新不强制刷新页面，操作不修改其他设置 draft。
- 执行升级仅覆盖网关、daemon 与 capability adapter。Codex core/CLI 和 DSH 引擎独立维护；Codex 原 turn 经重连恢复，OpenCraft 活动任务可能中断，界面明确说明。
- 验证入口：`test:server-updates`、`smoke:server-updates`、`smoke:server-updates:systemd` 和既有 `test:web-updates:e2e`。隔离真实 CLI/打包 gateway/生产 SPA 验证不等于线上迁移或发布完成。

## UI 图标：共享视觉语言

- 图形由 product identity 选择：OpenCraft core 保留新功能的语义图形，但视觉风格按下游产品 Agent Console 源码统一；下游产品嵌入聊天和完整 lightvela-web 保留固定回迁前组件的形状、描边、尺度、leading-slot 与选中/hover；颜色主题不选择图形或授予能力。每个 Shadow DOM/presentation root 独立投影 token，多实例不写 document 产品状态。
- core Web/Electron 导航角色对齐 `frontend/src/styles.css` 的 `.lv-agents-nav-icon svg`：Lucide 24 单位画布、14px、1.8 描边、圆端点和圆连接；普通控件按对应下游产品源组件的显式尺度与 Lucide 默认描边呈现；下游产品保留旧 Lucide/16 单位填充图形和显式描边；品牌标识、内容插图与上游生成资源独立，不由通用 SVG 选择器改写。
- `apps/workbench-web/src/components/ui/workbench-icon.tsx` 是导航、设置与面板扩展语义名到图形的唯一 Web 映射。扩展传递语义名；core 未知名称显示中性帮助图形；下游产品的导航/设置/面板保留旧 consumer 的 Blocks/Plus fallback，不误呈现为某个已知功能。
- `workbenchIconMetrics` 与 `icons.web.scss` 拥有尺度/描边 primitive，core 导航14px、1.8描边，普通/选中均为轮廓，选中含义由行背景和文字保持；下游产品按旧 consumer 的15/16/14px与原 SVG 属性投影，不强改其他旧组件的显式描边。导航前导槽位沿用 `--size-navigation-leading-slot`，直接 SVG 与包装槽位保持光学中心和文字起点对齐；unified Shell 对 core 上方目的地与下方 Settings 共享 Shell inline inset，不让窄屏通用 Settings padding 改变其中一列。紧凑工具按钮保留其宿主尺寸；不能将所有场景强制放大。
- 同一操作在展开/收起入口使用相同图形；状态变化不改变按钮命中区、焦点或布局。图标继承控件颜色，不另设选中配色。
- 独立 core 桌面 rail 的 16px 例外只作用于 rail 导航与 footer，不能在共同侧栏列覆盖 `--size-icon-navigation`，否则相邻 Settings 与商业产品会被一同放大。core Settings 仍为 14px 导航角色；下游产品导航/Settings 保留原 consumer 的 15/16px。产品隔离浏览器选中真实 Settings，比对固定旧 Settings 图形并独立校验 Palette/SunMoon 家族；Home/New chat 不再冒充旧 Write。浅深与 DPR1/2 分别核对，不以更新截图或复制当前 resolver 代替兼容预期。
- 验证：`npx tsx scripts/smoke-icons.ts` 使用真实导航组件检查浅/深色、DPR 1/2、选中与折叠按钮几何，生成图谱和结果 JSON。下游产品目录的 `npm run smoke:sidebar-icons` 另挂载真实 unified AppShell，检查宽窄侧栏双列几何、普通/选中及 下游源样式/图形对照；三面 release 用 `smoke-product-isolation.mjs` 检查根隔离。Web 构建与组件证据不代表 Electron 原生窗口验收。


### 回迁后的固定嵌入与业务 SQLite

- Thread 记忆按现有 product/Host/Profile 加当前 account/region 作用域；未知账号归属的旧 selection 不转给新账号，不删原历史。账号撤销、路由/草稿代次及 Application 释放共同隔离晚到结果；隐藏/重新显示与重连不重建草稿或机器 authority。
- Node SQLite 一个物理文件只能有一个迁移/连接 owner；Codex queue、sender、企业身份 presence/state 同库，metadata consumer 不再 CREATE 或独自关闭。Tasks/SSH 已发布 SQL/hash 不变，未知账本拒绝，已知旧记录在备份/原子转换中保留；没有空列表替代已知旧库数据。
- Local Agent 配置目录的 Tasks 属于启动 gate；可选 Codex Tasks/SSH 私有 owner 按功能真实使用打开，能力成功回执先验证数据。迁移 outcome 不代表全部可选引擎已初始化，不把失败库误报 ready。
- 验证：`tests/downstream-sqlite-lifecycle.test.ts`、`tests/workbench-product-icons.test.tsx`、`tests/work-in-draft.test.ts`、下游 `products/<product>/tooling/smoke-product-isolation.mjs`。真实三面 release DOM、企业服务/RFC6455/AppServer bridge、浅深×DPR1/2 的外部边界为本地合成账号/Host；完整 gate、真实企业账号/推理/SSH/发布仍留后续阶段。

### Header 首帧与浮动侧栏几何所有权

Header 的可见导航 rail 用 `max-content` 在同一次布局中保留真实控件宽度；面板动画只扩展外层槽位。Header 是控件测量值的唯一写入者，测量只投影给跨面板消费者，不反馈为该 rail 的最小宽度；Shell 不因侧栏或窗口 chrome 变化覆盖该测量值。

测量副本首次同步读取后，由同一 `ResizeObserver` 持续观察 border box；动作、品牌或字体改变实际尺寸时更新投影，等价 React 输入或侧滑状态不得重建观察器、重复同步测量。尺寸优先取 observer entry，缺失时回退几何读取；padding/border 变化同样必须更新，保留零尺寸保护与亚像素阈值。

浮动 Sidebar 的打开状态控制遮罩和切换按钮，不改变底层 Header 的导航动作集合和标题起点。只有停靠 Sidebar 接管展开导航时才移除底层新建动作。移动端打开、关闭、快速反转浮动 Sidebar 时，标题起点须逐帧稳定。停靠 Sidebar 仍按面板动画与动作集合变化调整标题位置。


## 受管站点品牌独立 Web 外观与导航

受管站点服务器显式启用 `join.server` 插件，插件拥有受管站点品牌名称、吉祥物、favicon 和安装清单；通用 Shell 通过 `applicationBranding` 独占贡献槽消费品牌，停用后恢复 OpenCraft。其他 Web 不隐式选择受管站点品牌。受管站点独立网页启用该插件时，吉祥物与受管站点品牌位于跨会话、任务和设置页面的统一 Header 左侧，侧栏开关在品牌区域右端；不显示左右历史箭头。紧凑布局品牌参与 Header 的真实测量，收起侧栏不隐藏品牌；触控布局的主页面Header隐藏图标与字标（侧栏Header保留），并从可见及测量轨道同时移除品牌宽度，让出会话标题空间。初始 HTML 与 Shell 文档标题使用受管站点品牌，当前页面/会话名仍前置；Electron 保留 OpenCraft，嵌入工作台不写宿主 document.title。中文开始入口为“开始整活”，任务与 Collaboration 的既有 action 保留；桌面图标栏仅显示图标，通过 aria-label 与 Radix tooltip 提供完整名称，不展开“玩一玩”标签；手机抽屉仍呈现完整文字行。

独立入口提供可选 Mist 浅深主题，侧栏与正文使用接近的中性底色，沿用主题偏好保存/恢复；下游产品嵌入不注册 Mist，现有默认主题不变。受管站点 Web 右栏初始使用既有 compact 档位，不改变已有拖拽或持久偏好。

有 Shell 导航的移动 Web 在 ≤640px 时，顶部栏 56px、按钮点击区 44px、图标 20px，标题使用既有 control-large 角色；固定与浮动导航 Portal、测量副本和正文顶部偏移保持同一高度。前进/后退保留在展开导航中，为顶部标题留出空间。宿主无 Shell 导航时继续拥有标题栏高度，桌面不变。

### Unified Shell 会话横向留白

触屏行高仅消费密度token：单行max(32px, --size-control-hit-min)，两行最小max(48px, --size-control-hit-min + 12px)；状态、头像与行菜单垂直居中。漏斗/右键的模式radio与filter checkbox共享indicator槽与文字轴，四种locale/桌面触屏均保留间隔。

core unified Shell 桌面将60px图标栏与列表列分开，移动抽屉纵向菜单位于全宽列表上方；列表标题（含筛选入口）、日期标题与会话行消费同一列表列inset，头像按内容宽度右对齐、右边缘与菜单间距固定。一行/两行共享右边缘，工作目录置于标题下方辅助行，无独立底板，过长省略，不占用标题行宽度。unified默认335px、最小300px（原列表默认275px/最小240px加60px图标栏），旧保存宽度按新最小值夹紧，未保存时消费frame新默认值；手机抽屉沿用正常侧栏宽度，仅按屏宽减24px收窄，不再强制扩至屏宽84%，不写回桌面宽度；独立/嵌入侧栏保持原宽度。图标行的 icon-label gap、会话层次、右侧状态与菜单命中区保持原语义。下游产品两面保持旧 consumer 留白。

`scripts/smoke-sidebar-thread-insets.mjs` 挂载真实 AppShell + Sidebar + ThreadRowMenu，以合成短/长标题、日期组、项目和状态测宽窄固定/浮动、选中/hover浅深几何；此前 Settings 列测试不代替会话消费链。

- Sidebar 会话行的产品徽标独立于共用状态/操作尾槽；运行、Goal、待处理、未读等仅用一个状态渲染器。桌面指向/聚焦/打开菜单时切换点号；触屏在同一44px菜单目标内并列状态与点号，不能另留状态列或重叠/挤动标题。

- Sidebar 共用尾槽沿用桌面28px、触控44px目标，与参与者内容间隔4px；头像不得占菜单点击框，状态画在同一框内。无菜单权限仍在相同位置呈现状态，不伪造操作。

- Sidebar 菜单占位由 ActivityItem 自身拥有，不依赖 ThreadRowMenu 或 Host 管理能力。断线、恢复、能力不可用和恢复不能改变标题、Server 来源、状态及徽标坐标；无授权时仍不呈现操作菜单。

- 受管站点品牌独立 Web 入口声明同源应用清单，固定 id/start_url/scope 为根路径，standalone 显示并提供 192/512 PNG 安装图标和 180px apple-touch-icon。Electron、嵌入式 Workbench 和下游产品 Web 不挂接受管站点应用清单；不通过 Service Worker 缓存会话、API 或页面来模拟离线能力。

## Mobile keyboard Composer budget

The mobile browser Composer uses the Shell's published VisualViewport height,
including iOS keyboard resize/pan. Queue and long editor content scroll within a
bounded stack; the action footer does not shrink or enter the editor scroll area.
Keeping the keyboard open must leave the Send hit target inside the visible
surface and permit the first touch to submit. Height changes preserve the editor
node and draft. Desktop and Native keep their own presentation rules.
Verification: `scripts/smoke-composer-keyboard-viewport.ts` simulates iOS
VisualViewport with queue/long text, offsets, light/dark and keyboard dismissal;
physical iPhone/in-app keyboard verification remains a separate surface.

Full-width Terminal consumes two separate geometry owners: the Shell follows the
VisualViewport once; the Composer publishes its measured bottom occlusion,
including bottom padding and the visible latest-turn card, to the Shell anchor.
Terminal's inset consumes that reserve and its existing FitAddon/ResizeObserver
updates the PTY grid. Ordinary-tool overlays are absolute children of the Shell
anchor, so pan/focus and changes of containing-block origin move them with the
same viewport without copying client rects into another body-fixed viewport.
Browser overlays retain their separate body-level plane above native/iframe
guests; this exception does not give Terminal a second viewport owner.
Shell/document structural frames and Terminal's frame/inset/host use non-scrolling
clips, not hidden scrollports. A native focus reveal must not change their
scrollTop. Only the timeline, Composer text/preview and xterm viewport own content
scrolling. In particular, shrinking xterm can leave its invisible IME textarea at
an old row until the next cursor update; revealing that node cannot scroll the
application frame. Do not repair this by scrolling the window in a loop,
refocusing, clearing selection or remounting either editor. Expanded latest-turn content scrolls within the remaining
tool budget instead of taking layout-viewport `vh` space behind the keyboard.
A very short touch tool container hides optional turn history and limits the same
scrollable editor to one line, retaining its controls; more space restores it.
Inline presentation releases the reserve; editor, draft and terminal identities
survive all geometry changes. Browser floating presentation retains zero reserve.
Touch Terminal uses a lighter theme-derived glass; opaque accessibility fallbacks
retain priority. A docked keyboard uses a small gap, while keyboard dismissal
restores the Home-indicator inset. iPad desktop UA with touch is still iOS;
hardware/floating keyboards that do not shrink the viewport do not create a fake
full-width inset, and pinch zoom is not classified as a software keyboard.
`scripts/smoke-terminal-keyboard.ts` exercises real Shell/RightPanel/Terminal and
Composer components with Terminal → Composer focus reveal, shrink/pure-pan/
dismissal, scroll ownership, a shifted fixed-containing-block origin and a hidden
scrollport negative control. The origin shift is an adversarial coordinate test,
not a native keyboard simulation; this cannot prove native
floating-keyboard occlusion when the browser supplies no rectangle.

- DIC-13：触控 Web 的触摸输入框长按450ms复用语音插件和现有瞬时输入事务；短点、触发前移动、已有文字选区、鼠标和能力不可用时不接管。松手完成识别并保留明确发送动作，上滑64px、系统取消、后台和卸载取消并保留原草稿。启动权限尚未完成时的松手只在实际listening后结束该代次。输入框节点和草稿身份保持；由共享交互密度提供至少44px麦克风触摸框；实际 touch 事件才可长按，屏幕宽度不限制入口，覆盖 iPad、折叠屏展开/分屏及混合指针设备。

- WSP-34：交互密度独立于窗口宽度、主题和当前 hover/focus 输入方式。共享安装偏好 `interface.touchFriendly` 为 auto/on/off，默认按 any-pointer:coarse 自动启用；手动选择持久化，恢复自动后继续跟随能力变化。Document 的 data-ui-density 投影 shared hit-target/gap token；导航、菜单、Settings、共享按钮及 Composer 复用，不能按手机宽度重判或各自硬编码触摸尺寸。窄布局与可用空间仍由 Shell/容器模型拥有。实际鼠标不能触发输入框听写；显式关闭撤销长按入口。

### Sidebar 折叠分组密度

等你处理、置顶、最近共享紧凑的分组节奏：折叠标题与更多/收起之间使用4px间距，展开列表与下一分组使用12px间隔。折叠内容不占位。触屏标题与更多/收起保留至少44px命中高度，SidebarSection角色在触屏密度下为16px/22px、500字重；桌面为13px/18px。密度由共享偏好与触屏能力决定，不按窗口宽度重新判定。计数继续使用metadata层次，分组标签与内容保持同一leading轴。

## Sidebar attention and read receipts

Execution and read state have separate owners. `waitingOnApproval` and
`waitingOnUserInput` project `review`; other active work remains `running`.
The attention group contains only backend waiting and error states. Completed
results, including unread replies and historical results, stay in pinned/recent;
unread remains independently tracked; the compact sidebar omits its blue dot. No manual acceptance lifecycle is inferred.
Reading never resolves a backend wait or error.

The Application owns `ThreadAttention`, whose receipts identify Host/Thread/Turn.
The browser adapter scopes persistence to provider-verified account identity;
account changes revoke pending reads. Selection alone is never a receipt. A
terminal Turn marker must intersect the actual foreground, focused scrollport
and pass an occlusion check. Old-turn receipts cannot clear a newer result.
History catch-up is a latest-Turn metadata-only read, bounded to 50 catalog rows
and three concurrent requests per admitted Host; it never resumes or executes,
never dials an idle SSH Host, and a failure cannot cause a retry loop. Local
receipts survive refresh; cross-device receipt synchronization is not provided.
Unread, review and error dots are identical5px neutral tertiary marks in the
shared activity/action lane after product-owned participants. No separate status
column remains; distinct state labels and auxiliary text retain their meaning.
An active native Goal uses a neutral Target in that same slot, replacing
ready/running feedback, including gaps between Turns. Opening a Thread and
backend review/error feedback retain priority. Paused, limited, blocked, complete
or cleared Goals return to ordinary activity feedback. The icon is a read-only
projection, never a Goal scheduler or a read receipt.
The Target has a subtle 3.2-second mask shimmer with 65–100% opacity, without
rotation, scaling or row movement. The shared 15/16px glyph material samples the
200%-wide mask in 64 positions per cycle (20Hz), limiting visually redundant
subpixel repaints. This decorative cadence must never throttle Goal updates,
spinner feedback or directly manipulated drawer motion. Reduced motion renders the unmasked static
glyph; inert or aria-hidden hosts pause the animation.
The Composer Goal row uses the same Design System glyph motion while active;
paused, blocked, limited and completed rows remain static. The row's text and
geometry never animate with the Target.
Running spinners, Goal targets, pending indicators and dots share the same end
lane across rows; touch pairs the activity and action cue inside its44px target. The row target spans the grid, while the independent avatar
control occupies its own column without nesting buttons or moving on hover;
review/error and running feedback keep their own semantics. A product supplying
participation evidence must positively identify the viewer as creator or participant
before displaying unread; missing metadata or signed-out identity shows no dot.
This eligibility is independent of the personal-list filter and creator grouping.
A deployment may opt into `VITE_THREAD_UNREAD_RESET_BEFORE` (fixed Unix seconds).
Metadata catch-up acknowledges terminal results at or before this baseline before
publishing them. A missing completion timestamp uses the catalog update time.
The baseline is fixed across future builds and all accounts/browsers; it must never
advance on every build or first visit. Newer offline/live results remain unread,
and stale reads cannot acknowledge newer live results. Unset/invalid values
preserve normal read behavior; this is not a change to backend waits or errors.
Tests: `thread-attention.test.ts`, `thread-catalog-query.test.ts`,
`scripts/smoke-thread-attention.ts` (real DOM/intersection/occlusion; platform focus is substituted because Playwright forces tabs focused).

## UI font preference (2026-10-15)

Web/Electron UI and prose consume the shared typography registry with bundled Inter Variable / Inter first, followed by the existing system and CJK fallback order. Native continues to use its system face. The initial family-preference change retained metric values; subsequent semantic metrics and usage are governed by [UI-TYPE-1](ui/typography.md). Monospace family preferences and platform smoothing remain independent. Font loading and theme changes must not introduce clipped navigation or horizontal overflow.

## Thread list typography (2026-10-15)

Web/Electron conversation list titles consume the dedicated `threadListTitle` role (13px, 20px line height, regular weight) and normal letter spacing, with body tracking also normalized by UI-TYPE-1. Header, chat, metadata and code metrics keep their existing roles; row heights, hit targets and theme colors are independent. The Native alias retains the existing thread-title metrics and has no new consumer.

### Asynchronous operation feedback

Workbench asynchronous action failures use `AsyncNoticesProvider/useAsyncNotices`
in a top-right nonmodal overlay. Features must not append error blocks to menus,
list rows, dialogs or nearby content and change their geometry. Pending feedback
stays in the existing action slot. Header rename/pin/archive/fork, task membership,
sidebar conversation actions and archived-conversation restore share the channel.
Messages are localized user-safe copy, optionally identified by conversation/task
name, with no raw RPC error text. Unknown mutation results are never auto-replayed.
The provider owns stable operation/entity IDs, default five-second dismissible
notifications, and a maximum three visible notices. Sonner owns focus-preserving
announcement, keyboard/swipe and pause/expiry behavior. Full and embedded roots
have independent channels; the latter portals into its styled presentation root.
Provider disposal dismisses its notifications and invalidates late publishers.
Input validation may use a fixed reserved field slot; cold-read errors replace the
existing content state rather than appending a second feedback region.

Toast management additionally exposes `info/success/warning/error`, scoped
`dismiss(key)` and `dismissAll()`. Presentation dismissal and history deletion
are different operations. Desktop and touch Shell headers do not expose a bell
or reserve a notification-center action slot. Transient Toast feedback remains
independent of any history consumer. The provider retains bounded history, which is
in-memory per Workbench instance and cleared by disposal/reload; it is neither
a cross-device inbox nor the approval/failure task-attention model. Details and
consumer contract: [Toast notifications](../docs/toast-notifications.md).

## Reasoning presentation work

Thinking ownership is resolved before Markdown header compilation. Reading a
live todo never materializes the transcript. A mounted Turn may retain bounded
plain reasoning presentations by Item, selected source and active grammar mode;
reprojection reuses unchanged history while edits and completion invalidate the
affected Item. The full canonical body, disclosure identity, explicit user
choices, drafts, focus and scroll ownership remain unchanged. No process-global
private-text cache or truncation is introduced. See [ChatUI reasoning](../docs/chat-ui-architecture.md).

## Chat document tracking (2026-10-15)

Web/Electron chat documents and lazy/error source fallbacks use normal letter spacing, independent of the Shell body’s -0.01em tracking. Assistant prose and formatted user messages share the document root, so headings, paragraphs, lists, tables and nested content inherit the same natural spacing. Existing family, size, line-height, weight, paragraph rhythm and code font selection remain owned by their current renderers. The composer and Shell are outside this document boundary; conversation list titles keep their independently approved 13px/normal role.

## Conversation selection quote (2026-10-15)

Selection-to-chat is available only in compact layout. The existing `data-ui-density` authority disables its floating action and selection listeners in touch layout, including live preference changes; native text selection/copy and desktop quote insertion remain available.

Web/Electron Conversation owns one Radix selection menu for its timeline. Selection must remain wholly inside one assistant/user chat document; sender metadata, composer, controls and cross-message ranges do not qualify. Activation revalidates the range and current composer target before insertion; scrolling, resize, Escape or navigation releases the floating surface. Markdown presentation controls are excluded and partial code selections never expand to a full block. ComposerController delegates appendQuote to the physical editor; unsupported, submitting, transient or detached Views reject it. The editor appends literal text as an undoable quote block followed by a normal paragraph, focuses its end and preserves existing draft/assets/context. Selection never submits a message. AppServer compilation uses the existing quote serialization contract.

Selection quote anchors use a Range rectangle intersecting both the conversation scroll root and browser viewport. Long selections retain their full content while positioning at the first visible selected line; wholly offscreen selections expose no action. A DOM-visible but clipped/offscreen paragraph is not a valid floating anchor.
Sidebar icon rail uses the shared frame width (60px) with centered 44px action
targets, leaving about 8px on each side including the divider. Footer actions
share the same axis. Default/minimum combined widths continue to derive from
list width plus rail width; mobile stacked navigation retains its own geometry.

### Small-screen unified sidebar presentation (2026-10-15)

The browser drawer uses `data-navigation-layout="mobile"` with its own
`shell-navigation.mobile.scss` presentation layer. Full-width application rows (44px minimum targets) and the conversation context
share one native scrollport. Home, the other application rows and filters
scroll away together. Mobile New chat and Settings float above the bottom of the
scroll track; the mobile account entrance is omitted. No horizontal navigation
scrolling. This replaces the earlier mobile horizontal strip, sticky Start and
bottom account track; desktop retains its icon rail and footer.
Actions, translated labels, account controls, list/filter state and portals are
shared; resizing must not recreate those owners. Mobile search and participation /
server filters belong to the same native scroll viewport as the conversations,
so an upward swipe scrolls them out and returning to the top restores them.
Desktop Start uses the same quiet navigation treatment as other destinations,
without a primary dark fill. Desktop keeps controls fixed and only its activity list scrolls. Selected-row
visibility checks consume the viewport actually used by the current presentation.


### Sidebar matching-results continuation

The footer offers only Load more when the current search/server/personal-filter
result has recent rows omitted by the ten-row display budget (selected-row
inclusion counts as visible). Filtered-out conversations do not count toward
continuation and never generate a hidden-people notice or Show all action. Loading
expands the matching rows without changing any filter; once all are visible the
footer disappears, with no Show less toggle. Product grouping owns its own rows
and does not receive the standard task-flow continuation button.

### Shared floating material

Participant popovers and model/toolbar menus consume `menu.web.scss` `material`: elevated-secondary at 90%, 8px backdrop blur, shared border/radius/shadow. Page/sidebar backgrounds may be translucent and are not floating-surface tokens. Material is independent of menu geometry, typography and selection behavior; the participant popover retains its Radix and content ownership. Browser evidence: `scripts/smoke-participant-menu-material.ts` compares computed material across Codex/Frost/Lavender light/dark and desktop/touch.

### Desktop navigation surface (2026-10-15)

Unified Shell uses a 60px icon rail with 36px desktop controls, 16px glyphs, and 18px account avatars. Controls consume the shared application-navigation row/density token, expanding to at least 44px in touch-friendly density; labeled mobile rows retain their original 20px glyphs and neutral current-page highlighting. Home is the single conversation-area destination for both existing chat and draft routes, invoking openChat without creating a new draft. Desktop retains a full-width New chat row directly below Conversations. Mobile projects the same creation action into a Shell-owned floating pill over the bottom of the scroll track, with a circular settings button on its right. The floating settings button composites its secondary state tint over the existing theme opaque elevated surface in resting, hover and pressed states, so list content cannot show through. The mobile account/avatar entrance and bottom plate are omitted; desktop retains its rail footer. The list reserves space so its last row can clear both controls. New chat dismisses the mobile drawer. The generic Settings entrance retains the open mobile drawer while its shared left slot becomes settings-category navigation; only an explicit category selection dismisses it, including selecting the already active category. Desktop keeps its direct default Appearance route; route normalization and explicit deep links do not create a new drawer or a second navigation owner. Filters retain their existing scroll lifetime; mobile search is a floating header action. Real Shell browser coverage: `OPENCRAFT_GESTURE_FAB_ONLY=1` in `scripts/smoke-mobile-sidebar-gesture.ts`. The toolbar exposes the sidebar toggle and preserves the measured native-window safe area; history remains in the router/browser without rendered arrow controls. A standalone managed site has a mascot/wordmark brand region in compact layout, sized from the default sidebar metric and capped by viewport space, with collapse at its trailing edge. Touch layout or a browser window whose unified sidebar has moved into its narrow drawer hides both the mark and wordmark in the persistent page header and releases the reserved rail width in visible and measurement copies, retaining navigation controls. The narrow browser rule also applies with compact density; wide compact browser and native desktop branding remain visible. Drawer headers retain the wordmark and a plugin-provided leading mark; plugins can opt out of their mark. The managed site retains its mascot there, replacing the internal mobile collapse button. The closed page retains its plain sidebar entrance, matching right-panel chrome. Search keeps its separate glass circular control. The existing data-ui-density preference owns interaction density; Shell owns the separate narrow-browser branding condition from its existing docking decision. The browser header uses the shared surface color, avoiding a separate gray empty strip. The context column and context-free main frame meet the toolbar and rail with square top-start seams; context presence changes neither saved width nor DOM ownership. Cards and modal surfaces retain their own semantic corner tokens. Tasks owns its single title above its Board/List toolbar; shell chrome omits duplicate management titles. Embedded shells retain their host presentation.

### Right-panel toolbar divider alignment

The right-panel toolbar consumes `--height-toolbar` as its content height. Its 1px bottom border is outside that height, aligning its top edge with the main content frame origin. The row must not flex-shrink; adding a border must not shorten the shared toolbar aperture or move its control centerline.

### Unified navigation conversation search

The unified desktop Shell exposes conversation search as a `shell.search` rail action, using the same navigation sizes and accessible tooltip as other actions. The mobile drawer projects that same action into a floating glass header button beside the wordmark, hiding the duplicate list row. It replaces the inline sidebar search input in that presentation. Cmd+K on macOS and Ctrl+K on Windows/Linux open the same app-level search from conversation and management routes, including while a composer is focused. Other dialogs and IME keep keyboard ownership. ModalSurface/Radix owns focus trapping, Escape, outside dismissal and focus restoration; search never rewrites the composer draft or sidebar filters/scroll state.

The modal searches titles in the existing multi-Host loaded catalog, explicitly labels its all-server scope, orders by recency and identifies each result's server. Host + Thread remain the selection identity; disabled interactions stay disabled. Arrow keys and Enter navigate through the existing `selectConversation` authority. Closing clears the ephemeral query; presentations without unified navigation retain their original inline filtering. Evidence: `tests/conversation-search-shortcut.test.ts` and `scripts/smoke-conversation-search.ts`.

### Conversation group disclosures

Group headings omit counts and keep the chevron immediately after the label.
Opacity alone changes for fine mouse hover or keyboard focus; reserved geometry
and the full-row button remain stable. Mobile layout and coarse/touch input keep
the chevron visible, with a 44px mobile target. Existing aria-expanded/controls,
collapse persistence and plugin grouping ownership remain authoritative. Real consumer coverage:
scripts/smoke-sidebar-thread-catalog.ts.

In unified Shell, each collapsible group heading sticks to the top of the current
native scrollport only while its own section passes through it. The next group
takes over without stacking headings. Desktop uses the activity-list scrollport;
mobile uses the shared navigation scroll track, so Home and other navigation rows
still scroll away. Its floating brand header is reserved once by the scrollport's
block-start padding; sticky headings retain zero additional block-start inset.
The active heading's visible top equals the real header's bottom, not the
scrollport origin plus a second toolbar height. Tests measure that chrome edge
independently and sample continuous scroll phases to catch blank gaps or row bleed.
The original disclosure remains the interactive owner, with
an opaque context-surface background over the rows and local stacking below Shell
chrome. Each group's item container forms its own isolated stacking context, so
row badges and avatar stacks cannot paint over the sticky disclosure. Participant
popover portals retain their existing floating-surface ownership. No duplicate
headings, scroll listeners or additional scrollports.
Real Shell coverage: OPENCRAFT_SIDEBAR_STICKY_ONLY=1 in
scripts/smoke-sidebar-topology.ts.

### Consolidated conversation filters

The conversation heading's single Filters button contains the existing display-mode radios, optional Only my conversations checkbox, and server radios. The separate participation/server chips are removed on desktop and mobile. Checked items reflect the existing plugin participation preference and Shell server preference; the closed button emphasizes active filters through its foreground and summarizes them in its tooltip, without a resting fill. Missing identity still omits participation filtering, and a saved server absent during loading never broadens the result scope. Radix owns keyboard/focus/dismissal and viewport-constrained menu scrolling. Evidence: `scripts/smoke-sidebar-thread-catalog.ts` (filter operation, offline continuity, reload persistence) and `scripts/smoke-sidebar-topology.ts` (desktop/mobile/touch scroll geometry).

Conversations has equal block spacing from the existing navigation section token.
Desktop New chat is an unfilled quiet action with no extra top margin; the mobile
floating New chat retains its primary fill.

Conversation filter triggers use primary button fill and matching foreground while open or keyboard focused, rather than a persistent outline after menu focus restoration. Forced-colors mode retains the shared focus indicator; filter state and menu ownership remain unchanged.

Unified Shell sidebar controls share one SidebarToggleButton contract. Docked mode presents it at the sidebar navigation rail top; floating/mobile mode presents it in the fixed sidebar header and dismisses the drawer. The persistent Header only renders the closed-state entrance, with compact brand geometry. No duplicate floating pin/toggle or collapsed Write action is synthesized for unified Shell. Existing gesture, resize and stateful sidebar portal owners remain authoritative.

Desktop browser application branding centers the plugin-provided mark on the shared sidebar icon rail, deriving the offset from rail width, mascot size and leading chrome padding. Header measurement and collapsed routes use the same alignment; labeled mobile drawers and native window safe insets retain their own presentation.

Unified sidebar recovery: desktop visibility is explicit dock open/closed, with no
hover/edge preview. Small screens use one explicit drawer request and existing
mobile gestures; crossing back into dock capacity transfers that request into the
desktop dock. Resize restoration hysteresis never blocks an explicit expand.
Shell alone resolves sidebar commands (button and Cmd/Ctrl+B); route App shortcut
handlers do not write visibility. Layout-transition/exit states only retain physical
content ownership, never create a third user-selectable visibility state. Shared
portal content, draft and scroll survive fast reversals and responsive transfer.
Verification: `scripts/smoke-sidebar-topology.ts` covers pointer pauses after collapse,
animated reversal, threshold+16px explicit recovery and automatic drawer-to-dock.

## UI-TYPE-1 — Semantic typography ownership

Implemented: the existing registry owns semantic metrics; owned Web, Native and
plugin consumers project those roles, independent of tone/state/geometry. Current
configuration values (model, effort, permission) share the regular compact role;
explanatory copy never consumes a button role. Exact specialist exceptions are
reviewed, not a debt baseline. Contract and Agent routing: [typography](ui/typography.md).
Evidence: `check:typography`, `test:typography`, `smoke:typography`. Mac/Windows font
rasterization and Native hardware remain separately reported platform acceptance.

## Navigation preview author identity

The navigation hover/focus preview reads the selected prompt sender, never the viewer or a later steer author. Photo resolution reuses IdentityAvatarContext/AvatarImage. Known identities retain a fixed avatar slot on missing/failed images; unknown authors have no avatar. Existing Turn marker topology, preview caching and stale-result fences remain unchanged.

Goal time uses full days and remaining hours/minutes rather than unbounded hours. The server counter remains unchanged. Evidence: `scripts/smoke-thread-goal-ui.ts` (316h36m → 13d4h36m).

### Files entry in the right panel

The built-in resource plugin owns one Files creation action for both empty-panel launcher and new-tab picker. Its directory comes from the current conversation toolbar context, with a stable directory resource tab; previews opened elsewhere cannot replace that retained tab. No directory means no action. Host filtering still owns embedded availability; the launcher does not grant filesystem permissions or change tree/preview lifetime.

- Browser storage startup failures are not release asset failures: dynamic-import
  rejection must reach the storage recovery boundary; early recovery retains
  saved data, gives a reload action, and does not expose raw storage diagnostics.

分支会话的参与者不继承父会话：新分支头像先显示已认证创建者，后续实际接收的用户消息增加参与者。历史消息继续保留原作者。继承来源由Host持久化，刷新、重连与再次分支不能将历史作者恢复为新分支成员；创建者在头像列表去重。证据：`tests/enterprise-identity-participants.test.ts`、`tests/codex-message-senders.test.ts`、`scripts/smoke-fork-participants.ts`。

- Workspace resource panels default to a collapsed file tree for all file types; the header folder
  toggle remains available. Manual visibility takes precedence for that panel
  lifetime, preserving mounted viewer/tree state while browsing files.

## Installed plugins in Settings

Web/Electron Settings expose Plugins without internal developer mode. Settings
and the Skills extension tab render the same application-owned catalog, combining
Supervisor runtime records, Manager installations and registered contributions.
Built-in, disabled and failed entries remain visible; opening Settings never
activates a plugin. Only Manager-owned entries expose enable/disable; critical
built-ins remain protected. URL installation retains its developer-only audience.
Hostless and connected workbenches consume the same runtime owners.

Panel chrome uses one paired outline glyph contract (`SidebarToggleIcon`): visibility changes the divider geometry rather than adding a chevron. Right panel chrome mirrors that pair within a fixed optical slot, retaining an opacity-only cross-fade without translation or scaling. The Header end-slot reservation is capped by its own context width: full-viewport panel geometry must never push the persistent trailing action beyond the viewport during expansion or reversal. Both entrances consume the neutral `chrome-button` foreground and transparent surface, without an independent selected background. Hover feedback requires a fine hovering pointer; touch feedback lasts only while pressed.

Collapsed sidebar entrance ownership follows requested visibility, independently of the floating drawer's retained exit/gesture presence. Closing restores the persistent Header control in the same render while the existing drawer exit animation and content lifetime finish normally.

Touch unified Shell keeps one persistent sidebar action and its measured Header slot across open/close. The same button node is projected into fixed chrome above drawer motion and below dialogs; drawer/rail copies are hidden and drawer branding reserves its leading space. The installation density preference selects this presentation at any viewport width, with compact ownership unchanged. Closing intent remains separate from retained animation presence.

- Conversation schedules are created only from a confirmed existing conversation's action menu, and appear only with explicit Host scheduling capability. Closing the View does not own the schedule lifetime. Edits keep their captured revision/draft during polling; mutation errors use the shared non-blocking notice owner. Pause/delete do not pretend to cancel already-admitted execution. Desktop and touch consume the same schedule protocol and existing adaptive Modal/Settings primitives.

Panel toolbar creation contributions (those carrying `creationLabel`) are available in creation/tab menus and the empty-panel launcher, without duplicate kind buttons on the bar. Non-creation toolbar actions and the fixed new-tab/tab-list slots retain their ownership on desktop and touch layouts.

实时文件变更数字的裁切框、每格高度和滚动位移共用继承行高，不能用字号裁切较高的行盒；连续更新、位数变化和隐藏再显示都收敛到完整可读的当前值。保留tabular数字、原始计数与减少动态效果。证据：`scripts/smoke-turn-diff-counter.ts`（真实字形范围及旧几何负例）。

Touch Header panel entrances use one shared outer-edge spacing token (2px), bounded by host safe-area insets. Their 44px targets remain intact; wide touch chrome retains its stationary sidebar placeholder, while narrow mobile chrome moves with the foreground page and drawer branding occupies its own leading slot. Compact/native chrome keeps its existing padding.

- Conversation list schedule markers consume the Host schedule summary rather than issuing row-owned reads. Active/paused use one neutral 16px clock after the truncating title and before participant chrome, with no animation, extra row height or independent touch target. The tooltip/accessibility label conveys next-run, paused or needs-checking state. Execution activity retains its separate owner and slot; configuring a plan never changes a conversation’s section; running is row feedback, not a section.

## Composer attached rail
The queue and goal remain in the attached rail. The active Turn's file summary is a separate, content-width pill centered above that rail and editor, with the shared floating-summary gap, full radius, theme opaque elevated material, subtle border and low elevation. It never shares the attached rail's perimeter, tuck or mask. Long labels truncate while diff counts remain visible; narrow/floating/keyboard placements follow the actual Composer. Empty summary adds no height. Approval replacement retains the same independent summary. File review, counters, draft and queue ownership do not change. Geometry and material consume design-system tokens. `scripts/smoke-composer-attached-rail.ts` covers occupancy, separation, themes, review and draft identity.


## Touch Newera composer
`chat.touchNewera` is an installation UI preference: absent a saved choice, standalone workbench defaults on and embedded workbench defaults off; only the conjunction of enabled preference and touch density selects this presentation. The existing density binding projects it to the document; components do not read storage or create a second draft. Theme-derived Newera tokens own the restrained translucent material, highlight, blur, radius and geometry, with opaque fallbacks for unsupported/reduced transparency and forced colors. The attached queue/goal rail has its own translucent material in both desktop and touch layouts, independently of Newera and editor material.
An empty editing draft with no attachments, transient text or suggestions stays
one line through editor focus, autofocus, toolbar and portaled menu focus. Focus
is input ownership, not a layout expansion signal. Actual draft content,
attachments, suggestions and active submission workflows select the full layout.
Clearing content returns to the single row even while focused. There is no
separate editing-session state, focus-height animation or manual expansion toggle.
Dictation from an empty draft replaces the same single row during preparation,
listening, transcription and retry. Reserving a provisional selection does not
focus the editor; cancel restores its activation entrance and final text focuses
the same editable view. Grid presentation never reparents/remounts the editor or
command controls. Footer measurement supports display:contents using the existing
shell; circular touch targets remain 44px with clipped hit regions. Disabling
Newera or compact density restores standard presentation with the same draft,
selection and command owners. The backdrop sees scrolling content, with
independent attached-rail glass and opaque accessibility fallbacks.

Composer glass is a non-interactive background pseudo-element, never a filter on
an ancestor of the native editor/caret. The shell owns layout, border, shadow and
focus; material variables select ordinary/Newera and opaque accessibility fallbacks.
Scrolling or keyboard viewport updates must not rewrite the selection, recreate the
EditorView or blur/refocus it to repair painting.

Desktop Web keeps the editor opaque while touch editors use glass; queue/goal
rails use their own theme glass on both, independent of the Newera switch. The
separate live file pill uses an opaque theme elevated surface.
The footer must not put an opaque gradient between rails and scrolling content.
The safe-area gutter below the Composer uses the main surface color so timeline
rows never remain visible beneath the input; this cover does not extend behind
the translucent Composer or its attached surfaces.

Entry defaults are runtime fallbacks, never startup writes. Existing valid choices
win; reset/invalid-record fallback use that entry default. Explicitly choosing the
default is still a persisted choice. Only touch density enables the presentation.

Newera触控时间线浮动回底部控件：箭头与运行点共用ScrollToBottomButton的玻璃外壳和44px圆形触控区，图形放大15%并增强笔画；沿用主题Newera材质及减少透明/强制色彩/无滤镜实底回退。两态不得改变锚点、尺寸或滚动语义；桌面与关闭Newera的呈现保持。

Composer四角保持对称，共用shell radius token（普通16px/Newera28px）；附属rail以同半径互补圆弧mask适配shell肩部。结构tuck等于radius且padding/负margin相消，材料扣除shell范围，仅1px边界覆盖；不得压平shell上圆角或用整块双层玻璃掩盖接缝。验收包含实际像素覆盖、四角相等和编辑器/内容间距不变。

## Activity icon rendering

Conversation process summaries, including active/completed compaction, share body typography (14px/20px, regular weight) through ActivityDisclosure/ActivitySummaryRow. ActivityIcon and the scoped conversation-activity stylesheet own the centered rail and optical SVG calibration; feature renderers supply unchanged glyphs without local metrics. Reading preferences affect expanded content, not process labels. See [activity visual ownership and checks](ui/activity-icons.md); existing glyph identity, disclosure state and list spacing remain independent.
Composer输入辅助菜单焦点策略独立于模型/权限业务和Radix基础设施：仅触控/笔且编辑器正在聚焦时保留其焦点lease及原生选区，取消自动focus转移；键盘/AT或非编辑入口仍由Radix导航。触控期间继续输入/Escape可关闭、ArrowUp/Down显式进入菜单；外部关闭/卸载不得迟到抢焦点。该策略按props可插拔，不冻结视口、不伪造光标、不承诺控制系统软键盘。

附属rail背景在结构tuck之外仅覆盖1px材料接缝（coverage-composer-material-seam），到输入框边框下方，避免两份伪元素背景的外/内缘留下亚像素未覆盖带。验收测材料绘制边界，不能只比容器bbox；独立材质与无缝约束保持，结构tuck按完整对称圆弧计算。

非空附属rail与shell连接处不重复绘制shell顶部边框/内侧高光；空rail恢复独立输入框完整边界。用户确认本轮对象为静止时中间横缝。

## Global conversation search

Title results remain available immediately; Codex message results add an escaped snippet and Server provenance. Closing/retyping/revoking a connection cannot publish late results or relocate another conversation. The dialog preserves keyboard ownership and drafts. Loading, per-Server failure/retry, title-only support, disconnected sources and remaining pages are explicit; incomplete coverage is never reported as an exhaustive empty match. Selecting a visible message reuses authoritative hydration and measured virtualized positioning, at the containing prompt for assistant matches. A raw-history match without a visible locator opens with a positioning notice; it does not claim an exact jump.


### Mobile search presentation

Mobile/touch conversation search is a full-page result view with the search field
and circular close control at the bottom, rather than a centered popup. The narrow
modal breakpoint and touch density select this presentation in CSS, preserving
one input/query/result tree across rotation and density changes. Radix continues
to own isolation, focus, Escape and restoration. The existing timeline viewport
port alone publishes software-keyboard/visual viewport geometry; search consumes
its dimensions/offsets and falls back to dvh without another viewport writer.
The keyboard inset is not deducted a second time. Result/source status stays above
the input. Closing or selecting returns to the original UI without changing draft,
sidebar scroll or search filter state. No empty-query label claims last-opened
history that the catalog does not own.

Mobile drawer wordmark and magnifier float above the existing scroll track with
a theme-derived translucent/blurred material. Top content reserves their toolbar
height; the closed page keeps its ordinary sidebar entrance. The managed site shows its
plugin-provided mark in the drawer leading slot instead of an internal collapse
button. Core and other brands remain neutral. Unsupported blur, reduced transparency and forced colors use an opaque
fallback. The existing bottom settings surface remains opaque.

Application brand artwork, favicon/install icons and public share metadata belong
to the active product plugin. Initial HTML and runtime project the same declaration;
unload/replacement removes its links and metadata and restores previous nodes.
Share cards use public product text, never the active conversation's private title.

Composer content bounds: the model-menu surface is the sole height budget; both
list/detail tracks and scroll panes shrink within it, including on narrow keyboard
viewports. All declared reasoning options remain scrollable and selectable. Empty
Newera placeholder copy belongs to its editor column and truncates to one line;
expanded copy wraps within that column, never over adjacent actions. Presentation
changes preserve the same editor, draft, native selection and focus policy. The
focused mobile layout smoke measures both bounds and actual option selection.

Process activity rows share stable list-owned grouped spacing across reasoning, command groups and image-view rows, independent of disclosure state. Detail reading space belongs inside the disclosure; prose boundaries retain content spacing. Semantic grouping and disclosure identity cannot be changed to achieve density.

## Activity disclosure layout identity

An activity row keeps its layout role when opened, closed, streaming or settled.
The list owns external item gaps; the shared disclosure owns summary/detail
geometry and internal reading space. Only the active detail region and its
ancestors may grow. Sibling margins, unrelated dimensions, order and identity
remain stable throughout animation and streaming; closing restores geometry.
The list must not classify a row from a deep descendant's disclosure state.
Content/prose boundaries are based on stable content roles, not open state.
See [spacing ownership](../docs/chat-ui-architecture.md#activity-disclosure-spacing-ownership)
and `scripts/smoke-activity-spacing.ts` for real Conversation frame sampling.

### Markdown table scroll ownership

Wide content may automatically exceed prose width, but its scrollport and actions
stay inside the current reading surface. The layout owns available width and
panel limits; table and Mermaid renderers share the budget. Compact latest-turn
previews and ownerless embedded documents cannot borrow ancestor/window space.
Narrow surfaces do not use negative margins selected by window size. Toolbar
anchors are scoped per table with an inside-container fallback. Evidence:
`scripts/smoke-markdown-wide-layout.ts` (live resizing and independent previews).

Web/Electron tables preserve intrinsic column widths in a non-shrinking wrapper,
with long cells bounded and wrapped. The table scrollport owns horizontal
overflow; the timeline still owns vertical scrolling. Short tables remain within
the available container. Phone, iPad (including split view) and desktop Web use
this same container-driven contract and native touch/trackpad/scrollbar input;
ordinary text selection is not converted into panning. Links, source copy and
expanded preview keep their existing behavior. Streaming row additions retain
table DOM and horizontal position. Evidence: `scripts/smoke-markdown-table-scroll.ts`;
Chromium touch is not iOS device proof.


Task recycle bin projects the existing seven-day soft-delete window from the Task authority. Restore retains task and conversation identities and original status, appends to that column and never controls execution. Main board/list stays mounted across recycle navigation. Errors flow through the platform reportError port into shared non-blocking notices. Verification: `scripts/smoke-tasks-recycle.ts` and task store/controller/Host tests.
Task description expand/collapse retains the same editor and draft; expanding does not save or change task data.

Conversation headers expose capability-gated rename in standalone as well as embedded layouts. The same Host/Thread title writer owns persistence; Escape cancels, Enter saves, and failures use shared nonblocking notices. The pencil remains reachable for touch outside the Newera floating-header presentation; there, the existing menu retains Rename.
Running sidebar rows with actions share a single trailing menu slot. Desktop shows activity until hover/focus/open; touch keeps the animated running ring beside actionable dots within the same 44px target, including while the menu is open. Existing Radix menu owns actions; rows without actions retain their status indicator. Title and avatar geometry is stable.

Pinned conversations use presentation-only paging after filtering: six rows initially, six more per Show more, and Show less resets to six. Both controls belong below the last visible pinned row inside the pinned section, disappear with the collapsed section, and do not change catalog membership, selection, or recent pagination.

Recent conversations use the same section-local paging controls as pinned conversations, with an independent ten-row initial limit and ten-row increments. Show less resets recent to ten. Filtering precedes slicing; selected identity, full task-flow groups, date headings and pin state remain independent of visibility. Both groups use shared small-control/tertiary styling and hide paging controls with their collapsed section.

## Presentation power ownership

Hidden documents and explicitly parked embedded/settings conversation surfaces
stop Goal/command elapsed clocks without unmounting the Composer or stopping a
remote task. Reopening recalibrates elapsed time. Resident desktop viewers revoke
input and pause RFB pixel requests/continuous updates, retaining connection and
last frame; an in-flight frame may finish. Showing resumes observation, never
control. Native background shimmer also stops. Avatar 30Hz/ambient clocks use
their requested timer rate rather than a display-rate RAF polling loop; hidden
and reduced-motion policies still gate delivery. Visible running indicators stay.

## Startup and deferred presentation

The Application owns account, Host, navigation, drafts and optional activation.
A mounted presentation may acquire its code and styles, but cannot recreate those
owners or publish after retirement. Failed view imports remain retryable; successful
code may be cached without retaining a mounted View. Hidden pages do not advance
optional startup work. Deferred feature CSS must reach both standalone document
and embedded shadow presentations, and stop observing when the embedded owner
retires. Build graph, byte/request budgets, controlled cache probe and validation
boundaries are maintained in [startup performance](../docs/startup-performance.md).

### Sidebar rendering ownership

Shell open/close and animation bookkeeping do not invalidate the conversation
list. The list consumes only the stable dismiss-after-selection command; the
small New Chat control separately follows the transient action host. Normal
React props, local state and contribution subscriptions continue to update
selection, grouping, menus and busy feedback without a custom cache comparator.
Participant badge styles are a lazy module CSS dependency, shared by all rows;
embedded ShadowRoots consume the existing feature stylesheet mirror.

Acceptance: `node --import tsx scripts/smoke-sidebar-render-isolation.ts` checks
zero list rebuilds during four mobile swipes, live business updates, selection
and New Chat dismissal, DOM/draft continuity, and document/Shadow badge styles.

For the mobile drawer, offscreen conversation rows may skip layout and paint via
`content-visibility: auto`. The complete touch row reserves 56px before its
actual size is known, so opening/closing or scrolling cannot shift the list.
All rows remain in the same DOM, order and selection model; unsupported engines
render them normally. Held swipes still use the single Shell progress value.


### Existing native desktop binding

A local desktop tab consumes one operator-installed desktop binding. The binding
is verified against the actual X socket peer, source service invocation and
process identity; neither tab selection nor a request chooses a machine/display.
An additional immutable observation channel never restarts the existing desktop
or VNC. Manual input uses the separate physical exclusive executor; recovery
returns to viewing and cannot reacquire control or affect Chat execution.

The sidebar resize separator keeps its existing themed one-pixel gradient visible at rest as well as hover, keyboard focus and drag. Visibility does not depend on pointer presence; existing header exclusion, hit target, collapsed/transition suppression and resize ownership are unchanged.


## Tasks type badge continuity

Type labels consume one foreground/background pair from the design-system theme
engine. Every known or unknown type keeps a visible badge and its text in light,
dark, extension and forced-color themes; no database type or workflow state is
changed by choosing a presentation tone.

Web user-message navigation rail is inset 36px from the conversation viewport. Desktop Web conversation titles consume that same leading axis. The existing 36px hit target requires 72px content clearance, derived from the shared inset; insufficient space suppresses the rail rather than covering prose. Narrow headers retain measured control spacing and Electron retains its native title geometry and platform-specific 16px rail inset. Browser navigation without branding or actions contributes zero measured width; restoring content restores its physical measurement. Header alignment consumes Shell host identity inside both document and ShadowRoot presentations, rather than relying on an outer html attribute.


## Tasks action hierarchy and recycle continuity

Tasks owns one browse draft for Board/List, query and assignee/type/project/date
filters. My tasks and assignee selection must stay synchronized. New task is the
heading's primary action, while More owns management actions. The recycle view
has explicit back/refresh controls and hides irrelevant browse/create actions;
returning preserves the mounted active view and editor session. Manual refresh
is read-only, prevents duplicate clicks while awaiting its result, and leaves
query, filters, scroll and drafts intact. Desktop and compact layout consume the
same actions; compact My tasks remains directly reachable. Linked conversation
opening remains local to the card/detail. Validate real keyboard/touch menus,
filter synchronization, recycle round trips and refresh with held requests.


## Tasks board card width

The six-column board uses one Tasks-owned minimum column width token of 340px,
with equal flexible tracks above that minimum. Cards fill the column content
width. The board scrollport owns horizontal overflow; the page does not expand.
At task-container widths of 600px or less, the existing selected single-column
layout continues to fill available space without applying the desktop minimum.
Sticky headers, card actions, and list/detail layouts keep their existing owners.

## Tasks whole-card activation

The board card's passive surface (padding, kind, conversation summary, progress and owner)
opens the existing detail editor. The native title button retains keyboard
activation and receives focus for a surface click's close/return path. Nested
buttons, links, form controls, quick-edit menus and conversation actions keep
their own handlers; selected text is not a detail activation.
Surface activation also requires a press begun on that passive surface; control
presses retargeted to the card ancestor and cancelled pointers cannot activate
it. Portal targets outside the physical card are excluded.
Board/list offer no drag gesture, sorting handle or drag preview. Description
and acceptance presence icons are absent; their full content remains in detail.
Explicit status selection still persists through TASKS.move/CAS, preserving old
ordering and schema. Real interaction smoke covers passive clicks, selected text,
action isolation, absent pointer/touch reordering and explicit status persistence.

## Tasks card action visibility

Card tools reveal on hover, keyboard `:focus-visible` outside pointer-origin mode, or
the card's Radix menu trigger `data-state="open"`. Ordinary pointer focus may
remain for detail return without pinning the tools. Menu portals must retain
their card's visible anchor until closed; no forced blur or hover timer is used.
Existing compact/coarse-pointer always-visible rules and keyboard access remain.

## Tasks archive retention

Archive is an independent persistent timestamp, not a workflow column or an
expiring deletion. It removes tasks from active views but retains IDs, content,
properties, original status, history and conversation references indefinitely.
The same authority enforces CAS and read-only archived records; restore appends
to the original column and checks active capacity. Search uses bounded server
pages and discards late queries. UI/CLI require the actual archive capability.
Archive never executes or terminates a linked conversation and upgrades never
rewrite old columns or migration history. Rollback uses the strict declared-v5
reader and retains subsequent data. See docs/tasks-model.md.

The Simplified Chinese Sidebar conversation-list heading is “协同对话”, scoped to sidebar.conversations; list grouping, filters and other conversation terminology are unaffected.


## Touch Newera conversation header

Floating header controls consume the lighter variant of shared mobile-glass,
with an internal optical rim/highlight and translucent fill; no outer shadow is permitted.
Search/navigation keep their denser variant; opaque accessibility fallbacks and
the existing hit areas, fade and control owners are unchanged.

Draft and conversation routes share this presentation. With touch density and Newera enabled, Shell presents the existing left/right sidebar and conversation-menu controls as floating glass circles, using the shared mobile-glass material and its opaque accessibility fallback. Visible title/pencil are suppressed; the capability-gated preview toggle keeps its existing position and command, and Rename retains the existing menu/writer/modal. Other routes, compact density and Newera-off retain their normal chrome. This scoped presentation replaces the neutral-button/titlebar appearance, not control ownership.
Shell keeps its existing header measurements, safe-area clearance, 44px touch targets, stationary wide-touch sidebar portal, main-content lifetime and scroll geometry. Its existing pointer-transparent top-fade softly blends content toward the theme surface, without an opaque title strip or a new scroll observer. Preference or route changes do not remount the editor.

### Reasoning effort discrete slider

The Composer detail pane projects only the selected model's declared, ordered
reasoning choices through the shared Web DiscreteSlider. Track/round thumb/ticks,
readout and endpoints consume shared geometry, typography and theme tokens.
Held drag changes preview only; release commits through existing selection and
remember-default actions. Escape/outside closes the existing menu, not each step.
Touch editing keeps its focus lease and native selection; keyboard adjustment is
Radix-owned and must not become menu navigation. No choices hides, one disables,
and an unset value remains explicitly unset until chosen.

## Common workbench keyboard commands

The Web/Electron renderer uses `workbench-shortcuts.ts` as the binding metadata
and input-admission owner. Mod is Command on Apple platforms and Control on
Windows/Linux. Mod+Shift+O creates a new draft through existing navigation;
Mod+K only opens conversation search, including from the composer, and never
also navigates home. Mod+, opens settings; Mod+\\ toggles the sidebar (Mod+B
remains an alias); Mod+J toggles the existing right tool panel (Mod+Shift+I
remains an alias); Mod+Shift+C focuses the current conversation composer.
Settings → Keyboard shortcuts displays the shared binding list inside Settings;
the primary sidebar has no standalone shortcuts action. Mod+/ opens the existing
ModalSurface with the same list. Hints and accessible key metadata consume the same map.
No command is dispatched for repeats, composition/229, already handled events,
wrong/extra modifiers, or while a dialog/menu/listbox, terminal or cloud desktop
owns input, except search can reassert its own open dialog without losing the query. Commands only consume events when the corresponding surface is
available; actions keep their existing router, draft and panel ownership.


### Mermaid diagram geometry and visual presentation (2026-10-17)

The Web diagram renderer owns SVG viewport containment and accessibility-only
source visibility. A successful SVG render must include all attached graphics,
not merely fit an already clipped viewBox into the transcript. The shell includes
its border and fractional layout height; preview export consumes the corrected
viewport. Actions reserve their own header space and never cover nodes, with
visible 44px targets on touch. Mermaid defaults to classic/base with lazily
registered ELK layout and existing semantic theme tokens; no neo node shadows.
This keeps the reading-surface wide-content limits and render-key continuity.
Actual layout and source visibility are verified by
`scripts/smoke-mermaid-display.ts`.

### First-submit presentation continuity

PendingConversationPage renders the immutable submitted input with UserMessageBlock and the normal thread viewport, width and top inset. It must not maintain an independent bubble surface, font scale or geometry. All submitted attachment names remain visible, including attachment-only input. Loading/failure/retry stays in the conversation, without a Draft Composer or any new identity fetch; a current account is never substituted for a message-author snapshot. Thread creation, receipt ownership and retry/promotion semantics remain unchanged. Real component coverage: `scripts/smoke-pending-conversation.ts`.

### Browser capability compatibility

Core browser flows target the baseline in [build-matrix](../docs/build-matrix.md#browser-compatibility); optional APIs require detection and a fallback. Plan-step disclosures use the existing Radix Popover and the Workbench presentation-local portal, retaining touch/keyboard activation, Escape/outside dismissal and collision handling without requiring native Popover support.


## Tasks first snapshot boundary

Only a successful authority snapshot permits task counts and empty states.
Cold capability/list reads show static geometry in the current Board/List mode;
cold failure exposes retry in the same content region. Cached refreshes keep
existing cards and references, including a successfully loaded empty list.
See [Tasks initial loading](../docs/workbench-design-language.md#tasks-initial-loading).


## Hub network settings

- The server owns the persisted node identity, policy, peer credentials, routes and
  audit. Settings holds an editable draft separately from the last confirmed
  snapshot; polling and failed reads never overwrite an unsaved draft.
- Only a core instance administrator may read or mutate this installation's node
  configuration. Losing that role clears the settings snapshot and invitation
  material. Network enrollment never creates a member or administrator.
- Inspecting an invitation precedes connection; accepting an identity issuer is
  explicit and distinct from accepting transport. Invitations are shown once and
  removed from UI memory when closed or their authority is lost.
- Revision conflicts refresh confirmed state and require an explicit retry of the
  user's change. No command automatically replays after a lost response. Peer
  status and route paths reflect live server state, not optimistic connected UI.
- The same Hub can connect outward and accept connections. Transit is explicit;
  an outgoing-only configuration does not imply an externally reachable listener.

## Read-only Office preview ownership

- Host-authorized bytes and original download stay with the resource panel; an
  Office adapter cannot resolve paths or write files. DOCX/PPTX/XLSX are parsed
  lazily, with read-only controls and no external document resources.
- Workbench owner + tab + Host/resource/runtime generation + immutable Blob
  revision + adapter generation identify each mutable preview. Hidden is not
  closed. Recent ready instances may be retained within explicit capacity and
  source-byte bounds; close/replacement/owner release revoke old work. Late
  results, evicted viewers and unregistered adapters dispose their resources.
- Loading, timeout and retry use the viewer's existing area; they cannot enlarge
  menus, rows or neighboring containers. File-tree visibility and PDF behavior
  remain owned by the existing panel contract.
- Evidence: `tests/file-preview-core.test.ts`, `scripts/smoke-office-preview.ts`;
  detailed boundaries and limits: [file previews](../docs/file-preview.md).


### First-submit Thread handoff

A successful creation receipt retains the immutable submitted message in the existing account-scoped display continuity service before Draft promotion. The handoff is synchronous, memory-only, bounded to 64 Threads and keyed by Host/Thread. Pending presentation and the retained message share submittedMessageDisplay. A newly mounted Thread keeps this paint-only message through an empty authoritative baseline until a canonical user message arrives, without a cold-history spinner or an extra syncing notice. Real recovery errors remain visible. Old cold Threads still use normal recovery presentation. Account changes replace the service and discard all transient handoffs. Preview data never authorizes commands, acknowledges reads, restores Replica cursors or persists unconfirmed input; Resume/Replica and first-Turn retry ownership remain unchanged.

## Sidebar presentation policy ownership

Sidebar presentation projections consume the existing Shell and intent-hook
state without acquiring pointer, timer, resize or content lifetime ownership.
Docked layout precedes outgoing layout presence/resize, which precedes floating
request/resize presence; hidden is the remaining state. Floating presence can
mount only after docked layout ownership ends. Suppression vetoes edge and peek
acquisition; retained intent uses the nonnegative live panel boundary.


## Sidebar menu rendering isolation

A Sidebar keeps one stable menu owner across row context, More and participant
badge menus. Subscriptions are keyed by Host/Thread; opening, switching or closing
a row menu only invalidates the previous and next row consumers, never the whole
Sidebar filtering/grouping projection. Stale close events cannot dismiss a
successor. Selection, grouping mode and hidden/removed/disabled targets still close
menus; Radix retains focus, keyboard, touch and dismissal. ThreadActionOwner keeps
dialogs and async action state across regrouping. Validate keyed notification
semantics in sidebar-activity tests and real Sidebar menu scalability smoke.

Conversation publications (send, queued Steer or streaming) must not invalidate
an unchanged Sidebar catalog through fresh command closures or equivalent catalog
arrays. Application bindings keep command identities stable while reading the
latest committed route. Render-time title and capability readers instead carry
explicit semantic revision dependencies; catalog status keys include admission,
Host phase, query status, fetch state and data revision. Title, permission,
selection, catalog and optional action changes must still repaint. Validate
30/200-row parent-publication isolation and latest-command semantics with
`smoke:sidebar-conversation-latency`; it measures unrelated Sidebar cost, not
end-to-end model or employee-device latency.

### MCP App 客户端宿主

- Web/Electron 的 MCP App 是显式可执行资源边界，独立于静态 HTML 只读预览；不得因此放宽后者的去脚本/禁导航契约。
- `appResourceUri` 对应 `ui://` HTML 在 `sandbox=allow-scripts` 的 opaque-origin iframe 中执行；不授予 same-origin、顶层导航、弹窗、下载、设备权限。默认 CSP 不联网，仅接受资源声明的规范化源，禁止 frame/worker/base/form。Host 的账户凭据和任意 AppServer RPC 永不进入 iframe。
- 标准 MCP Apps 2026-01-26 与 Hypernode `window.openai` 共用固定 Host/thread/server、连接代际和权威租约检查。App 工具调用必须存在于所属 server 的可见工具目录，model-only 工具不可调用；资源读取限本 App URI，私有 `_meta` 仅传 View。
- 关闭/切换/后台及不可见区域释放 iframe 和监听；迟到结果不得跨 owner 写入，无自动重试工具副作用。普通工具输出不加载 App 宿主。App 上下文和 widgetState 只在内存保留，上下文经既有 SubmitIntent 作为 untrusted additionalContext 投递，不新增 canonical 历史库、不改用户草稿。
- 能力协商只声明实际实现项；首版 inline 模式，文本消息/上下文、工具与当前资源读取、外链、尺寸/主题/输入输出可用，不声明 fullscreen、采样、资源订阅、下载或设备权限。

- MCP App 自动尺寸区分真实内容失效和纯高度视口响应；`100vh + margin` 不得把宿主刚应用的高度循环当作新增内容。真实内容/媒体/字体/宽度变化继续测量，显式尺寸消息沿用既有桥。容器宽度来自 iframe 实际布局，合帧去重通知，不轮询、不重读资源、不重放工具、不重建 iframe；observer 与待执行帧随 View 清理。

### DSH Goal execution projection

Goal durable phase and native live activation are distinct. An active/disarmed Goal presents paused with explicit Resume, including cold restore/fork; a read never arms continuation. Hosts declaring `usageAccounting:false` omit elapsed/token metrics, while older capabilities retain existing accounting. Goal mutations/driver stay server-owned; shared Composer UI does not schedule rounds.

## Conversation overview authority

Conversation statistics is a read-only optional Tasks view. Native full catalogs, latest-turn
results, pins and product-supplied participation evidence retain their separate owners.
Missing sources/results/people are unknown, never manufactured successes or zero coverage.
Current state, latest completion date, archive retention and period activity are independent
dimensions. A creator is not automatically a participant. The tab cannot send/resume a turn
or mutate tasks, and source/account lifecycle changes revoke late projections.
See [Conversation overview](../docs/tasks-model.md#conversation-overview).


### Optional statistics loading

Tasks loads its optional conversation statistics renderer and styles only after
the statistics tab is selected. Suspense uses the existing loading status; it
does not introduce another data owner or relax the startup resource budget.
The read adapter loads on first read and checks cancellation after import.

### Explicit session model selection

- `user`, `host-default` and `session` are declared composition policies, not product-name checks.
- A session without an explicit model inherits the current Host default for creation and its existing model for continuation; choosing a model never writes deployment defaults.
- Product directory reads stay behind the model projection port. Ordinary sends do not depend on those reads; explicit sends use cached advisory data and the Host authorizes execution.
- Session menus retain cached labels, provider groups, backup badges, retry/empty states and the product-supplied configuration action without presenting a reasoning control.
- A Composer with machine/workspace context chrome uses stacked context, input and footer rows, including when empty. Model and permission controls remain in the measured footer; they never borrow an absolute slot from the context row. Empty composers without context chrome retain their existing inline touch presentation. Layout changes preserve the editor, selection state and menus.


## Shared Turn follow policy

The renderer-neutral `timeline-virtualizer/src/follow.ts` is the single follow
ownership policy for Web and Native. Static/watch modes preserve reading; only
explicit bottom intent or the permitted watched-content overflow acquires follow.
Completion alone does not acquire ownership. Restore capture projects a saved
checkpoint without mutating the live controller. Placement/spacer thresholds,
public mode/event names and spring data remain compatibility contracts.


## Shared history backfill ownership

One renderer-neutral coordinator serializes history pages across layout epochs.
Repeated current requests share the active Promise; invalidation fences continuation
and replacement work waits for old work to settle. Every successful page finishes
the host layout barrier before ownership, enabled state or explicit stop decides
continuation. Unchanged height ends the fill pass. Error callbacks retain stale
failure reporting; they cannot grant old work a new layout generation. Public
ports, shared load policy and platform geometry ownership remain unchanged.


## Shared measurement transaction ownership

One measurement batch publishes a coherent height table, layout, viewport and
scroll decision. The synchronous controller distance and any pending transaction
own compensation; a callback's presence remains distinct from its current restore
value. Per-input baseline accumulation, latest-row notifications, pending restore
priority and platform-preservation/fast-path decisions retain their observed
boundaries. Web and Native keep their scheduling, lease and commit mechanics;
neighboring helpers and consumers are not rewritten.

## Conversation presentation contributions

Optional conversation subtitles share the existing title rail and constrained
width; renaming and ordinary headers retain their controls. Trusted product
contributions before/after Composer cannot replace its draft owner. Visible
history refresh changes durable history without Resume, page reload or Composer
remount. Hidden/retired views stop scheduling reads; cancelled or stale-generation
results cannot update the new conversation. Browser evidence uses the real
Shell/Header/hook with a synthetic lease, alongside actual runtime/protocol tests;
it does not establish external account or channel delivery acceptance.

Trusted local chat renderer extensions belong to the Application render runtime.
They share its resource policies, roll back on startup failure, and release with
the Application; they never mutate the default library fallback or other apps.

### Relay server selection in Settings

Relayed Web clients expose current deployment and Switch server under Settings →
Servers, including narrow layouts. Shell application/account navigation does not
duplicate it. Presence comes from validated browser deployment context, not an
administrator role or the Headless administration build flag. Direct deployments
without that context do not show an unsupported switch. Navigation uses the
context selector path, including legacy deployments; target admission, remembered
choice and per-tab execution ownership remain authoritative at their existing
owners. Changing pages does not stop execution.


### Contribution icon authority

Registered navigation and settings icon names remain effective in every
presentation style. Classic artwork variants, sizes and selected-state strokes
may differ; generic fallbacks apply only to missing or unsupported names.

### Authorized desktop Composer entry

The command-adjacent desktop entry invokes the existing filtered Panel action for
the current Conversation. No adapter or resolved target means no entry. Preview-only
embedded layouts may retain a desktop renderer without exposing file-tree management;
showing the entry never grants viewing or input authority.

## Product composer desktop entry

An installed desktop panel adapter does not imply a composer shortcut. Only an explicit containing-product presentation opts into that entry; adapter availability and launch authority remain mandatory. Full and generic embedded presentations leave it disabled.


## Activity group disclosure replacement (2026-10-19)

The complete group disclosure component and four-phase reducer are independently
reimplemented after frozen requirements. The viewport remains the only scroll
writer; the existing reflow lease and height projection ports own integration.
Open content keeps natural height and DOM identity during streaming and reversals;
summary key changes are separately cadenced.
The reflow smoke fixture now supplies current activity-unit metadata and inner
choice callbacks without weakening its geometry/cancellation assertions. This
replaces only this module's implementation disposition, not the consuming activity
renderer, shared hooks, native platform or historical rights status.


## Shell right-panel host replacement (2026-10-19)

The complete host is independently reimplemented after frozen requirements.
Shell owns visibility progress and content geometry; the host projects occupied
width separately from the atomic target surface width. Closed content becomes
inert immediately, while exit, keepMounted and an active resize can retain DOM.
Only the shared handle owns pointer capture and resizing feedback. Raw sizes
below the 160px shelf close without erasing the last preferred ratio; reaching
160 or above can reopen during the same held gesture. The parent and shared
geometry ports retain responsibility for actual width and minimums. Progress
and content-width changes publish invalidation ticks with effect cleanup.

Shared animation, resize, browser and geometry implementations are unchanged;
this disposition does not classify those dependencies or native platform behavior.


## Appearance runtime ownership

The application appearance owner publishes one immutable snapshot for preference,
resolved system mode, retained requested ID, applied fallback and catalog. Settings
and React consumers subscribe to that owner; palette changes do not remount drafts.
Only the active contribution source may update the catalog; disconnect retains the
requested extension ID and falls back to an available built-in, restoring the
selection when its contribution returns. The presentation policy's built-in default
(or first visible built-in) owns fallback; unrelated missing IDs do not switch to a
newly loaded extension default. An all-hidden policy retains Neutral for safety.

Shared compiler/palettes are unchanged dependency ports. Theme projection owns its
CSS properties, mode/classes and native appearance payload; document initialization
also owns product presentation and theme-color metadata. Explicit element projection
preserves unrelated styles and does not claim document/product ownership. Legacy
preference keys and IDs remain compatibility data.


## Command and review presentation replacement (2026-10-20)

The complete command/review module owns only Item presentation and mounted View
choice: reasoning content selection comes from shared core, existing document
ports own Markdown/resources, ActivityDisclosure owns reflow, and timeline/core
retain chronology and single Thinking ownership. Commands initially fold, retain
choice across completion, delegate semantic read/search/skill policy and expose
reported output/result state without executing text. Review disclosures grant no
permissions; a generic licensed shield/terminal replaces historical custom artwork.
Copy delegates to shared clipboard ports with action-scoped 1500ms feedback and
cleanup.
No new tests/harness are added; existing actual Conversation, spacing, type and
boundary checks remain acceptance evidence. Shared ports and historical rights
remain independent unresolved matters; native hardware is not claimed verified.


## Tool, image and subagent presentation replacement (2026-10-20)

The six tool/image/subagent exports remain presentation consumers of core summaries,
typed content, group state and reported handoff steps. Product-owned content may
claim null; fallback is only for undefined. Nested WebMCP disclosure choice is
independent of its parent. Images use the existing Host media loader and resource
port, with Host/conversation/cwd/document/source identity invalidating old previews.
View expansion does not grant tool approval, execute output or own thread state.
Subagent grouping uses current core-derived agent state; individual instructions
remain available without repeating stale historical prompts in grouped rows.
Activity rails, fonts, modal focus and viewport reflow retain their shared owners.



## Browser presentation handoff leases (2026-10-20)

A view handoff retains the painted predecessor until the incoming attachment is
acknowledged (or its bounded fallback expires), two prewarm frames complete and
the release frame runs. Both views remain interaction-blocked during transfer;
finishing a view cannot clear its separate automation input/focus lock. Owner,
surface, reference and mount generation identify the presentation lease. Hidden
views, close/dispose, route transfer and superseding views revoke pending work;
late callbacks and old references cannot mutate a newer lease. Browser backing,
persistence, permissions and navigation retain their existing manager/Host owners.



Viewport presets remain application compatibility data: device IDs, dimensions
and ordering do not change when implementation provenance is reviewed. The
manager and toolbar share the declared lazy initialization and width/height
bounds; unused recovery utilities do not introduce another padding or token
owner.

## OpenCraft built-in theme identity
Built-in theme IDs use `opencraft.core.*` (neutral, canvas, frost, lavender, mist, zencode). Appearance selection and mode write only `opencraft.appearance-theme-id` and `opencraft.appearance-theme`. The six former built-in IDs are exact read aliases, including trusted build policy; extension IDs remain opaque. Canonical saved keys take precedence over legacy fallback keys. Existing saved values are not deleted, and policy hiding/default conflicts are checked after alias normalization. Bootstrap mode uses the same key priority to avoid an initial appearance mismatch. Palette, geometry and rendering contracts are unchanged.
