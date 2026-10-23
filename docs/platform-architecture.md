# OpenCraft platform architecture

While a `turn/start` or `thread/resume` request is pending, an authoritative
`item/started` notification for `contextCompaction` on the same thread grants
context preparation up to a three-minute absolute request deadline (or the
caller's longer existing deadline). Duplicate starts cannot renew that deadline.
Completion of that exact compaction turn restores the ordinary response wait,
bounded by the same absolute deadline. Other threads and short reads retain their
normal deadlines; timeout-disabled requests remain disabled. Abort, connection
loss and close still reject the exact pending request. The Host owns preparation
and must stop before its deadline; the client never retries or replays the input.

The proposed cross-cutting observation plane is specified in
[Observability V1](observability-platform.md), with a separate
[functional and nonfunctional acceptance matrix](observability-acceptance.md).
It observes existing owners and does not own execution, recovery or history.
This is an implementation specification, not a claim that the optional stack,
CLI or runtime Skill has already been deployed.

Optional Headless [IM and WeCom server plugins](im-switchboard.md) share existing
human authorization, Collaboration input receipts and the Host queue. IM owns
durable `switchboard` bindings and runtime reply context; WeCom owns its protocol
connection. Source keys are not grants; replies never follow a later binding.

The Web/Electron renderer attaches `appserver-diagnostics` to normal runtime
clients and startup identity probes. Console events correlate host, renderer
client instance, connection generation, RPC ID, method and elapsed time for
initialization and conversation restoration. Concurrent reuse of a host/RPC ID
across clients and late responses are diagnostic events, not readiness signals.
Failures are capped at twenty events per client incarnation. Params, results,
raw error messages, credentials and conversation content are never logged.
Observers detach and release pending ownership with their client lifecycle.

Page teardown and owned DSH process recovery follow the
[host lifecycle contract and acceptance matrix](../design/dsh-host-acceptance.md).

OpenCraft is a dual-renderer workbench with one semantic application model. This
does not mean one global dependency-injection container. An explicit
Application Supervisor owns multiple lifecycle-scoped runtimes: Host
connections, browser resources, renderer services, extensions, panels and Query clients.
Trusted client products supply account/engine composition through the
`@opencraft/client-product` lifecycle. Core startup owns invocation, rollback and
consumer-before-provider disposal; private products own callback handling,
account creation, extension definitions and configured-Host preflight. Public
clients do not implicitly create a product account or a private brand. Product
sessions may declare managed builtins using resolved deployment defaults; the
existing extension manager retains persisted enablement and lifetime authority. See
[client product composition](plugin-architecture.md) for selection and cache scope
boundaries; this does not claim remaining native/private sources are extracted.
The downstream product owns its client and Collaboration plugin workspaces and
their tests. Their existing package exports and runtime implementations remain
unchanged; public core installation has no dependency on those two packages.
Private embedded composition is downstream-owned and selected only by a trusted
local `OPENCRAFT_EMBEDDED_PRODUCT_ENTRY`. Public Web/Electron builds do not probe
for a product entry. Core still owns App, presentation lifecycle and reusable
embedded helpers; the product owns account/physical connection adaptation and
element assembly. Explicit product builds preserve the existing loader and API.
Trusted product Vite configs compose the core build factory, retaining core
platform constraints while owning private feature policy, environment definitions,
gateway settings and artifact directories. A product ID does not implicitly select
private defaults. Product runners retain the original build and compatibility
stages; this changes build ownership without replacing client components.
With dependency auto-discovery disabled, downstream development configs also
own prebundling their private CommonJS dependencies from their own installation.
The public workspace's dependency scan cannot cover packages it does not install.
The shared Vite preload helper stays separate from entry-only polyfill effects;
query-suffixed Workbench loaders have their own chunk. Presentation context does
not re-export the bootstrap factory: consumers use its composition module. This
keeps optional feature updates from invalidating unrelated shared startup chunks.
Renderer realm initialization belongs to the core Web build factory. Both the
HTML entry and trusted embedded product loader finish the shared curated
ECMAScript compatibility module before dynamically importing application/product
code. Product dependencies cannot race shim installation through static module
evaluation. The policy and real minimum-engine startup regression are documented
in [browser compatibility](build-matrix.md#browser-compatibility). This boundary
does not emulate DOM/device capabilities, cover Workers or relax owned-source
compatibility checks.

The Vite renderer is the precision desktop surface used by browsers and
Electron. The default Expo entry composes the existing RN Workbench, presentation runtime
and direct WebSocket Host for iOS, Android and Expo Web. Host configuration uses
`EXPO_PUBLIC_APPSERVER_WS_URL` and `EXPO_PUBLIC_APPSERVER_HOST_ID`; a physical
device needs a reachable Host endpoint. It does not instantiate a downstream product account.
The explicit downstream product entry retains its Router, native login, Bot
navigation and packaged frontend DOM runtime. The product runner selects trusted
local entry/config files for the whole Metro/Gradle/Xcode build; core Metro only
replaces the root entry import and delegates every other request to its existing
resolver chain. Product entry directories are added to the watched graph without
replacing npm workspace resolution. Native math/Mermaid capability providers
remain generic and package their runtime code locally. Private routes, account/Bot components and product plugins live downstream.
The public APK/IPA scripts own generic SDK/signing mechanics; the explicit
product runner owns the downstream product edition/identity, permission wording and artifact
naming. The agents-next frontend assembly also belongs downstream, with its
original generated manifest and packaged Bot document. Public commands do not
auto-discover a private product. Legacy development IDs remain unchanged.
The Expo Metro server gzips JavaScript bundle responses for clients that accept
gzip. Physical iOS Expo Go tests require the CLI and phone to use the same Expo
account; an HTTPS reverse proxy uses an `exps://` launch URL. For remote Expo
Go discovery, the Expo tunnel can retain the manifest and list entry while
redirecting bundle downloads to a faster HTTPS origin for the same Metro server.

The target identity and collaboration model is defined in the
[native actors and Hub collaboration charter](architecture/actor-collaboration.md).
Humans and persistent Agent/Bot/Sessions are addressable actors; subjecthood is
independent of permission size. The top-level concepts are Actor, Hub, Resource
and Permission. A Hub is a logical network node with its own identity and one or
more addressable Endpoints; tenant/project scopes are independent of Hub topology.
Hubs can connect directly or through relays and cascade into a larger network,
without requiring a single center or an all-to-all topology. Relays extend
reachability; they do not implicitly issue actor identities, merge tenant scopes
or grant access to target resources. Each hop checks forwarding eligibility,
while target authority remains responsible for the requested operation.
Channels are collaboration resources, and runtime bindings associate execution
contexts with actors. Hubs check admission and forwarding eligibility; the target
resource authority checks the requested operation. This is a target design, not a claim
that cross-Hub trust or tenant isolation is implemented. The initial persistent human /
session Actor registry now provides verified identity binding, revocable Session credentials
and explicit local Actor grants; legacy execution interfaces remain unscoped and reject
these Session bearers. See the charter’s [implementation slice](architecture/actor-collaboration.md#首期主体核心自然人与-session).
The charter's [core and plugin boundary](architecture/actor-collaboration.md#核心与插件的边界)
puts actors, authorization and Hub dispatch in the required core. Identity
sources, execution engines and communication channels enter through plugin
adapters; they do not own the caller's permissions or bypass target authority.

The [human authentication principle](architecture/actor-collaboration.md#多种登录方式绑定同一自然人)
makes the human Actor the stable identity and local accounts, OIDC and enterprise identity
verified identity bindings. One human may have several sign-in methods; each
login identity binds to one human within its identity authority. Permissions,
resource ownership and audit records follow the Actor. Names and matching email
addresses never authorize automatic account merging. Identity adapters verify
their proof; core owns binding, authenticated sessions, admission and authorization.
Client login sessions remain distinct from persistent Bot/Session actors and credentials.
Trusted identity adapters may supply the optional admission port described in
[relay deployment](relay-deployment.md#optional-provider-admission-policy).
The gateway prepares verified identities asynchronously; core role, connection
revocation and durable human admission share its synchronous decision. The port
does not replace identity verification, membership or resource authorization.
Headless bundles the official `opencraft.account` server plugin for independent
per-deployment local accounts, configurable OIDC, browser sessions and explicit
linking/unlinking; dedicated enterprise verification remains an optional adapter.
The local plugin owns password policy and credential verification through a narrow
core storage port; core retains the existing v1 database, login tokens and Actor
authority. Deactivation revokes local logins without changing admission or OIDC
identity grants, while ordinary process restart preserves valid sessions.
The authentication owner keeps credentials and browser sessions separate from Actor
bindings and instance membership. See [server authentication](server-authentication.md)
for private configuration, operator bootstrap, expiry/revocation and migration boundaries.
Enabling login does not itself change anonymous workspace admission or product-service accounts.

Optional ordinary relay deployment uses core `identity-core` principals and
`access-control` instance membership at every headless HTTP/WS entry. The Node
relay and outbound `relay-connect` plugin transport traffic; enterprise identity authentication
remains an adapter. Ordinary relay tunnels bound active and connecting data streams
with a separate 512-stream per-installation budget; Hub peer links retain their
128-stream budget.
A valid open received at capacity is discarded and its existing server-side ten-second
reservation expires; it never closes the control link or existing data streams.
Once a stream closes, later opens can be admitted. Malformed control messages
still close the link with code 1008. One approved authentication origin hands off a browser-bound,
single-use ticket to each team origin, and the instance independently verifies
scoped assertions and local grants. An explicit `--access-member-provider` policy may admit verified identities from selected providers as ordinary members without persistent implicit grants; explicit revocations and administrator roles remain authoritative. Default installations still require explicit membership. This implements installation admission,
member/admin roles and revocation, not the full Actor/Hub charter or private
per-thread access. Core `hub-network` now supplies stable node identity, signed
invitation enrollment, connection-scoped route epochs and bounded cascading
HTTP/WS forwarding. A Headless settings controller or a private loopback delegate
manages the one authoritative node state; the relay app reuses this core rather
than defining a second federation model. Links, identity issuer trust, forwarding
eligibility and final membership remain separate decisions. This is the Web
transport slice of the charter, not general Actor/resource federation. See
[relay deployment](relay-deployment.md).

The existing connection and execution contract is `Client / Hub / Server`. A Client is a
protocol participant and may use an Electron renderer, a static Web page or
another presentation surface. In that contract, the Hub owns scoped attachments,
routing, subscriptions and leases; these roles alone do not establish tenant
isolation. A Server owns Threads and execution state and
may attach to multiple Hubs; a Client may attach to multiple Hubs. Host describes
where a Server process and its resources run, not the Server's stable identity.
The current direct topology still projects one Host profile to one Server route;
that compatibility is isolated in `legacyDirectServerProjectionFromHost()` rather
than being repeated by feature code.

```text
Client ApplicationSupervisor
├─ AgentRuntimeDirectory
│  └─ HostRuntimeRegistry
│     └─ Legacy direct Server route (currently named HostRuntime(hostId))
│        ├─ ProtocolPort (initialized AppServer request boundary)
│        ├─ Runtime readiness / connection generation
│        ├─ Domain resources (Threads, Projects, Files, Catalog, Terminal)
│        ├─ @opencraft/appserver-client
│        │  └─ @opencraft/appserver-protocol ── Host-aware AppServer contracts
│        ├─ Resume / Replica / Thread projections
│        └─ DuplexTransport
│           ├─ WebSocket (browser/RN)
│           ├─ Electron App Host channel → OpenCraft Daemon
│           ├─ Memory server
│           └─ Recording / Replay
├─ BrowserRuntime
├─ RendererRuntime
├─ EcosystemSupervisor
│  ├─ ExtensionSupervisor
│  │  ├─ ActivationGraph / ContributionBroker
│  │  ├─ TrustedBuiltinRuntime (Cordis)
│  │  ├─ TrustedExtensionRuntime
│  │  ├─ RestrictedExtensionHost (optional)
│  │  └─ SandboxedUiBroker (optional)
│  └─ AgentCapabilityRuntime
│     ├─ Spec Catalog / Offering Resolver / DisclosureBroker
│     ├─ Policy / LeaseRegistry
│     └─ ExecutionRouter / Journal / DraftLab
└─ QueryClient
        │
        ├───────────────────────────┐
        ▼                           ▼
Vite / React DOM              Expo / React Native
apps/workbench-web            apps/workbench-expo
OpenCraft desktop frame           iOS · Android · Expo Web
        │                           │
Electron bridge               native/web adapters
```

`AgentRuntimeDirectory` waits for Host readiness; it does not own Host
registration, transport, Thread state, Skills state or model configuration.
Views and domain services never read the raw AppServer client registry.

The Electron App Host channel is the first Hub-shaped implementation boundary,
but its version-1 wire names are not the domain model: `rendererId` currently
identifies a logical Client incarnation, and `hostId` currently identifies a
direct Server route. New code must not use those historical names to make a
Renderer or Host the owner of Thread identity. A future protocol migration can
add explicit Hub, tenant and Server coordinates without changing the domain
contract or Sidebar presentation again.

### Shared-origin relay server context

An optional relay entry selects an independently authorized installation and
encodes its stable instance ID in the URL. The relay owns discovery and verified
identity handoff; each target core owns membership and administrator decisions.
The browser deployment context owns the target URL prefix, Router basename and
installation storage namespace. HTTP/WS ports consume it explicitly; plugins
receive a fetch port and contain no relay-path or company deployment assumptions.
Changing the browser choice creates a new page lifetime, without transferring
permissions or cancelling server execution. Per-identity remembered selection is
a navigation preference, never an authorization credential. See
[shared entry selection](relay-deployment.md#shared-entry-server-selection) for
configuration, cookie handling, rollout and the shared-origin trust boundary.

## Package ownership

### Backend SSH Codex connections

The Node backend can attach to existing Linux or Desktop-compatible HyperNode
AppServers through OpenSSH exec and WebSocket-in-SSH. The existing Codex routing
adapter shares initialize, request isolation, Thread readers and interaction
ownership across local stdio and remote physical transports. Remote mode never
constructs local account/queue/attachment services or resolves remote files on
this machine. Backend SQLite owns administrator-managed recipes, pinned trust and
encrypted credentials. Settings drafts are transient; a live read-only profile
overlay never duplicates these recipes in IndexedDB. A separate installation-owner
HttpOnly session gates management and `/ssh-apphost`, with exact Origin and
frame-level revocation checks. Public access requires explicit fixed-HTTPS-origin
or changing-address opt-in; sessions stay bound to their admission Origin.
Default shared installation access bootstraps this session automatically without
an additional key, including after expiry/restart. Every permitted entry visitor
can use saved SSH credentials in this mode; it is not a member ACL. Operators
can require an extra key with `--ssh-require-access-key` or `--ssh-access-file`.
The Application owns bootstrap/renewal and authorization incarnation, not a
Settings mount; known session loss clears old private projections before renewal.
Every private AppHost connection attempt also awaits this owner's coalesced
session check and shared renewal before creating a WebSocket. Recovery does not
depend on foreground discovery timers, and cancelled or disposed attempts cannot
open a socket after a late grant. Access-key mode never bootstraps without a key;
the public AppHost channel does not perform this private admission check.
Legacy servers without the policy declaration still require manual key admission.
Bootstrap never dials SSH or replays connection/execution/file mutations. The
explicit management Connect command uses AppHost's service-owned admission, not
a synthetic Client or separate SSH transport. It grants no execution/answer lease;
connection status remains a projection of the shared physical slot.
The native broker's method-admission policy is independent of SSH framing.
It forwards paginated Turn/Item history as well as native Skills/config writes
and preserves unrelated upstream initialization metadata. The same validated
`opencraft/method-access` extension feeds Runtime resources, submission admission,
command compilation and Composer action resolution. Admission is not upstream
support discovery; unavailable local stores/connection resources remain excluded.
Preferences never manufacture capabilities: an SSH follow-up uses admitted Steer
instead of unsupported Queue, without overwriting the preference; rejection is
before optimistic adoption and cannot consume a draft. Legacy manifest absence
is compatible, while a malformed declaration fails closed.
The application catalog separately consumes authenticated physical readiness to
admit its logical reader through the registry. It does not change the selected
chat target, auto-connect policy or Thread subscriptions. Catalog publication
checks configuration revision and authorization incarnation across async
boundaries; a locked/disabled/removed recipe cannot regain visibility through
a late result. Settings navigation and chat navigation consume this same
application projection rather than issuing menu-local history refreshes. Management
discovery is started and disposed by the Application, not the Settings
View. Visible/online reads are single-flight, completion-scheduled and back off
after transient failures (10/20/30 seconds, capped at 30); successful reads poll
every five seconds. Foreground/online hints probe promptly without dialing a
Server. Authorization changes supersede old reads; command receipts require a
fresh post-command status read rather than joining an earlier poll. A missing
management source due to read failure has its own sidebar retry, even before
there are any SSH Host profiles; unsupported or successfully locked sources are
not errors. Healthy background discovery does not flash a loading indicator.
Chat subscribes to a value signature of catalog rows, availability, authentication,
authorization epoch, errors and discovery phase. Fresh copies of unchanged rows
and healthy poll progress do not invalidate the Chat tree. Connection management
still consumes the controller's complete progress snapshot; authorization and
physical/configuration changes remain immediate, without another writable store.
Runtime
uses the shared read boundary for native indexed SSH discovery, not rollout
reconciliation. Each admitted Host query owns loading/failure and scoped retry;
the sidebar never substitutes an empty success for pending/error or lets one
failed Host erase the others. Reading admission and cached-row visibility are separate: temporary physical
connecting/reconnecting/idle/error states retain already loaded rows in the same
recipe and authorization scope without authorizing new requests or execution.
Lock/logout, removal, disablement and recipe/authorization changes revoke
visibility immediately; scoped query keys prevent reuse across incarnations, and expansion discloses hidden remote rows within the fetched catalog.
The per-Host metadata index uses TanStack infinite-query pages. Each successful
page is committed immediately; navigation projects the available rows and title
search separately tracks directory completeness. Sequential background pagination
continues through every cursor, so older conversations remain discoverable without
resuming Threads or reading messages. Native pin backfill is deduplicated by ID,
with the first page authoritative. Empty intermediate pages are valid; repeated
cursors fail the read. The scoped key distinguishes the paginated cache from
legacy complete-directory response shapes.
Cancellation, retry backoff and later-page failure retain all committed pages.
An ordinary refresh retains its prior snapshot until the refreshed pages succeed.
Status notifications cancel stale reads before patching known cached rows, then
invalidate the directory; paginated data survives this handover. Recipe and
authorization scopes still fence visibility and late results. Directory failure
exposes retry while retaining navigation; search cannot claim an exhaustive empty
result when its metadata index is partial, failed or unavailable. Message search
keeps its own provider/capability/cursor state and does not depend on sidebar row
limits. Goal enrichment and unread catch-up wait for the final metadata page.

The optional conversation overview is isolated in
`apps/workbench-web/src/features/conversation-overview`. Appearance controls its
installation preference (off by default). It reuses this same admitted catalog
and source-incarnation checks; each visible card reads only the latest two
`thread/turns/list` summaries. Reads have two lanes per Host, are fenced before
and after the reply, and stop queuing when the card or document is hidden.
Running/goal cards catch up every four seconds in the foreground; metadata
changes and foreground recovery also refresh previews. No Thread is resumed,
no interaction/execution lease or read receipt is acquired, and preview text is
discarded with the overview's Query observers. There is no full-history fallback
on unsupported Servers. Catalog errors remain scoped and retryable, separate
from an empty successful directory. Opening a card uses the existing committed
navigation transaction and keeps the overview on failure. While the overview
covers the current conversation, its underlying result visibility cannot
acknowledge unread results. Removing the feature requires only its documented
UI/setting/source integration points and no account or execution migration.
Automatic reconnect uses 500ms/1s/2s/5s/15s/30s/60s delays, capped at 60s.
Connection attempts and inbound server requests have separate owners. A WebSocket
attempt installs its promise and cancellation before publishing `connecting`;
synchronous observers can revoke it before socket allocation. Only that attempt
may clear its promise, and old close callbacks settle before publishing status
that can admit a successor. Abort/close cannot resurrect an already revoked attempt.

An inbound JSON-RPC request owns a delivery receipt and a connection revision.
Its live phases are handling and sending; physical delivery or a matching Host
resolution succeeds the receipt, while connection loss/client disposal rejects
it and aborts queued sends. Both terminal paths remove ownership immediately.
Late handler success/failure cannot send through a successor connection or settle
its receipt. `serverRequest/resolved` only addresses a live request with matching
ID type/value and, when both are known, Thread identity. It leaves no permanent
ID tombstone: a completed request or an earlier connection cannot suppress a
new request after ID reuse. These delivery rules do not replay a mutation or
terminate the underlying server execution.

Connection attempts and inbound server requests have separate owners. A WebSocket
attempt installs its promise and cancellation before publishing `connecting`;
synchronous observers can revoke it before socket allocation. Only that attempt
may clear its promise, and old close callbacks settle before publishing status
that can admit a successor. Abort/close cannot resurrect an already revoked attempt.
Client initialization, deferred transport acquisition and logical Host connection
also install their single owner before notifying synchronous observers. Reentrant
connect calls join that operation. A delayed initializer rechecks close and abort
before acquiring a transport. Outbound request observers can cancel before
encoding or sending; the request must still own its pending entry after each
notification, and a WebSocket checks cancellation before physical delivery.

A Host grant is valid only while its physical transport is open. The server checks
this after activation, before granting and immediately before acknowledging the
claim. The channel retains terminal statuses seen before acknowledgement by their
generation: a matching grant is rejected and released, preserving any manual
failure classification. A different generation neither revokes that grant nor
gives the channel authority. Termination of the shared bridge revokes every
pending channel attempt, including a grant already delivered to its promise.
A late acknowledgement cannot revive a lost Host;
automatic recovery obtains a new claim through the existing retry policy.

An inbound JSON-RPC request owns a delivery receipt and a connection revision.
Its live phases are handling and sending; physical delivery or a matching Host
resolution succeeds the receipt, while connection loss/client disposal rejects
it and aborts queued sends. Both terminal paths remove ownership immediately.
Late handler success/failure cannot send through a successor connection or settle
its receipt. `serverRequest/resolved` only addresses a live request with matching
ID type/value and, when both are known, Thread identity. It leaves no permanent
ID tombstone: a completed request or an earlier connection cannot suppress a
new request after ID reuse. These delivery rules do not replay a mutation or
terminate the underlying server execution.

Default connection and history retry delays use bounded 0.8–1.2 jitter to
spread reconnect bursts. Explicit test clocks or schedules retain exact delays.
Catalog reads rejected by connection preconditions create neither an observed
catalog operation nor query retry backoff. A failure on a later page preserves
the successful first-page observation and already available catalog data.

Short successful connections do not reset retry history: readiness must remain
continuous for 60s. Visible foreground/online recovery hints can advance an
already scheduled retry, at most once per five seconds per Host; they retain
the escalation counter and coalesce with an active connection attempt. Explicit
user retry remains immediate and manual failures remain blocked.
Protocol incompatibility is a permanent failure for the loaded client. The Web
bridge sends the existing `fatal` envelope with `APP_HOST_PROTOCOL_MISMATCH` and
`retryable: false` before closing a rejected hello; no Host or lease is admitted.
The AppHost client applies the same disposition to an incompatible `ready` and
preserves classified SSH/AppHost errors through both connect rejection and the
terminal event of every attached channel. Runtime cleanup and foreground hints
must not turn this failure into an automatic reconnect. A generic socket close,
including 1008, is insufficient to infer version incompatibility: authorization
expiry has a separate recovery path. Existing loaded clients without this
classification still require an explicit update; the server cannot patch them.
SSH failure diagnostics retain only bounded classification, connection age,
process exit and WebSocket close/error codes; no endpoint, stderr or RPC payload.
SSH reception retains a bounded 100MiB message budget for large Codex history
responses, matching the standard WebSocket receiver budget. Outbound mutations
and backpressure remain bounded at 16MiB; administrator/test overrides remain
backend-only. Frames exceeding the receive budget are a manual compatibility
failure, not an endless link retry.
Transient history read failures (timeout, queue pressure or link unavailability)
use the same bounded three-retry policy for acquisition, reconnect and explicit
revalidation. RPC rejections do not retry automatically. An explicit history
retry wakes delayed work with its current policy and shares an active read;
foreground hints also wake visible non-authoritative conversations. No history
recovery resends a user command or reconnects a healthy Host.
Failed automatic attempts stay in the reconnecting phase, preserving cached
content instead of alternating error/loading UI. Stability timers are generation
fenced and cancelled on disconnect and disposal. Reconnect
awaits the old physical close before admitting a successor, and failed activation
remains observable after cleanup. Anonymous `/apphost` rejects SSH IDs; Renderer IDs and the downstream product login
projections are not administrator authority. Only public fingerprints/configuration
are returned, never saved passwords. Static private key/agent recipes remain a
read-only compatibility source. This is single-installation administrator access,
not member-specific Server sharing. Reset has a physical close/claim barrier.
Closing a page or proxy does not stop the remote daemon, and reconnection does not
replay mutations. Scope, configuration, compatibility gates and limitations are
specified in [SSH Codex Servers](ssh-codex-servers.md).

### Hub-owned remote conversation directory

`DurableThreadCatalog` is owned by the existing remote `CodexEngineAdapter` and
shares its per-binding `OpenCraftHostStateDatabase`. It begins only after an explicitly
admitted native connection has initialized. It neither auto-dials an idle Server
nor resumes a Thread. Its lifetime is the server-owned physical slot, independent
of a browser/Sidebar mount; close aborts reads before the DB owner closes.

Canonical `thread/list` requests using updated-at descending order and ordinary
active/archived scope read this durable index with opaque keyset cursors. Cold
reads await the initial successful directory sync; warm reads return saved metadata
immediately while the service revalidates. Advanced filters, native cursors, other
sorts and explicit scan/repair requests retain native protocol semantics. This is
not a replacement for every native query or an offline transport admission path:
a cold browser still requires an admitted initialized route. It does not grant
execution or expose a disabled/revoked recipe's private data.

The service pages metadata-only active/archived native lists, uses an overlap on
updated-at for incremental refreshes every minute, and runs a full reconciliation
at least hourly while connected. Pages stage until a successful scan boundary;
partial/failed scans keep the previous directory and successful watermark. Only a
successful full scan can retire absent rows. Live metadata and deletion events
advance a local revision so a response started earlier cannot resurrect or overwrite
them. Reopen retains the previous successful projection and sync status. An optional
`catalog` response sidecar reports success time and current state; a failed refresh
shows a saved-data notice, not an empty successful directory. Directory completion
broadcasts `opencraft/thread-catalog/changed` to initialized readers; token deltas
never invalidate the catalog. Native bodies and execution stay on the Server.

### Conversation desktop plugin

The trusted `plugins/cloud-desktop` panel registers its own renderer and entry.
The application may inject an authorized backend/media adapter pair; absence
means no advertised desktop capability. Conversation owns tab identity, the
explicitly resident desktop presentation owns its transient viewing connection, and the backend
owns the remote desktop incarnation and exclusive input authorization. Closing
the viewer cannot stop the desktop or Agent. See the [desktop plugin contract](cloud-desktop-plugin.md)
for framework invariants and the remaining production integration boundaries.

The mounted presentation captures one physical activation's fixed control action;
the viewing controller fences its single-use command by connection and control
intent epochs. Focus loss still revokes immediately, but cannot turn a pressed
Stop into Take after rendering changes, or release a successor grant. Physical
clipboard capability and currently authorized paste are separate projections;
unsupported adapters do not render a dead toolbar action.

The desktop renderer alone opts into `while-tab-open` residency. Shell hiding
and tool-tab selection project logical `active=false`: the controller releases
input immediately, while viewing stays mounted. The media adapter stops framebuffer
pull requests and disables RFB continuous updates while inactive. It completes
in-flight protocol data, retains the last frame and connection, and resumes pixels
when shown; it does not merely discard decoded frames. Reopening never reacquires input;
the surface consumes the same activity to detach out-of-aperture cursor overlays
and their listeners. Hidden cursor updates cannot recreate them; reopening only
restores observation, never the previous control or focus. The adapter owns this
projection, not Shell DOM queries or a second visibility registry.
Local control-cursor attachment additionally requires the same confirmed input
grant projection: observation/requesting never attaches it; Stop/revocation/blur
restore the ordinary cursor and retire fallback listeners immediately. Late shape
updates stay cached until a fresh valid grant; the framebuffer itself is unchanged.
Closing the tab or changing the panel owner disposes the viewer. Other tools keep
their existing physical-presentation lifetime. The control button projects the
user's intention immediately as Stop; only a valid backend grant enables input.

The neutral desktop plugin now owns the lazy noVNC media adapter; the downstream product's
`lightvela-platform/desktop` provider owns account/directory validation, desktop service
preparation and attachment handoff through narrow ports. Dependencies point
from product to neutral contract/media/session-wire, never in reverse. the downstream product's
viewer port consumes configured authenticated broker endpoints and never owns
desktop framing or rendering. Sandbox has a bounded attachment broker with
one-use scoped credentials and confirmed remote control handoff. Its production
authority composition, native input executor and default directory remain absent;
an account or prepared VM alone cannot advertise the entry. The backend observer
transport now verifies native process/socket ownership and a fresh root-key MAC
before exposing immutable read-only RFB; this proof does not authorize a Conversation.

Local Linux Codex Hosts have a separate explicit `--local-desktop` composition:
`local-agent-host/desktop` owns authoritative native Thread checks, short grants
and root-verified streams; `CodexEngineAdapter` binds grants to server-stamped
logical Client epochs. Workbench's `HostDesktopBackend` maps Scope aliases to
native Thread IDs and consumes the neutral media/session-wire. It is independent
of the downstream product accounts and enterprise service. The dedicated WebSocket gateway is exact-Origin and
loopback-only by default; an explicit `--trusted-internal-desktop` deployment
instead trusts everyone admitted to that installation's network access. That
deployment advertises a distinct same-origin trusted-internal transport, supports
TLS-terminated HTTPS without trusting forwarded headers, and retains immutable
read-only native observation and Thread/Client-bound grants. Neither mode is
public DevCloud authentication. Hosts without either explicit mode do not
advertise it. Viewer teardown cannot stop Codex or
desktop processes. Full lifecycle and bounds are in the
[local authority contract](cloud-desktop-plugin.md#local-execution-server-authority).

An explicit native installer can bind an existing non-root Xvnc/Xtigervnc/Xvfb
display without replacing its VNC or windows. Root-private configuration and
actual X socket/process/service identity own this binding; it is never supplied
by a browser. See the desktop contract for installation and identity checks.

Optional `--desktop-control` composes a separate root-private Unix XTest executor,
verified against the same physical incarnation; the observation stream remains
read-only. LocalDesktopService owns Thread/Client-bound control intent and
confirmation, while the native executor owns physical exclusivity, renewable
leases and held-key/button cleanup. Bounded RFB input decoding retains the grant
at each message's first byte, including fragments. Viewing recovery never
reacquires control; clipboard is explicitly unavailable in this local composition.
See [native control authority](cloud-desktop-plugin.md#local-native-control-authority).
SSH bindings do not inherit the local desktop service: the shared-native
initialize projection removes any upstream desktop extension, and desktop
attachment RPCs cannot be forwarded through the remote binding.

Local viewing recovery opts in only because preparing a new attachment cannot
replay resource creation or Agent work. Wire/media classify established transport
loss; the viewing controller owns bounded backoff and fresh-grant replacement,
never inherited input. the downstream product preparation remains manual on failure. See the
[viewing recovery contract](cloud-desktop-plugin.md#bounded-viewing-recovery).
Local viewer expiry is renewable through explicit discovery plus wire capability,
not a removed timeout: the dedicated viewing socket requests reauthorization,
the Host rechecks native Thread/Client/incarnation, and a matching confirmation
re-arms both expiry owners. Failure remains bounded and cannot reacquire control.
Legacy and the downstream product providers are not implicitly opted in. See
[confirmed viewing renewal](cloud-desktop-plugin.md#confirmed-viewing-renewal).

### Workspace file Explorer ownership

File-tree visibility is panel-local presentation state. The file header toggles
the tree without changing the selected resource or remounting its editor/preview.
PDF files default to a collapsed tree; other resources default to an open tree.
An explicit header toggle overrides that default for the current panel lifetime,
so switching files does not override the user's manual visibility choice.
The hidden tree stays mounted to retain expansion, search and scroll position;
the content fills the available width. Read-only embedded previews remain
tree-free and do not expose this toggle.

The tree presentation owns expansion, active keyboard path and scroll, scoped to
one panel and Host. Existing directory Query records remain the only directory
data authority; a stable Query select sorts each data revision with a shared
numeric collator. A pure model projects loaded, expanded directories into flat
file/directory/loading/error rows. One fixed-height viewport mounts only visible
rows plus overscan and the active accessibility descendant. It observes queries
only for expanded paths whose ancestors are open; collapsed descendants retain
their expansion choices. Background refresh errors retain cached entries.
The tree receives explicit Host identity, roots and a stable selection action;
directory rows do not subscribe to the Host or conversation snapshot. Shell
animation and transcript changes cannot sort unchanged directory data. The
viewport owns Arrow/Home/End/Enter keyboard navigation and reveals selection;
hiding/searching preserves the tree model and its last visible scroll geometry.

Workbench Web's workspace resource panel owns the selected Host/path, the
filesystem query, and unsaved drafts. A query result is only a server snapshot:
refreshing or switching files must not replace a dirty draft. Draft identity is
Host plus path; saving captures that identity and submitted text before the
asynchronous write, and a changed server snapshot blocks saving until the user
reconciles the draft. The extension registry in the resource model supplies
both file-type cues and the CodeMirror language choice. The code editor owns
only its document view and edit events; it does not write files or own drafts.
Binary and oversized files remain outside the text-editor path.
The file-preview header provides a download action for every successfully read
file, including empty or non-previewable binary files. It exports the original
Host-scoped Blob with the selected basename rather than editor text or rendered
HTML. Read-only embedded previews retain download without allowing Host writes.
The preview owns its Blob URL lease; Host/path/runtime generation changes remove
the old download target before exposing the next resource.

### Typography ownership

Typography is a design-system protocol, not feature CSS. The checked-in
`packages/design-system/src/typography/typography.tokens.json` registry is the
single data authority for font-family roles and per-platform semantic metrics.
`typography.shared.ts` projects that registry to TypeScript/Native, while
`scripts/generate-typography.mjs` deterministically creates the Web custom
properties in `_generated.web.scss`. Generated output is checked but never
hand-edited.

Web/Electron UI and content prefer the bundled Inter Variable / Inter faces,
then the existing system and CJK fallbacks. Native retains its platform system
face. The monospace family, semantic metrics and rasterization policy are
independent of this UI preference.

The hand-written `typography.web.scss` adapter composes a Typography Role with
an independent TextTone. Platform rasterization remains a root rendering
policy. This keeps font metrics, theme color and macOS/Windows/browser smoothing
orthogonal: selection or disabled state can change tone without creating a new
font role, and platform rendering can change without rewriting every component.
Shell and extension chrome consume the semantic primitive; feature-local raw
metrics are reserved for content systems with a separate owner.

Shared Button and Settings form controls also consume registry roles:
`control/controlSmall/controlLarge/controlCompact`, `input`, and settings
heading/label roles. Native button text metrics are projected from the same
registry; geometry remains in the button contract and is not changed by this
normalization. Web role projection can omit TextTone (`null`) when a control
variant owns its semantic colors. `controls.web.scss` owns state-only focus,
disabled and invalid feedback, including forced-colors focus visibility.
Generic Button loading preserves its label footprint and exposes `aria-busy`;
it cannot widen the button or animate the spinner under reduced motion.

Role usage and progressive Agent loading are owned by
[the UI typography contract](../design/ui/typography.md). The repository-wide
parser gate rejects typography literals in owned apps/packages/plugins; specialist
exceptions are exact and fail when stale. Semantic tests also cover role misuse,
such as paragraphs consuming button typography. `scripts/smoke/shell/smoke-control-standards.ts` renders actual controls across
light/dark/custom palettes and tests size, focus, invalid, disabled and loading
states; optional isolated Electron execution requires an explicit executable.

### Theme surfaces and native appearance

`Graphite` (`opencraft.core.graphite`) is an optional built-in Web/Electron palette
with layered grays: opaque chrome, light gray/white surfaces in
light mode and charcoal layers in dark mode. It does not change default theme,
typography or control density. Settings preview cards project each theme's
actual resolved-mode tokens rather than maintaining ID-specific color copies.

The design-system `theme-options` contract owns optional semantic surface
overrides (`window`, `sidebar`, `panel`, `input`, `popover`) and material enums
(`window: translucent | opaque`, `elevation: soft | flat`). Extensions provide
strict hex colors and enum values, never CSS, selectors, URLs or geometry.
Registration validates and freezes nested options before the activation batch
is published. Omitted fields retain generated colors and existing internal
shell-material defaults. Each selection regenerates the full property map,
including fallback values, so unloading a theme cannot leave old overrides.
The elevation enum affects main workspace surfaces, not every popup's shadow.

Web forwards selected palette options without narrowing away material intent.
Settings inputs consume the dedicated input surface rather than borrowing an
unrelated elevated layer. Other components use the corresponding existing
panel/popover tokens. The renderer sends only light/dark/system intent, resolved
mode, opaque-window intent and a hex backing color through the desktop bridge.
Main validates the message and retains sender ownership checks; on macOS an
opaque theme always disables vibrancy, while a translucent theme may use it only
while focused. Unfocused windows and non-macOS windows remain opaque. Legacy
mode-only messages retain their previous backing defaults. Material changes do
not recreate the window or change its bounds.

`tests/theme-material-capabilities.test.ts` covers the shared contract and native
policy; `scripts/smoke/shell/smoke-theme-materials.ts` uses real extension registration,
renderer projection, production preload and native applicator in an isolated
Electron harness. The harness does not boot the full Agent runtime. Expo still
uses its static light/dark palette adapter; dynamic Native themes are not part
of this capability.

### Client voice input ownership

Voice input is a client input service, not an Agent Host tool or chat model.
On Mac Electron, Main owns
one physical capture through a bundled Speech/AVAudioEngine/CoreAudio helper.
A trusted top-level preload port exposes semantic probe/start/stop/cancel events,
never executable paths, audio buffers or credentials. Web supports a selectable
browser speech adapter or the application-owned Hunyuan transcription service;
other Electron platforms explicitly report unsupported input.

The voice extension owns platform selection and a dictation-session result ledger.
Native recognition tasks supply stable utterance IDs, monotonic sequences and
partial/final events. Final results replace only their own ledger entry; hypotheses
never overwrite confirmed history. A task final rotates the native recognition
request while the same AudioEngine keeps capturing; it does not end the user session.
Only explicit stop drains the active request and ends capture. Request routing is
atomic; canceled/stale task callbacks cannot act on a replacement. Recognition
quality and native handoff latency still require real microphone acceptance.

Final-only delivery means recording presents waveform, not editable ASR
hypotheses. Browser recognition uses actual result indices as ledger identities;
it never publishes partial text through the Composer observer. The completed
ordered ledger is delivered once after successful session end. Unexpected end,
unfinished utterances, cancellation or error do not insert partial results.
Draft ownership, session epochs and cancellation fence late results after submission,
route replacement or unmount. Stop finalizes once; cancel invalidates renderer results
immediately, asks the native task to release, and retains physical ownership
until process close (with bounded termination fallback). Main also releases
capture on navigation, renderer death and application shutdown.

Dictation presentation belongs to that same transient input transaction, not an
independent application-wide mode flag. The controller exposes a separate input
interaction subscription; replacing a draft or physical View releases the reserved
insertion transaction and presentation. The recording editor is read-only, retains
its original document and is not fed provisional hypotheses.
A released transaction cannot update a replacement Footer or insert late results.

Dictation captures a concrete Composer controller, synchronously appends to its
View, then sends that same controller's `getText`. It appends trimmed text at the
document end, adding a separator only when
the existing text has no trailing whitespace; it does not replace arbitrary old
selection. Dictation retains this append policy while preserving selection
replacement for generic transient producers.

Because OpenCraft separates Store and physical View, its adaptation adds explicit
write acknowledgement. The input record binds Draft ID, concrete View lease and
content epoch. `replace-content`, target/reset and View replacement invalidate the
old record; both before and after a synchronous write the same ownership must
hold. The View acknowledges only an applied transaction whose physical document
matches the expected result. Missing reservation, rejected dispatch or reentrant
replacement yields `false`/`commit-rejected`; recognition text being nonempty is
not sufficient to authorize sending. This boolean port acknowledges only an
applied OpenCraft document transaction.
Composer owns the original Footer geometry and controls: its standard action
children remain mounted but inert/aria-hidden while an in-place dictation Footer
owns the region. Editors are not remounted to switch modes. The voice extension
provides semantic status, cancellation and a single completion promise, not a
React replacement toolbar or access to the root controller.

While a provider is starting, this same Footer shows only the shared decorative
progress indicator and a neutral screen-reader announcement. Startup includes
microphone acquisition, audio-context activation and provider readiness; it does
not prove that an operating-system permission prompt is open. Only a confirmed
listening event replaces progress with the waveform and starts elapsed recording
time. Cancellation stays available before readiness and fences late completion.
This feedback adds no minimum wait, microphone prewarming or background capture;
it does not shorten or claim to measure physical-device startup latency.

Stop-and-insert completes recognition without submitting. Transcribe-and-send
and Enter wait for final text and revalidate the same draft and physical View
before invoking the existing submission compiler. The read-only editor's Enter
is dispatched by the dictation keyboard owner; Enter on a control remains native
button activation. Send availability while capturing does not depend on publishing
provisional draft content. Cancel, error or owner loss
resolve completion negatively, so late results cannot authorize a send. Repeated
stop requests share one completion. Escape cancels; a 150ms hold
separates release-to-insert from the synthesized click. The gesture owns its
pointer-ID release/cancel listener independently of the trigger's inert state;
blur releases a held gesture, while cancellation/unmount removes its ownership.
Native audio levels are
bounded numeric samples at at most approximately 20Hz; they bypass draft snapshots
and feed a View-owned, bounded waveform buffer. No raw audio or second capture
crosses into the renderer; meters without actual samples show a quiet baseline.
See [the dictation interaction plan](../design/dictation-interaction/task_plan.md)
for the interaction contract and acceptance evidence.

Web cloud dictation separates `AudioCapturePort`, `SpeechServiceClient` and the
existing `SpeechInputProvider`/Composer transaction. Browser capture owns a single
MediaStream/MediaRecorder, drains the final recording event and converts decoded
audio to canonical mono 16kHz PCM WAV. The backend validates the actual container,
length and duration (250ms–120s), not a client-supplied duration or filename.
It calls TokenHub synchronous ASR with Base64 only after explicit stop; recording
is not routed to the selected Agent/SSH Server. Capability discovery never steals
or replaces an active capture. Explicit Hunyuan selection does not silently fall
back to another recognizer on error. Mac's existing semantic native port is unchanged.

The backend owns the API credential and normalizes vendor failures without raw
payloads. Paid public access is separately opt-in, not inherited from public SSH.
Speech model connections and write-only credentials reuse the installation's
ModelConfigurationRepository/ModelCredentialRepository and existing Model Services
commands. The voice page selects an independent defaultSpeechModel; chat defaults,
catalogs and DSH execution projections exclude ASR models and credentials. Only a
Host with the application speech service advertises ASR creation. Speech does not
follow selected SSH Servers. Legacy environment credentials require an explicit
one-time import, never runtime fallback. Capture pins an opaque configuration
binding, checked before billing; model/key changes reject old recordings instead
of redirecting them. Display-only renames do not invalidate captures.
Uploads and vendor calls share a two-operation concurrency bound; admitted paid
calls are bounded to ten per minute. Same session/attempt replays are bound to the
audio digest/language/configuration binding and use a bounded, five-minute in-memory result receipt;
there is no cross-restart task durability or vendor idempotency claim. Client
disconnect/shutdown aborts local work, without claiming upstream cancellation or
refunded usage. Voice recordings are not conversation attachments or database rows.

A retryable failure keeps the original transient input and the same ephemeral
audio, offering up to two explicit retries and expiring after two minutes idle.
Every retry gets a new attempt identity. Failure settles any old send completion
negatively: retry alone can insert, never revive the failed send intent. Cancel,
target/View loss, expiry or extension disposal releases the audio and fences
late results. UI retry/status replaces the existing Footer slots and does not
remount the editor. Deployment and acceptance are in [cloud dictation](cloud-dictation.md).

Input device UID and optional recognition language are client/profile preferences
in Main's private JSON storage, independent of model configuration and DSH.
Device enumeration/probe requests no recording permission. A missing selected
device is an error, not permission to silently switch microphones. System
authorization is requested only by explicit capture start.
`supportsOnDeviceRecognition` is checked for the selected language at capture:
when supported the request requires device recognition; otherwise Apple speech
service may be used. No universal offline guarantee is made. The bundle/helper
carry privacy descriptions and audio-input entitlements. A signed probe and
synthetic desktop test do not prove real microphone permission or recognition;
that acceptance is reported separately in [the native speech plan](../design/native-speech/task_plan.md).

### Client cache and presentation resource policy

A client LRU eviction closes the entire unowned read chain: Conversation runtime /
Replica / navigation, Session ThreadView, history context and background history
ownership, buffered notifications and stream-role entry. If the initialized peer
declares read-unsubscribe, it also detaches that logical server readership. New
acquisition waits for the old detach reply before resuming, preventing an old
unsubscribe from detaching a new consumer. Late history results cannot recreate a
released View. Servers without this capability retain their own attachment policy;
local state is still released. Eviction never cancels a Turn or a remote desktop.
Observers, commands, accepted/streaming work, pending interactions, hydration and
non-durable ephemeral forks remain protected from cache eviction.

Platform adapters select resource policy once: desktop keeps at most 4 inactive
Thread runtimes / 20 inactive Views / 20 inactive Scopes / 128 catalog summaries;
Expo and coarse-pointer Web keep 1 / 4 / 4 / 32. Retained Views own Scope leases,
so total cached Scopes can include both View-owned and separately inactive scopes.
Inactive Thread content also has an estimated 64MiB desktop / 8MiB mobile budget;
it estimates UTF-16 strings and object overhead, not actual heap size. Active work
can exceed this cache budget. Catalog summaries never materialize every row as a
Session ThreadView. The separate 50 nonempty draft-owner budget is unchanged.

### Thread lifecycle ownership

Conversation pinning is native Server metadata, not a Sidebar preference or a
bridge database. The `opencraft/thread-pins` extension declares a discovery
adapter; its list response separately proves support for the current initialized
connection. Codex uses its reserved native pinned section and metadata-only
section moves; legacy peers without that section remain unsupported. Hermes
uses the already-authenticated Dashboard HTTP channel, passes the owning profile
in each PATCH, and preserves native compression-lineage persistence. DSH owns an
ordered, atomic pin index in its home; Pi owns pin fields in each durable session
record. Temporary Pi sessions cannot be pinned. Neither discovery nor mutation
resumes or starts a Thread.

Pi publishes pin changes only after the atomic record replacement succeeds.
A rejected write leaves the previous committed state visible and a repeated
intent retries storage. Metadata saves queued during a pin write preserve its
committed result; failed writes remove only their own temporary file. Concurrent
pin intents reserve ordered timestamps without making pending state authoritative.

The normalized pinned catalog returns complete summaries beyond recent pages.
Runtime merges them once into the initial Sidebar catalog; pinned rows have a
separate visible group and do not consume the recent-row display budget.
The native backend remains authoritative after reload. In-memory write tails
serialize each Thread's intents, and a metadata revision fences reads issued
before a write. A revoked connection cannot publish a late pin result or replay
its write on a successor. Discovery failures remain errors, not unpin-all or
unsupported success. Catalog notifications and connection recovery invalidate
the same shared queries; no menu owns a polling loop or persistent pin set.
The application paints a transient pin-intent overlay immediately, shared by
Sidebar, conversation header and embedded session projection. It survives old
catalog reads until acknowledgement/refresh, serializes each Thread's intents,
rolls back a rejected latest intent, and cannot project or write through a
replaced connection, recipe or authorization epoch. This overlay is not durable
pin authority; successful catalog refreshes and reloads still use native metadata.

The downstream site renders its own Agent sidebar around the embedded Workbench.
The embedded element passes each Thread's pinned state and the current Host's
discovered pin capability to that sidebar, and forwards pin commands to the same
Thread management resource. The site shows pinned rows outside its recent-page
budget and never persists a second pin list.

DSH display recovery uses [JIT history](../design/dsh-jit-history.md): native
message pages retain their original unit and are mapped to requested Turn
windows without a persistent event mirror. Reading a conversation does not
activate its Agent. A read-only native description supplies metadata; execution
acquires the runtime lazily. Older history-index databases are left untouched
and are no longer opened by the local Host.

Stopping a DSH Turn publishes its interrupted state before native
`session.cancel` acknowledges. The execution admission remains owned until that
acknowledgement. A new `turn/start` for the same Thread waits for the pending
cancel to release admission, then uses its original client message ID exactly
once. Other Threads do not wait. A failed cancellation still fails the new
submission; the Host does not replay an uncertain send.

Current model identity is a Thread configuration binding, not an execution-engine
label or merely the last request's model. Fork returns the acknowledged choice;
Catalog persists it for resume and lazy execution, including never-run children.
Dynamic tool wire declarations are retained separately from normalized engine
descriptors. Preflight precedes native creation; cold display registration accepts
the declaration without mounting an Agent, and activation installs it idempotently.

For DSH-backed Threads, OpenCraft owns persisted Thread names, archive state
and fork/subagent relation in `opencraft-threads.sqlite` under the Host product
data directory. Codex uses its native AppServer name and archive state, with
`thread/list` and `thread/read` projecting names, instead of duplicating them
in the DSH catalog. Engine
history remains behind the native execution port; metadata discovery never
overwrites a user name or revives an archived Thread. Temporary metadata,
native event logs and application history indexes remain in memory and are
expired on engine restart. Projection/checkpoint adapters must not persist
temporary content, including late disposal writes.

AppHost stamps a logical client identity at the trusted lease boundary and
routes targeted replies/server requests back to that client. Physical transport
sharing does not merge subscription or execution ownership. `thread/unsubscribe`
detaches one logical subscriber; another subscriber is unaffected. Idle durable
threads unload after a 30-minute no-subscriber activity grace; a temporary thread
releases after its final subscriber. Unload and resume transitions serialize.

The daemon’s native engine adapter has one physical AppServer stdio subscription per Thread, while
each browser lease owns a separate logical read subscription. A logical
`thread/unsubscribe` or lease disconnect removes only that Client; it never
forwards a native unsubscribe. A pending `thread/resume` is a provisional read
target so notifications arriving before its reply can enter that Client's
resume buffer. Detach/disconnect invalidates the provisional target, and a late
reply cannot reattach it or acquire the separate interaction-response owner.
The Host keeps the physical subscription while any logical reader, admitted
Turn, unsettled queue item or unanswered AppServer request still needs events.
Only an idle, demand-free native Thread is released (2-minute grace for
durable Threads, immediate for ephemeral Threads); release and new native work
serialize per Thread. This is live fan-out plus snapshot/replay during resume,
not a durable event log or multi-tenant authorization boundary.

The packaged Codex runtime is selected by `runtime/codex/package-lock.json`. Its loaded paginated-Thread
resume path can attach a new Client with `excludeTurns` without materializing
the full persisted history. OpenCraft still sends the physical `thread/resume`;
skipping it would lose atomic subscription and interaction ownership. A
server-rejected Resume is retained for the current connection generation so
automatic View reacquisition does not replay the same failed native request.
An explicit user retry and a new physical generation may retry; transport
failures are not memoized. A provider may explicitly declare a transient RPC
failure with `error.data.retryable: true`; it is also not memoized and the
Workbench's existing bounded history recovery may retry it. Missing, false or
malformed retryability retains the rejection behavior. This does not enable
automatic replay of arbitrary commands. The shorter Host grace is an additional release
policy, not a substitute for Codex's own idle-thread cleanup.

Native Fork copies a complete, validated event/context prefix with opaque
provider state, not the currently loaded UI turns. Turn boundaries use logical
to-native generation coordinates. Fork gets a new logical identity; execution
recovery keeps the existing identity. Side Chat adds a canonical inherited-history
boundary before acquiring a view or accepting new work. It inherits the effective
model, roots and permissions without continuing the parent task. Its close
transaction retains cleanup ownership for retry and preserves primary failures.

The Thread menu and Side Chat read one versioned Host lifecycle extension,
`opencraft/thread-lifecycle`; an absent, unknown-version or omitted operation
is unsupported. Codex and DSH both use the generic `thread/fork` menu action
and navigate only after the Host acknowledges the child. The menu keeps a
visible pending state while that acknowledgment is outstanding;
once acknowledged, it opens the child without waiting for a background thread
catalog refresh. A changed route scope prevents the late result from stealing
navigation, while the catalog refresh still runs for eventual list freshness.
Ordinary menu Fork requests metadata only (`excludeTurns: true`); opening the child uses the normal paginated history path, avoiding a full-history response that the catalog would discard. Completed, failed and interrupted historical replies expose “Branch from here”, passing their native `lastTurnId` inclusively. Pending/streaming and cached non-authoritative views expose no executable turn fork. The parent history is unchanged; later turns are omitted from the child by the engine, never by slicing rendered messages. The action disables duplicate clicks while pending and reports failures without automatic retry.
Ordinary Fork keeps the native AppServer parameter semantics and has no
Workbench request deadline; unlike short reads, a large-history Fork must not
be declared failed after the generic 30 seconds. A transport loss still leaves
the outcome unknown, so the UI warns against blind retry rather than claiming
that the child was not created. Identical concurrent durable Fork intents
share one pending AppServer request within the Host runtime.
Temporary Side Chat requires explicit fork or ephemeralFork, plus ephemeral, inject-items and
unsubscribe support. Codex
Fork is only recoverable after the source's first Turn has been accepted;
paginated ephemeral Fork uses `excludeTurns: true` and its returned child is
adopted as the baseline rather than resumed from durable storage. The shared
Codex Engine adapter subscribes only the requesting logical client to the
child; a disconnected client's late Fork response cannot reclaim ownership.
Codex persists a blank durable Fork so `thread/read` can recover it after an
engine restart, but its native `thread/list` omits that child until the first
child Turn completes. The Host-scoped Workbench runtime temporarily projects
the acknowledged child into the default catalog and removes that projection
once the native list includes it; ephemeral children and filtered/archived
queries are never overlaid. The projection is in-memory, so a browser reload
before the child's first Turn retains direct-route recovery but not sidebar
discovery of that blank child.
`ephemeralFork` additionally declares temporary context forks without enabling
persistent Fork actions. Side Chat requires `fork` or `ephemeralFork` together
with ephemeral, injection and unsubscribe support, resolved for its parent Thread.


The SDK fences late unsubscribe responses, retains newly acquired views and
actually reattaches them. Naming uses per-Host/Thread acknowledgement queues and
optimistic-write generations; archive/unarchive modifies durable catalog state,
never deletes a workspace. Catalog notifications invalidate shared queries.
Codex Host exposes rename through `thread/name/set`; the native `thread.name`
is readable from list/read and survives an AppServer restart. The Workbench
title writer keeps optimistic edits scoped to the same Host/Thread until the
native acknowledgement or failure arrives.
The application shell alone projects the current page title to `document.title`
as `<page title> · <application name>`, sharing the header's task/extension title rather
than introducing a second title cache. The managed site Web uses `the managed-site brand`, including initial HTML;
Electron uses `OpenCraft`, and embedded workbenches leave the host title unchanged.
Draft and Settings pages use the application name;
background conversations and panels cannot overwrite the document title.
Codex Host advertises archive only when its native AppServer path is wired:
`thread/archive` and `thread/unarchive` pass through the logical-client adapter,
and archived Settings reads native `thread/list {archived:true}`. A Codex Thread
without a first accepted Turn has no rollout to archive; the existing
first-Turn durability rule keeps that blank Thread out of the durable sidebar.
The main sidebar offers only Host-declared operations for active Threads and
does not retain archive-management or transient undo state. Archived browsing
and restore belong to a capability-gated Settings page, scoped to the active
Host and backed by the same catalog query/invalidation owner. All menus and
settings controls reuse the existing Radix and theme primitives. Source and acceptance are tracked in
[the lifecycle plan](../design/thread-lifecycle/task_plan.md).

### Machines, Work in and Agents

The presentation below describes standalone Web/Electron. Downstream embedded
Work in/machine and icon gating remains unfinished; standalone implementation
and earlier upstream validation are not embedded acceptance evidence.

A machine is a presentation group of logical Hosts, not a Host replacement.
The daemon creates a random UUID once in `<resolved daemon dataDirectory>/machine-id`
(desktop: the directory resolver's `dshDataDirectory`) and reports it through
`runtime/machine/read`: `{ machine: { machineId, name, platform }, agent }`.
`platform` is `macos | linux | windows`; `agent` is `OpenCraft | Codex` for the
current daemon adapters. Both daemon Hosts report the same machine object.
`name` defaults to the OS computer name (macOS ComputerName, otherwise hostname);
a deployment may set it with `--machine-name <name>` (trimmed, at most 64
characters, no control characters). The name is display-only and never changes
`machineId`. Headless also accepts `OPENCRAFT_MACHINE_NAME`, with an explicit
`--machine-name` taking precedence. An independently running DSH Host uses its
operator-owned `machineName` configuration; configure both processes consistently.
Server-managed recipe overlays forward local machine observations to the base
metadata store without editing recipe revisions or asserting SSH machine identity.
The extension is declared in the handwritten OpenCraft method map; upstream
Codex-generated types remain upstream-owned. Identity-only App Host leases do
not initialize or start an engine; native initialize remains unchanged for normal
runtime connections. The Local Agent also exposes the identity supplied by its daemon.

The client caches the latest report with its Host profile, including for
activation-owned profiles (metadata persists, the connection recipe does not).
Identity observations do not increment connection-recipe revisions. Missing or
unsupported reports leave each Host in an independent unknown-machine group.
Probes, initialization and reconnects share one observation generation; superseded
reads cannot overwrite a newer report, and transient failures do not erase the
last report. Only reported `machineId` establishes grouping; URLs, names and hostKind never
establish equality. Provider-managed `MachineResourceLifecycle` entries remain
separate cloud resources with their existing lifecycle copy. Host and
`(hostId, threadId)` identities remain unchanged.

The standalone Web/Electron composer always shows **Work in**, even for one machine. Web uses the
reported machine name; Electron's builtin daemon uses **This Mac** on macOS or
**This computer** otherwise. Sidebar provenance uses the same name and hides it
when only one machine is available. Agent models are grouped within the selected
machine; multiple profiles for one reported Agent use the current connection
when available, otherwise the first enabled profile, without merging logical
Hosts or Threads. Inactive engine catalogs load only after the model menu is opened.
Cloud resources remain visible but unselectable while not connectable.
Manage models links are exposed only for the matching registered Settings owner
(`local` Model Services / `local-codex` Codex Accounts).

Changing Host creates a new Host-owned Draft/View through the application Router,
transferring its current document, attachments, context, options and selections
after activation. Inline images and same-machine staged files remain usable;
uncompleted attachment processing and files belonging to another machine remain
visible with a localized unavailable state and prevent submission until replaced.
Attachment removal retains the original staging Host owner. Same-machine Agent
changes preserve cwd and project selection. Machine changes keep a project only
when its workspace directories exist on the target machine. They reuse a matching
target Host project ID without creating records; unmatched catalogs and Hosts without the Project API keep
the verified folder without a fabricated project ID. Missing directories clear
the workspace. The current Agent is retained
when available, otherwise the target machine's first Agent is used. New intents
cancel prior preparation; project retargeting cancels an in-flight placement
change even during its navigation preparation; late connections cannot navigate or apply a model to
the replacement draft. This does not move existing Threads, introduce a remote
server connection flow, or forward model credentials between machines.

### Project selection and persistence

OpenCraft owns the local Project catalog and stable IDs. The local Host serves
`project/list` and `project/create` from `projects.json` in the product storage
directory (desktop: `~/.opencraft/projects.json`), using locked atomic writes.
Selecting the same normalized roots reuses the existing Project; the catalog
does not come from DSH `workspace.list`. DSH only receives execution `cwd` and
workspace roots, and can be replaced without losing the product catalog.

Electron Main exposes a narrow, trusted-main-renderer `projects.pickDirectory`
port. It opens a parented directory-only system dialog, validates the selected
absolute directory, and returns a path or null on cancellation. It does not
create a Project. The shared project menu consumes the port only for `local`;
Web/remote Hosts use their Host-scoped `fs/readDirectory` picker. Advertised
`workspaceBrowseRoots` select its starting boundary when present. Without one,
the picker starts at the filesystem root so a connected Web user can add an
existing server folder without rebuilding the Web bundle.
Adding a Project requires the selected Host transport to be ready; the menu
explains why it is unavailable while connecting.
An interaction epoch invalidates picker/create results when the draft, Host,
workspace, submission phase or visible route changes. Persisted additions remain
in their original Host catalog, but never retarget a replacement draft.

### Read-only SQLite diagnostics

The thirteen Node SQLite storage kinds use the shared sqlite-node lifecycle;
physical paths and exclusive owners stay separate. A configured Local Agent opens
its five foundational stores plus the existing Tasks file before listening. Its
failure releases handles and rejects startup. OpenCraft Host state opens queue, sender and
enterprise identity tables through one connection/migration owner; attachments have their own file.
Host-private Tasks remain lazy and validate storage before capability success.
SSH management opens only for the configured feature. Private Host failures cannot
publish that Host open; unused optional owners do not prevent default embedded or
headless operation. Electron Main's three stores remain lazy; account-pool belongs
to the selected embedded or independent Codex owner. Native engine databases,
reserved-section pins, read-only diagnostics and writer locks are not adopted.
`daemon/ready.storage` retains its original five-name projection for old clients;
optional `storageOutcomes` adds complete scoped outcomes. New clients accept both,
and gateway/Headless health project only actual owner opening results. These are
migration dispositions, not claims that every optional engine is initialized.
See [storage lifecycle](./sqlite-lifecycle.md) for implemented behavior, manual
recovery and verification limits, and [plugin persistence](./plugin-persistence.md)
for payload migration. This retains node:sqlite without Drizzle; Web retains
IndexedDB and its existing adapter-specific upgrade coordination gaps.
Client-local and Host-owned data have separate authorities; engine-private
databases retain their owners. Code rollback does not restore database backups
or promise N-1 binary compatibility.

The first [Host document API](./host-document-storage.md) implementation exposes
versioned capability discovery, read/CAS and content-free invalidation on the
authenticated Local Agent Host. The client borrows a fixed initialized Host
connection and rejects old generations, with no local fallback or implicit
reconnect. This adds API capability, not a Host plugin runtime or multi-tenant
authorization model. SQLite code is shared through document-storage's explicit
Node entry; Web/Expo consume only the pure contract.

Electron internal developer mode exposes a Settings inspector for the four
OpenCraft-owned local Agent SQLite databases under the current desktop profile:
session routing, history index, thread catalog and execution authority. Main
owns the filesystem boundary and opens only those fixed filenames with SQLite
`readOnly` plus `query_only`; Renderer receives database metadata, table schema
and bounded paginated rows. The port accepts neither paths nor SQL and provides
no mutation, import, export or delete operation. Developer-mode visibility is a
presentation gate, not the security boundary. Row values stay on the device;
Blob data is summarized and long cells are bounded for debug rendering.
The Workbench-owned five-Escape gesture toggles internal developer mode for the
current browser session. Plugins, Laboratory and the Electron SQLite inspector
are internal Settings entrances. Disabling the mode removes them
immediately; an active internal-only route returns to Appearance rather than
leaving inaccessible content mounted.

Bot product surfaces are temporarily part of the same internal presentation
audience. Normal mode does not project the Bots application, Bot sidebar
entities, Bot creation command, or Bot conversation views. Enabling developer
mode restores them together; disabling it while a Bot view is active returns
to the ordinary Chat route. The extensions and AppServer capabilities remain
loaded, so this audience flag is a presentation policy rather than an
authorization or persistence boundary.

### Internationalization authority

The [project-wide authoring and coverage contract](internationalization.md) applies
to every first-party app, shared UI and bundled plugin. Source discovery is no
longer limited to migrated Web feature folders: `check:i18n` also checks literal
JSX/accessibility/branch/template copy against an explicit legacy inventory and
validates descriptors under their Web/shared or native Main catalog owner.
A clean check reports remaining inventory debt; it does not certify full project
translation or indirect/imperative message paths. Shared dictation, queue and
image/table preview controls consume the existing application's Intl instance,
preserving domain values, draft/editor identity and current preview/queue state.


Application localization uses an explicit
locale override, an `IDE` / `SYSTEM` / `FIRST_AVAILABLE` source policy, canonical
BCP-47 tags, regional catalog matching, lazy messages, and a cached FormatJS Intl
instance. `FIRST_AVAILABLE` prefers a non-English IDE locale, then a non-English
system locale. The standalone Web/Electron adapter selects `SYSTEM`; the embedded
host supplies its locale through the `ideLocale` input. Product region is not an input.

`packages/i18n` owns `LocaleRuntime` and its narrow `IntlPort`. Each application
gets its own runtime/cache. Its snapshot carries the exact Intl object consumed
both by `RawIntlProvider` and imperative services; no global language singleton
can cross embedded application lifetimes. UI call sites own stable message IDs,
English `defaultMessage` and optional translator descriptions. FormatJS handles
ICU plural/select, rich text, dates, numbers, lists and relative time. Missing
translations use English source messages while Intl retains the resolved locale.

`locale.override` is an installation-scoped UiPreferences key. Empty string means
no explicit override and must remain empty when resolving system/host language.
The existing IndexedDB / Main SQLite adapters own persistence and invalidation.
React does not write locale localStorage. Desktop supplies preferred system
languages through a trusted preload port; resolved renderer locale also updates
the native tray through a validated IPC projection, without writing another preference.

`WorkbenchIntlProvider` sets lang/dir on its owned presentation root. Standalone
owns the document element; an embedded instance owns its custom element only.
Embedded `localization` options and `setLocalization()` update the existing
runtime. Without explicit host input, the embed observes its parent document's
lang. Language changes never recreate applications, conversations or Composer
editors. ProseMirror updates placeholder/aria-label in place and retains history,
selection, composition and draft ownership. Translator resource requests are
generation-fenced; failed chunks retain source messages and can be retried.

Settings contributions may declare portable `titleMessage` / `groupMessage`
descriptors alongside their legacy string fallbacks. The contribution registry
validates and freezes descriptors; the Settings projection resolves them with
its application's Intl object on each locale change, without reactivating
plugins or changing page IDs, Host ownership, ordering or selection. Built-in
model services, remote connections, Codex accounts, voice input and employee
identity navigation use this contract. Unmigrated extensions retain their string
labels. Extraction includes the owning public built-in and voice plugins; employee
identity, creator grouping and participant catalogs and their validation belong
to the downstream adapter. Trusted product composition adds non-conflicting
messages to the existing application catalogs; it cannot replace core messages
or add language choices. The build entry replacement covers both the main bootstrap
and the locale catalog importer, so activation and translation consume the same
trusted composition rather than silently using separate extension lists.
All consumers retain the same application Intl runtime
and activation owner. Anonymous account labels use provider-owned message
descriptors rather than provider-ID conditionals in the Shell.
English and Simplified Chinese cover these menu labels and section headings.
This coverage does not claim that every contributed page body is translated.

The initial OpenCraft catalogs cover English and Simplified Chinese for the
migrated shell/settings/chat/browser controls. Other feature-local hardcoded
copy and vendored Hermes dictionaries have not been claimed as migrated, nor
are other products' translation catalogs represented as OpenCraft
translations. Catalog registration
uses literal dynamic imports so only the selected translation chunk loads.

`npm run check:i18n` checks source ID/default consistency and ICU parameter parity;
`--extract <path>` on its script exports descriptors for translators. `test:i18n`
covers source policy, late results, load failure/retry, root isolation, persistence
and shared Intl identity. `smoke:i18n` exercises actual Settings/Composer/Intl and
IndexedDB, including focus, DOM identity and undo across a locale switch. These
checks are part of `gate`; locale coverage is distinct from runtime correctness.

### Account read receipt authority

Read state is account data, not an installation UI preference. `ThreadAttention`
tracks exact Host/Thread/Turn receipts: reading an old Turn never reads a newer
result. `PlatformAccountContribution.readReceipts` optionally binds the verified
account to an append/union persistence port. The fixed installation backend owns
the database independently of selected execution Host, engine and browser.

For enterprise identity, each read/write request verifies the gateway identity; the server derives
the account key. `x-opencraft-read-scope` only rejects account-switch races and
cannot select another account. JSON-only same-origin writes reject foreign
origins, cross-site requests, malformed tuples and oversized bodies. The service
stores bounded exact receipts with existing managed SQLite document migrations
and CAS union, never client whole-document replacement. Future formats fail closed.

`BrowserThreadAttention` owns hydration, optimistic acknowledgements, legacy local
receipt union import and a scoped cache/outbox. Browser persistence is not the
account authority. Unchanged receipt unions neither write storage nor publish a
new snapshot; failed storage writes remain retryable. Visible 15-second remote
synchronization is retained for cross-device read-state freshness, not presented
as eliminated network work. Confirmed remote receipts merge without clearing concurrent
local reads. Failed/unknown writes remain retryable across browser reload; a later
read recognizes already-committed writes. Account/provider replacement and disposal
abort/fence late results. Initial hydration avoids flashing cached unread dots;
a failed first read retains local/offline behavior and subsequent retries.
Foreground accounts synchronize every15 seconds and immediately on focus, online
and visible recovery; background pages catch up on return. This is bounded polling,
not server Push. Clients without an account persistence contribution retain their
local adapter; no remote capability is implied for those products.

### UI preference authority

`chat.turnNotifications` is an installation-scoped boolean, defaulting to false.
The Application owns a `TurnCompletionObserver` across all registered Clients;
it accepts only validated live `turn/completed` events with completed, failed or
interrupted status. Host/Thread/Turn identity deduplicates the latest 2048
terminal events across Client replacement. History reads and Item phases cannot
trigger reminders. Observer failures never participate in execution ownership.

Web's `BrowserTurnNotifications` is an Application-owned platform port shared
by standalone and embedded RuntimeProviders, independent of product branding,
Host kind and execution engine (including DSH). Chat settings explicitly request
the browser's origin permission in the user's gesture before persisting the
preference; completion never requests permission. Both preference and current
permission are checked again after asynchronous worker preparation. Revocation,
disabled preference, unsupported/insecure environments and disposed owners
cannot emit a late reminder. Denied/display-failure states are visible in settings.
Browser permission is not stored or inferred from the preference.
An embedded host whose presentation omits Chat settings can call the element's
`setTurnNotifications(enabled)` from its own user settings gesture after
`prepare()`. It returns false if permission is not granted or the Application
is replaced during the request; it reuses the same port and preference authority.

Notifications include the corresponding Thread title, terminal status and a
short excerpt of the latest accepted user message in that exact Turn; they never
include assistant answers, unsent drafts or queued future inputs. The observer
derives bounded, Client-owned display context from existing Thread responses and
live Item events without issuing extra history reads. Historical traffic can
seed context but cannot trigger a notification. Missing context keeps the generic
status/return message. Shared Chat user-message semantics remove hidden attachment
instructions and prompt wrappers; Unicode excerpts are bounded to 80 title and
160 message characters. Replacing/removing a Client or changing its physical connection generation discards
its text projection and pending context metadata; completion identity dedup remains
Application-owned across reconnects.
A dedicated hashed, non-inlined notification worker uses a nested asset scope;
it handles neither fetch nor clients.claim and cannot replace the existing host
proxy worker. A sender Client ID handshake and per-Application nonce bind its
click to the originating page and the existing conversation navigation command.
Desktop constructor notifications provide the same click behavior when worker
registration is unavailable. Worker clicks after page closure may reopen only
the saved same-origin page URL. This is not server Push: a closed/frozen page
cannot receive fresh completion events. Browsers lacking notification support,
including some embedded mobile browsers, do not gain it from this adapter.

Workbench UI preferences are owned by one asynchronous, typed
`UiPreferencesRuntime`. Every registered key declares a schema, default value
and subject scope (`installation`, `account`, or `workspace`); React never
chooses or calls a physical store. Web installation preferences use a
Renderer-owned IndexedDB adapter. Electron's loopback origin uses a random port
per launch, so its installation authority is a Main-owned profile SQLite table
behind a restricted asynchronous preload bridge; Renderer IndexedDB cannot be
its cross-restart authority. Account/workspace keys must supply their
own HTTP/AppServer authority adapter with revision/CAS.
Temporary interaction state such as peek, hover, drag projection and animation
never enters the preference store.

`sidebar.serverFilter` is an installation-scoped presentation preference holding
a stable Server ID and display-only label (empty ID means all Servers). It is
restored before Sidebar rendering and never broadens because that Server has no
currently loaded rows. The label neither discovers nor authorizes a Server.
The Server selection is independent of the enterprise identity account-owned participation
filter. Reload restores both explicit on/off participation choices and the
selected Server, including an explicit return to all Servers. The combined
real-Sidebar browser regression uses the production IndexedDB and plugin
local-preference adapters rather than an in-memory preference fixture.
Cached catalog rows remain visible across transport loss; row navigation and
mutation actions require a ready logical runtime. A stale management `open`
observation cannot admit background reads during logical reconnect/error;
phase transitions update availability, and ready refreshes the catalog without
remounting known rows. Authorization/recipe revocation retains its existing fence.

Trusted extensions may additionally use the optional `api.localPreferences`
presentation-only port. The platform isolates product/extension/account and
activation lifetime; the plugin owns verified account selection and its schema.
The current Web adapter is localStorage with last-write-wins and tab invalidation,
not revision/CAS or account synchronization. React consumes plugin snapshots and
actions rather than selecting a physical store. This does not replace registered
Workbench keys or claim a Native/Electron stable-origin adapter. See
[plugin persistence](plugin-persistence.md#8-插件的账号本地呈现偏好).

`chat.defaultFollowUpAction` is an installation-scoped `steer | queue`
preference, defaulting to `queue`. Chat settings and the main conversation
Composer consume the same runtime snapshot. The preference chooses the default
intent only while a response is active; idle sends remain normal Turn starts.
It neither creates a Host capability nor enables atomic queued-message steering.
Temporary Side Chat has no durable queue and retains immediate follow-ups.

`voice.inputProvider` is an installation-scoped `auto | system | hunyuan`
preference. Web's default `auto` chooses Hunyuan only after the backend contract
and local recording capability are available, otherwise the browser adapter.
The choice is read once per capture and is independent of model/Host selection;
it grants neither microphone permission nor paid-service access. No speech
credential enters UI preference storage.

Shell Navigation is the first migrated consumer. Applications Pin, Account
Pin, rail detent, last visible detent, navigation-rail width and left context
sidebar width are installation-scoped.
Applications defaults to unpinned. The legacy `applications: true` value is
not migrated because previous releases automatically persisted that product
default and cannot distinguish it from explicit user intent; other valid
legacy geometry is migrated once. IndexedDB and Electron SQLite both carry
monotonically increasing revisions; Web uses BroadcastChannel invalidation and
Electron publishes change events through its preload port.

Cloud Storage uses a standalone management page: the route owns a stable page
title and content boundary.
Its View and navigation contribution are internal-audience only: normal mode
hides both, and disabling developer mode exits an already-open storage route.
This is a presentation gate; storage services and data are not removed.
Anonymous state renders the complete the downstream product site selection and sign-in
controls in that content area instead of replacing the page with a bare notice.
Authenticated state mounts the existing enterprise service file manager for the selected Bot.
This page does not invent local-storage semantics. Skills is a separate full
Workbench: public catalog discovery is anonymous,
while installed state and mutations belong to an explicit installation target.
Targets are either the local DSH user root (`~/.opencraft/skills`) or a connected
Hermes Profile; local DSH is never represented as a Profile or Bot. Workspace
discovery additionally reads `<cwd>/.opencraft/skills`, while DSH retains its
native project/user `.agents/skills` roots. Local SkillHub artifacts cross the
AppServer boundary as bounded, checksummed files, install atomically below the
managed root, and uninstall moves the exact entry to recoverable local trash.
Hermes Profile mutations continue through the Profile Skills Host protocol.
For Settings layout, edge-to-edge is an inset policy rather than a scroll
ownership transfer. The persistent AppShell Header remains outside the content
viewport; the Settings viewport keeps `min-height: 0`, stable scrollbar gutter
and the sole vertical `auto` overflow in the Header-plus-scrollport
topology. Only master-detail pages suppress that outer scroll and delegate it to
their bounded internal panes. Feature content must not add a second page-level
scroll container merely to compensate for Shell clipping.

Task workspace presentation is specified in [the workspace design](../design/README.md).
Shell chrome paints only its leading navigation/main region and trailing window
actions. These disjoint paint regions derive from the same live pane geometry as
the main viewport, including full-width transitions; the aperture between them
belongs to the panel toolbar, not an opaque full-window header overlay.
The right-panel toolbar owns fixed plus and tab-list controls outside the
horizontal tab scrollport. Only resource tabs and the drag tail scroll; new-tab
and tab-list entry points stay reachable when tabs overflow. Its dropdown follows
the plus picker. Its first section lists available creation actions; its second section
lists all tabs in the current owner's region, independent of Browser/Terminal
type. Right-side Browser and Terminal icons remain direct creation shortcuts.
Both menus call the same creation actions; existing entries dispatch activate-tab
without creating resources. No type-group metadata or second tab store is needed.
Duplicate titles retain distinct IDs and display an ordinal; Escape does not
create/switch a resource, and selection hands focus off after the Radix menu closes.
The product exposes right-side tools only; no bottom outlet or move/reveal controls.
Legacy bottom tabs return to the right without disposing their resources.
The Cordis panel service owns tab state; main-chat overlay consumes
the existing Composer controller and Shell geometry. SideChatService owns explicit
ephemeral forks, not parent navigation. Implementation/verification status and
protocol adaptations are tracked there rather than implied by a successful build.

| Layer | Owns | Platform imports |
| --- | --- | --- |
| `appserver-protocol` | host-aware RPC, restore and replica protocol | none |
| `appserver-client` | JSON-RPC request lifecycle and low-level Cordis registry utility | none |
| `appserver-replica` | V4 authority/client, journal replay, snapshot replacement and Cordis registry | none |
| `appserver-replica-storage-node` | atomic JSON persistence for servers and Lab | Node filesystem |
| `appserver-replica-storage-web` | transactional client cache | IndexedDB |
| `appserver-replica-storage-expo` | transactional native client cache | Expo SQLite |
| `appserver-session` | AppServer Resume/View hydration and V3 compatibility reader adapter | none |
| `appserver-transport-websocket` | browser, React Native and direct daemon WebSocket | WebSocket only |
| `appserver-transport-memory` | deterministic in-process AppServer | none |
| `appserver-transport-replay` | frame recording and deterministic replay | none |
| `app-host-protocol` | host/generation/lease envelopes outside AppServer JSON-RPC | none |
| `app-host-client` | Renderer-side logical App Host channel transport | MessagePort-like port |
| `app-host-server` | daemon-side physical Host lifecycle and cross-window lease multiplexing | injected transports only |
| `account-pool-host` | Host-private account metadata/secrets, affinity, quota policy and loopback provider proxy | Node filesystem, SQLite and HTTP |
| `daemon-ipc` | authenticated local daemon handshake and framed IPC | Node socket types |
| `chat-core` | host-aware identity and Turn → Frame → Block projection | none |
| `chat-runtime` | Replica-derived Timeline snapshots and command/history ports | none |
| `composer-core` | portable document, target-scoped draft, SubmitIntent and controller | none |
| `composer-appserver` | lossless document compiler and AppServer command port | none |
| `timeline-virtualizer` | Turn window, restore, anchors, follow and spacer policy | none |
| `workbench-runtime` | HostRuntime registry; per-Host client ownership, Thread catalog and Replica/Session orchestration | none |
| `workbench-resources` (proposed) | renderer-neutral resource identity, durable route and presentation contracts | none |
| `extension-contract` (proposed) | versioned manifest, identity, optional access declarations, contributions and RPC | none |
| `extension-runtime` (proposed) | activation graph, owner-aware contribution broker, install/access state and Cordis-backed trusted runtime | none |
| `capability-core` (proposed) | AI-facing Spec, Offering, ModelView, Lease, Invocation and Receipt | none |
| `capability-runtime` (proposed) | catalog, progressive disclosure, resolver, policy, execution router, journal and Draft Lab | none |
| `design-system` | semantic colors, spacing, radii and theme computation | none |
| `design-system-web` | shared Web/SVG progress projection, document animation phase and motion preference cleanup; consumes renderer-free geometry | React and DOM only |
| `composer-editor` | ProseMirror/DOM composer view | DOM only |
| `workbench-web` | Workbench frame, SCSS, Electron/browser adapters | React DOM |
| `workbench-expo` | Expo Router routes, native views, Expo Web view | React Native |
| `workbench-electron` | windows, tray, static origin and App Host byte relay | Electron main |
| `opencraft-daemon` | native Host process, physical transports, local Agent and DSH lifecycle | Node only |
| `apps/appserver-lab` | machine-first SDK smoke, recordings and fault injection | Node only |

Shared packages expose data and behavior, never DOM nodes, React Native views,
storage implementations, timers, file handles, or Electron IPC. Hosts inject
those capabilities through typed ports. `npm run check:boundaries` rejects the
most common dependency inversions.

Cordis Contexts are lifecycle scopes, not global application identity or a
third-party security boundary. Multiple scopes are valid when their resources
are independent; the invariant is that a physical connection, Browser instance
or native Surface has exactly one owner and every child scope is disposed by the
Application Supervisor. Renderer extension registries do not need to share a
Context with AppServer Host runtimes.

### Embedded Workbench Shell

`workbench-web` also publishes a native Web Component entry for embedding the
Workbench canvas without an iframe. The embedding product owns its outer
Sidebar, Explore/Chat routing and page history. OpenCraft owns only the right
canvas: the standard Thread/Draft conversation route, Composer and Header.
The embedded projection exposes an initially collapsed Right Panel for webpage
and conversation file previews. Its action allow-list contains only the browser
launcher; its resource renderer is read-only and omits filesystem browsing, search,
watches and editing. Full Workbench capabilities remain unchanged. Embedded Chat does not use the Bot
conversation protocol. The outer Bot identity selects a logical Hermes Host
scoped by both physical instance and native Profile; the canvas uses ordinary
AppServer Thread ownership inside that fixed Profile. Thread list, creation,
resume, history, model catalog, rename and delete must never escape it. Physical
Dashboard/session-token reuse remains instance-scoped, while Composer queue and
other logical Host state include the Profile identity.
The embedded entry constructs the same Application runtime as the full
Workbench, but contributes an explicit, ephemeral the downstream product Host profile and
never opens or writes the normal Host catalog. Its fixed profile store is an
Application-local adapter, including machine identity observations; connection
recipes and the execution target remain owned by the embedding product.
On startup it restores only a Thread remembered for that exact Host identity;
Thread memory additionally uses the current account/region authority. Unbound
legacy selection keys remain untouched and cannot select a conversation for a
different account or Profile; native history is retained.

These differences are expressed by a typed Workbench Presentation Policy, not
route- or product-name conditionals. The full policy enables Shell navigation,
context Sidebar, Right Panel and Connector launcher. The Embedded Core Chat
policy disables Shell navigation, context Sidebar and Connector launcher, while
restricting Right Panel renderers to browser and read-only resource previews and
Composer actions to voice input. `executionSelection=fixed`,
`machineManagement=false` and `runtimeHostConfiguration=false` also prevent Work in,
Agent/machine/settings entry points and reject configuration/retarget actions
before effects. Host-default Composer catalog writers explicitly do not write
runtime model configuration, including after submission or reconnection. The
existing Router remains the sole navigation authority. The full policy projects all
Composer actions. This keeps unavailable Web Speech or future optional actions
out of embedded products without component-level product checks.

The domestic console uses embedded OpenCraft Chat by default. The
international console retains AgentChat. The host passes an in-process session
accessor to the component; credentials are never HTML attributes or copied to
OpenCraft localStorage. Account metadata stays in memory. The console remains
the login/logout owner, and embedded startup never consumes its OAuth callback.
Vendored RepositoryContext requires injected account-bound repositories and has
no module-level default initialization that could consume a host OAuth URL.
Session replacement or logout synchronously revokes the old accessor and hides
and disposes its component before another instance can borrow the new session. Entering the domestic Chat route
loads OpenCraft; a neutral loading surface replaces legacy (which is not
mounted) while the embedded Host connects, activates its ordinary Thread/Draft, hydrates initial
history and paints. Connection failures retain the same Application and Host so its
automatic recovery can complete; they never silently restore legacy. The host projects
`opencraft-connection` phases and offers `reconnect()` without remounting a painted
canvas. A module/application startup failure before adoption offers a fresh startup retry. The Web Component's own `show()` then grants its write
lease. `hide()` revokes that lease synchronously without disposing the
Application, so returning to the host-owned Explore view cannot lose
conversation state. Only the visible owner may send,
cancel, approve or answer an interaction. The stable
`/__opencraft/embedded-workbench.js` loader points to a content-addressed Vite
entry; deployments using another static origin must provide the required module
CORS policy explicitly.
For the downstream Pages release, the Embedded Workbench remains an independent
Vite target and is staged under the same-origin `/__opencraft/` subtree beside
the Next export. It is not imported by the Next application bundle and is only
requested when domestic Chat is active. The release build fails closed when the
reviewed Embedded artifact is unavailable, so legacy fallback cannot disguise
an incomplete production artifact.

Resource preparation starts at the domestic host Chat route after authentication,
before the Next entitlement/Bot gate and lazy settings page, alongside Bot
discovery, through the same lightweight deduplicated loader used by the migration
surface. The actual domestic rollout authority, not hidden-tool preferences,
enables both paths. Loading code never bypasses the entitlement gate for content.
It registers the component but creates no Application or Host; the confirmed
instance/Profile binding still gates the single canvas owner. Failed speculative
loads are retryable by the surface. Optional Host Proxy startup runs independently
of chat readiness. Remote loopback Browser navigation instead waits for its own
proxy registration to activate; it never falls back to client-local localhost.
Embedded Vite `assets/a-[hash][extname]` resources have immutable one-year cache
headers in the Pages artifact. Stable loaders, version files and Service Workers
remain revalidated; publishing must continue retaining old content-hash closures.

The authenticated domestic Chat route may also prepare a physical enterprise service connection
from the intermediate result of its existing instance-list read, independently
of the slower per-instance Profile catalogs. A sole discovered instance that is Running or an
explicit verified root-instance selection is required; a named Bot among several
machines is not enough to guess its physical target. The enterprise service API retains ownership,
Running-state and active-Pass checks. No extra Application/account service is
created, and the preparation sends only enterprise service handshake: no PTY, Dashboard
bootstrap, loopback health probe, Profile tools or AppServer RPC.

This in-process preparation capability is owned by the route/session discovery
generation and is bounded to 15 seconds while unclaimed. Navigation, discovery
replacement and credential changes revoke it; late HTTP/socket results cannot
revive it. The confirmed Profile's normal provider/preflight and fresh instance
validation still run. Only a matching account, region, instance and API base can
claim the same multiplexer exactly once. Adoption enables the formal transport's
ordinary health probing and transfers disposal responsibility to that transport;
the preparation binding and multiplexer configuration are owner-held snapshots,
not borrowed mutable caller options. Health configuration must succeed before
the transfer commits, so failures still leave a resource that can be disposed;
the route's old preparation owner cannot close an adopted Host. Failed, expired,
lost or already-consumed preparations use the ordinary connection path. The
capability is not stored in profiles, HTML, browser storage or a global pool.
Older independently deployed Embedded artifacts without the static preparation
API keep their original startup path. Dashboard ensure remains a post-adoption
Host operation because it can start or replace an owned remote backend.

The Embedded Application owns one deferred startup lane for Voice,
Collaboration, Bot Chat/Management presentation and the Terminal panel module.
The element releases that lane after its first visible `show()` handoff has
painted; repeated `show()` calls do not activate a second copy. The required
account/instance/Profile validation, WebSocket and Hermes providers remain in
bootstrap, as do Terminal session/tool services needed by protocol capabilities.
Only optional presentation modules move behind chat readiness. They activate in
dependency order through the existing ExtensionSupervisor/Panel runtime; failure
does not revoke an already usable chat. Full Workbench defaults to its existing
eager startup policy. This is an Application startup plan, not a second
Application, speculative Host, or general extension activation-event dispatcher.

Retirement aborts pending optional module scopes before factories can acquire
resources. An in-flight activation is drained before borrowed services,
registries or the Host are disposed; its own Supervisor owns activation and
rollback deadlines. Module waits are bounded, and late imports after timeout or
retirement cannot install into the retired Application. A hidden/disposed element
cannot release a stale paint callback's startup lane.

ExtensionSupervisor closes admission synchronously at its first disposal call and
revokes pending activation APIs before waiting. All disposal callers share the
same completion or cleanup failure. Already admitted activation/deactivation
operations drain before active extensions unwind in reverse order, so rollback
can still borrow its providers. Factory and internal-commit results transfer
resource ownership before checking retirement. Late optional module results
cannot activate or rewrite the retired Supervisor's diagnostics. Existing
activation/cleanup deadlines still bound trusted asynchronous work; this does
not forcibly terminate arbitrary plugin code.


`show()` is a browser-origin-scoped persisted toggle, not a one-way component
callback. One shared feature-state controller owns versioned storage, in-page
events, cross-tab storage reconciliation and a ref-counted global command.
Calling `show()` again disables the other revealed surfaces and persists that choice;
page components subscribe to the state and never wrap `window.show` themselves.
This command does not change the domestic Chat owner.
The underlying persisted-feature primitive is reusable by other internal
feature gates without copying localStorage/error/event lifecycle code.

Trusted build composition selects an explicit, immutable presentation policy
(`WorkbenchWebBuildFeatures.presentation`), independently of product identity.
The build validates and serializes icon style, default theme ID and hidden builtin
theme IDs; the renderer reads it synchronously before its first appearance snapshot.
Public defaults use the standard icon adapter and Neutral theme. A custom identity
alone never changes artwork, palette defaults or the catalog. Existing async client
product entries keep their account/engine lifecycle and need no additional export.
Saved theme intent and existing storage/theme IDs retain their previous authority;
an unavailable selection uses the configured fallback without overwriting storage.
Presentation is not permission, routing or account authority.

Both
the downstream product embedded and full lightvela-web keep the pre-backport glyphs and their
consumer-specific scales; core keeps the new artwork. Shared metrics and the
semantic Web icon adapter own sizes/strokes. The classic adapter retains the
existing glyphs; `workbenchIconMetrics.classic` names their scale without
dispatching on a product ID. Tokens are projected onto each
Presentation Root; the downstream product does not globally override explicit legacy Lucide strokes.
A color palette such as vela.core.web never grants product capabilities or selects
an icon family.

Standalone core rail density scopes its icon dimensions to the rail navigation
and footer, not the common sidebar column that also contains Settings. Its compact
desktop rail remains 16px while core Settings retain the 14px navigation role.
the downstream product keeps explicit legacy consumer dimensions (15px navigation, 16px
Settings); a core rail token must not shadow its Presentation Root policy.
The existing product presentation adapter projects the optional consumer-size
override; Shell consumes that override with its own density as fallback, without
selecting a commercial product by ID. A root returning to standard clears the override. Shadow composition supplies
the same explicit policy to its React presentation context and root-token adapter.
The full product-isolation browser checks the selected **Settings** action against
the fixed legacy Settings reference and retains Palette/SunMoon family assertions.
Home/New chat replaces the previous Start/Chats split, so the first current-page
glyph cannot serve as a Write oracle.
Draft preservation, machine/model changes, palette independence, embedded owner
lifetimes and mixed-root checks remain separate assertions in the same fixture.

An embedded canvas owns one explicit Presentation Root inside its Shadow DOM.
The appearance engine projects the complete semantic token set onto that root,
and every menu, dialog, context menu, drag overlay and panel tab portal targets
the same root. Embedded code must not compensate with global CSS, copied menu
styles or arbitrary z-index overrides; those bypass focus, collision geometry
and theme ownership.

`ExtensionSupervisor` is the one product-level owner for client extension
activation. A Contribution Broker lets one activation register commands,
views, Chat presenters and Composer providers across otherwise independent
runtimes; every disposer is attached to that activation's Cordis Fiber. Public
extensions never receive the Cordis root Context as part of the supported API.
User-trusted local/workspace extensions may run in-process behind that API;
isolated Web realms, Electron utility processes, remote Hosts and sandboxed UI
are optional Restricted-channel policies rather than a universal prerequisite.
A plain same-origin Web Worker is not advertised as a security boundary. Full
rationale and the migration plan are defined in
[`plugin-architecture.md`](./plugin-architecture.md).

Trusted product composition owns its account service, identity-provider adapters
and private service clients. Optional engine/UI consumers borrow that authority;
retiring a consumer does not sign out or dispose the account. Core owns the
Application lifetime and invokes the product lifecycle through
`ClientWorkbenchProduct`. Public builds do not instantiate a product account.

Account changes invalidate product credential/cache scopes and retire old
consumer work. Late reads or mutations cannot update a replacement scope.
Resource-loading failures are not evidence of logout, and independent consumers
do not create another token store. Private service endpoints, IM channels and
product business policies are documented with their downstream implementation,
not as core platform capabilities. Retired product features do not establish an
implemented core collaboration channel. Core Actor/Hub collaboration remains
subject to the implementation limits in the charter above.

`AgentCapabilityRuntime` is an optional AI-facing consumer of that platform. It exposes
searchable capabilities rather than packages, progressively loads model
context, issues Task/request-series-scoped leases, routes invocations to local/SSH/MCP
providers and records exact receipts. Extension activation never implicitly
adds every contributed Tool or Skill to a model request. The full design is in
[`agent-capability-fabric.md`](./agent-capability-fabric.md).

The first concrete external-integration slice is the application-owned
`ConnectorRuntime` plus its `ConnectorCapabilityRuntime` projection, documented in [platform connectors](./platform-connectors.md).
Trusted extensions register Providers through the existing internal contribution
transaction. It borrows Authentication session epochs and Host-owned clients;
the ConnectorRuntime owns logical readiness, explicit Thread selections and execution,
not credentials or native MCP transports. The capability projection derives a scoped,
revisioned search view, returns compact paginated summaries, loads exact schema only on
detail and then issues revocable invocation handles. Web/Electron wire stable
search/detail/compatibility/call meta tools; AppServer receives them through standard
`thread/start.dynamicTools` with `deferLoading`. Composer exposes a dedicated Connector panel, backed
by a domain Manager, Host-native MCP OAuth and a one-shot write approval queue.
Configuration/intended selections use a separate CAS store (Web IndexedDB,
Electron Main SQLite); credentials remain with the Host, and restart restores
intent without automatic connection or execution grants. Native OAuth completion
is uncorrelated by operation ID and never grants conversation access by itself.
This implemented vertical slice does not imply the complete Capability Fabric, new native methods in DSH/Hermes, or verified third-party accounts.

The Skills capability surface now hosts a platform Connector Library alongside
Skills/packages. `connector-core` owns the directory and DTOs; `connector-host`
owns Host-private SQLite configuration, credentials and bounded OAuth transactions,
plus the MCP SDK/API adapters. The renderer receives only public projection and
authorization progress, never stored tokens. This managed path is independent of
the existing borrowed native-MCP adapter, which retains its original authority.
The Composer remains a per-conversation selector, not the configuration catalog.
The connector catalog contains 23 recipes; 19 have execution adapters and four
remain guide-only. Isolated validation is not third-party account qualification.

The settled AppServer ownership model is application `HostRuntimeRegistry` →
one `HostRuntime(hostId)` → one logical `AppServerClient(hostId)`. A shared
Electron MessageChannel or multiplexed WebSocket may live in an optional
`TransportBroker`, but it only routes frames carrying `hostId`; it does not own
Thread, Resume or Replica semantics. The existing low-level
`AppServerClientRegistryService` remains a Lab/compatibility API during
migration and must not become a second product-level lifecycle owner.

Host discovery is dynamic, but ownership is not. `HostConnectionProfileStore`
persists stable Host identities and provider configuration; the Cordis-owned
`HostConnectionProviderRegistry` accepts trusted transport factories and optional
Composer command adapters (see below);
`HostRuntimeRegistry` lazily creates and exclusively owns complete Host
runtimes. A provider lease is held for the lifetime of every runtime it
created, so plugin reload cannot invalidate a live connection. Web currently
ships `opencraft.websocket`; Electron and Expo may register platform-specific
providers without changing Host, Thread, Session or Replica semantics.

Adding a Host is `validate provider config → persist profile → register lazy
runtime`. Removing one is `reject active work → detach registry identity →
dispose runtime → delete profile`. The Profile Store is seeded from deployment
configuration only when empty; after that, IndexedDB is the Web authority.

### Browser Host-profile upgrade recovery

The Web Host-profile database releases its connection on `versionchange`, so
another page can perform a schema upgrade. An older page that still retains a
connection causes a recoverable startup error on `blocked`; an open request
without a terminal event fails after ten seconds. The startup boundary asks the
user to close the site's other tabs/windows and reload, without displaying raw
storage diagnostics or deleting configuration. Rejected opens abort any delayed
upgrade and close late database handles; failed initial loading also releases its
connection. HTTP and HTTPS are separate browser storage origins, so one can
upgrade while the other is blocked by its own existing tabs.
Vite preload failures also include module-evaluation errors. The preload listener
must leave BrowserStorageError unhandled so the import rejection reaches the
application startup boundary; it must not swallow it or cover that boundary with
a release recovery screen. Before React starts, the HTML recovery surface uses
a storage-specific message without a release-version lookup or automatic reload.
Opening diagnostics record only the store role, opening/upgrading phase, elapsed
time, schema versions and DOMException name. Error reports retain those fields;
they never include saved profiles, database contents, endpoints or credentials.
Timeout is not evidence of an upgrade lock: a request that emitted no events and
a request stalled during migration remain distinguishable. No database deletion
or silent memory-backed configuration saving is used.

A hosted Web installation with an explicitly available server-managed connection
catalog and enabled deployment recipes can continue after a typed storage-open
failure. It exposes only deployment/activation-owned recipes alongside the live
server catalog, reports nonfatal storage diagnostics, and displays a dismissible
notice with reload recovery. Browser-owned recipe edits/deletions are rejected;
unread saved profiles are neither replaced nor migrated into memory. Reload after
the browser recovers reads the original database, including customized recipes.
Standalone clients, hostless deployments, and malformed stored configuration
retain the startup failure boundary. This recovery does not bypass server login,
Host authorization or desktop input grants.



### Host-side provider account pooling

In server Web deployments, the headless Codex extension owns the single account
settings entry in the Server group beside model services. The composition root
disables the built-in local account page in that deployment; standalone Web and
Electron retain their existing local account entry and Host ownership.
Account identity text masks email mailbox and private domain labels by default,
including email-based account names, details, accessible action labels and remove
confirmations. Expanding details does not reveal the full address. This is a
presentation policy, not an authorization boundary or a mutation of stored account
identity; existing account RPC metadata and credentials remain owned by the Host.

An Account Pool is a Host-private provider credential-routing policy. It is not
a Host, execution Engine, Thread, model, authentication session or renderer
preference. `account-pool-host` owns account metadata, separate 0600 credential
files, quota observations, the provider cursor and affinity keyed by
`(provider, hostId, providerThreadId)`. Renderer-facing projections expose only
metadata and credential presence. Storage roots are injected by the platform
directory resolver; the package never derives product state from `homedir()` or
the process cwd.

Codex device authorization is completed by the Host-owned maintenance client,
independently of Renderer polling. On a matching native completion notification,
the Host imports credentials once, starts subscription maintenance and closes the
isolated login worker. Pending logins expire after ten minutes even if no page
returns; explicit cancellation prevents subsequent import. A completion already
received wins over cancellation and shutdown drains its import before closing
storage. Terminal results remain idempotently queryable for thirty minutes in a
bounded in-memory receipt cache; a server restart retains imported accounts, not
pending authorization sessions. Before cleaning old isolated profiles, startup
recovers reusable credentials already written by native authorization through
the same account owner; newest profiles fill missing credentials while existing
configured credentials and enablement remain authoritative. Storage errors retain
those profiles for retry. It never
restarts an unfinished authorization. No credentials or device codes enter browser
storage. Account Settings reads the server account list on mount, pageshow,
focus and return to visible state, and resumes a retained login poll when present.
A page reload can therefore discover a completed login without its former
session ID. A pending login lost on reload can finish on the Host, but its code
is not restored; starting again is an explicit user action.

Codex subscription maintenance also retains the backend-issued reset-credit count
and its own last-successful observation time. Only a nonnegative safe integer in
`rate_limit_reset_credits.available_count` is a known count; missing or invalid
metadata is unknown, including on older Hosts. A failed refresh preserves the
previous observation. The existing account Settings row renders the count without
collecting per-credit details or redeeming a credit. This metadata never affects
account selection, affinity, or inferred recovery from a blocked quota.

Codex AppServer connects to one synthetic Responses provider on a loopback-only
HTTP proxy. Each AppServer child receives only the proxy URL and a Host-scoped
token through its environment; real account OAuth credentials do not enter
process arguments, AppServer configuration, Renderer state or logs. The proxy
authenticates the Host, strips inbound credentials, selects the account, and
injects the upstream bearer token plus ChatGPT account identity at the final
HTTP boundary. Forks may inherit their parent's affinity within the same Host;
identical provider Thread IDs on different Hosts never share a binding.
Native startup establishes ephemeral `chatgptAuthTokens` auth using a locally
issued broker JWT with no upstream identity, plan or OAuth credentials. This
retains the native image-generation surface, which API-key mode hides. The
account pool remains the only upstream credential owner. Both the native provider
and ChatGPT metadata base URL point at loopback; the broker JWT is never sent to
an external backend. No shared auth file is copied into native runtime state.
Initialization waits for native auth before releasing logical clients.

The loopback bridge preserves request bytes, including native compressed Responses
bodies, without a UTF-8 round trip. The proxy also allows POST `/v1/images/generations` and `/v1/images/edits`.
Native image turn IDs resolve through a bounded, Host-scoped map populated by
Responses turn metadata to the same thread affinity. Unknown or cross-Host turns
are rejected. Native image requests run once and retain their backend status and
image failure metadata; their separate image quota cannot exhaust text quota or
trigger cross-account replay. The native engine owns image saving and events;
Renderer consumes its existing image-generation presentation. The native
`image_generation` feature remains the enablement authority rather than a second
application-only switch.

The synthetic provider's `/v1/responses` and `/v1/models` paths are translated
to ChatGPT Codex's `/responses` and `/models` paths, preserving query parameters
and Codex-owned request metadata. The Codex child generates its own persistent
installation ID in its runtime `CODEX_HOME`; migrating account credentials does
not copy another device's installation identity.

New independent Threads use equal round-robin admission across eligible accounts,
wrapping in configured priority order. Priority defines order, not a preferred
account to exhaust first. Selection commits the Thread binding and provider
cursor atomically before any upstream I/O; parallel first requests for the same
Thread therefore share a binding, while different Threads spread immediately.
Bindings are reservations, not proof of a successful upstream execution.
Success only records last usage and cannot replace a newer binding or rewind
the cursor. Metadata/model discovery reads do not create bindings or consume
round-robin slots. This balances new Thread admission, not token consumption
or active-stream concurrency; existing bound traffic does not advance the cursor.

An eligible bound Thread stays pinned. A short temporary hold returns bounded
`Retry-After` for that Thread while new Threads may use another account. The
proxy advances within one request only after an explicit pre-success quota or
authorization rejection; successful responses, transport failures and
indeterminate streaming outcomes are never replayed. The provider cursor moves
to the next eligible account after the current account and wraps in configured
priority order; recovery of an earlier account does not pull new Threads back.
The loopback HTTP bridge owns each response stream until completion. When its
client disconnects, it aborts the upstream request and consumes the resulting
stream error without terminating the Host process or replaying the request.
The proxy uses a dedicated HTTP/1.1 pool with sixteen non-pipelined connections
and the loopback bridge admits at most sixteen concurrent upstream requests.
Waiting for response headers is bounded to 60 seconds and an idle response body
to 180 seconds. Slow headers, queue delay and transport failure emit
content-free diagnostics keyed only by provider Thread/account identity. A
timeout or other transport failure is surfaced to the owning Turn and is never
replayed on another account, because the upstream execution outcome is unknown.
The bridge accepts request bodies up to 128 MiB. It drains an oversized body
without forwarding it and returns HTTP 413, so a large Codex history produces
an explicit size error instead of a disconnected stream.
Account order, enablement, quota, admission cursor and reserved affinity survive Host restart.
Affinity expires after 30 idle minutes and storage retains only the 4,096 most
recent bindings, within the bounded scheduling contract.

Codex subscription state is distinct from credential presence. The Host reads
the ChatGPT Usage endpoint with the selected account credential on add/enable,
manual refresh and a five-minute background interval. It persists plan type,
primary/secondary limit windows, reset times, observation time, last-use
metadata and the derived `ready | held | exhausted | error | disabled` state.
Header observations from real inference merge into the same windows. Renderer
projections contain only this metadata; access and refresh tokens remain in the
Host-private 0600 secret files. Usage refresh failure does not invalidate an
otherwise usable inference credential.
The Codex account Settings projection renders each reported window reset time
as visible local time in the quota row and full date/time in account details;
touch access must not depend on hover. An absent reset time remains explicitly
unknown rather than being inferred from the window duration or account status.

Electron now contributes a `local-codex` Host backed by the Daemon-owned
`CodexEngineAdapter`. One physical stdio AppServer serves the Host generation;
the adapter virtualizes request IDs, shares physical initialize, and restores
logical-client targeting for responses, Thread notifications and server
requests. The Daemon owns the physical Host generation independently of Renderer
claims. A lost or closed Renderer revokes only its logical client lease; the
adapter and an admitted Turn continue until the owning service closes or the
transport fails. Reconnection creates a fresh logical client lease on the same
physical generation and resumes the Thread. A failed physical generation is
closed and recreated before it accepts a new claim.
Queue-to-active-Turn steering is a separate Host capability. Stock Codex
AppServer has no single queued-steer operation, and its idle queue drain cannot
be fenced by two independent RPCs from the adapter. The Daemon therefore owns
Codex queued messages in its Host-state database (`opencraft-host-state.sqlite`
for new stores; existing `codex-host-queue.sqlite` remains in place); its physical AppServer is
only the execution target for standard `turn/start` and `turn/steer`. The Host
serializes queue dispatch per Thread, persists a claim before sending, and
advertises `atomicSteer` and `unconfirmedSteerDiscard` from this Host-owned
implementation, independently of a patched Codex binary. An interrupted or
timed-out dispatch stays delivery-unconfirmed and blocks later auto-dispatch;
it is never blindly retried. The Host checks paged Codex user-message history
by client ID before settling a claim. Explicit discard requires an idle Thread,
the original target Turn and a successful history check; discard acknowledges
uncertainty, not proof that the model never saw the input.
Before starting the physical AppServer, the Host migrates any legacy native
queued rows into its own store and removes the old rows. Migration is
idempotent and fails closed on malformed or conflicting rows. The single
Host/AppServer owner for the data directory remains required. DSH retains its
own Host-side queue plus native `session.updateQueue(steer)` execution path;
it does not inherit Codex's recovery capability.
For pending Codex server requests, the adapter retains the exact request frame
and Thread ID within that physical generation. Disconnect revokes the previous
Client's response authority, not the AppServer request; successful `thread/resume`
lets a new logical Client claim and receive unowned requests. Merely being an
initialized or subscribed Client is not authority to answer. A late resume from
a disconnected Client cannot reclaim ownership. The routing ledger is bounded
and in-process, while the AppServer remains the pending/resolved authority; this
does not add multi-tenant authentication to the single-user direct topology.
Codex also declares `opencraft/thread-start-durability` because `thread/start`
can return an in-memory ID before a recoverable rollout exists. The Workbench
therefore dispatches the first `turn/start` before retiring and navigating away
from the Draft. DSH and Hermes do not inherit this policy: absence of the
capability preserves their durable-Thread-first promotion path.

The builtin Codex Accounts Settings page consumes Host extension methods for
redacted list, enable, reorder, remove, subscription refresh and Device Login
operations. It presents the plan, live limit windows, reset times and derived
account state without growing a second account or quota authority in React.
Device Login runs an isolated Codex maintenance AppServer using the official
`chatgptDeviceCode` flow; only a completed login with a valid private auth file
commits an account. An explicit import action reads the external Codex authority
(`CODEX_HOME`, otherwise `~/.codex`) supplied by Electron Main, copies its
validated OAuth credential into the private pool and never rewrites the source
`auth.json`. Refresh likewise round-trips one account through an isolated
managed-auth profile and verifies that account identity does not change. Login
and refresh profiles are 0700/0600 temporary state and stale profiles are pruned
on the next service construction. Renderer snapshots never include tokens.
The external Codex executable is resolved once by Electron from an explicit
override, PATH or the official user installation location; it is not bundled.

Servers can explicitly opt into an independent `codex-core` owner through the
daemon's `--codex-core-endpoint`. It owns the native Unix WebSocket AppServer,
account proxy, login, refresh and usage maintenance. The daemon remains the
logical-client/product-protocol adapter and closes only its own native connection;
the final page leaving or the execution service restarting does not stop Codex
work. The account service is shared with the default desktop embedded path, not
duplicated in remote daemons. Both owners acquire the same data-directory writer
lock. See [Codex core operations](codex-core.md) for authentication, independent
systemd units, migration and the interrupting CLI/proxy maintenance boundary.
Web/gateway readiness is independent of this Host's protocol compatibility:
Headless serves HTTP and other Hosts while its Codex connection initializes in
an abortable, bounded retry worker. Deployment observes the preserved Core
process identity separately from connection compatibility; incompatible Core
connections fail locally and never turn into a second writer or a Web release
barrier. Host readiness is a separate health projection, not HTTP readiness.

`codexCoreEndpoint` is explicitly optional in both desktop and SSH daemon
composition. Without it, the downstream product retains embedded/SSH execution, including the
Host-owned queue, verified senders and enterprise identity participant metadata. The core bridge
does not own or reproduce those downstream Host overlays and rejects verified sender
attribution. Existing internal Headless deployments are not switched to core mode.

The transport packages are peers. Replay is not a wrapper around WebSocket and
Memory is not a fake method surface: all three carry the same JSON-RPC text
frames through the same `DuplexTransport` contract. `RecordingTransport` is the
only decorator; it can wrap any physical transport and produces Replay input.

## Deliberate reuse boundary

### Bot management ownership

Applications exposes a persistent Bots management View. It consumes the
AppServer Bot directory and explicit Host connection command; selecting a
management target does not change the active chat Host. Create/clone/rename/delete
are gated by Host `botManagement` and per-Bot `management` operations. Dialogs
own only user intent and draft text; Radix owns focus, Escape and delete confirmation.
The same creation entry is used from the Bot sidebar and management page.

Trusted `ClientProductSession.botManagement` declares optional provider eligibility
and empty-state copy. Core defaults to all enabled profiles; an explicit empty
allowlist selects none. Assembly snapshots and freezes the policy. The management
view prefers a unique eligible Host with directory-reported Bot management;
otherwise only a sole eligible profile may connect. Ambiguous candidates never
select an arbitrary Host. Product eligibility grants no capability or authority:
Host and per-Bot operations remain the mutation gates. Existing persisted View IDs
remain compatible. Selection-scoped reads discard late group results and feedback;
a pending request cannot block refresh for a new target. Operation drafts retain
their captured Host rather than following selection changes.


Hermes transports own one control-plane mutation port per account/instance,
surviving replaceable bridge generations. The port maps blank creation and
template-based cloning to the existing instance Bot API; it never constructs a
native profile from the display name. Root profile deletion is prohibited.
Creation receipts retain success or failure for a command ID; uncertain writes
are not retried automatically. Semantic revisions increase within the Host port;
fresh-read revision checks and serialized writes are not a desktop service cross-client CAS.
Deleted Bot events invalidate open conversation snapshots and block later sends.
Only current Host generations may publish mutation receipts into the directory.

`@lightvela/agent-core` comes from the product-neutral
`shared/lightvela-agent-core` package. Downstream Web validates each product behavior
first; OpenCraft injects AppServer/Host adapters only after that contract is
stable. The core never imports either renderer, storage, auth transport, i18n or
analytics. During migration the generated downstream HTTP repository may resolve the
package for shared Bot identity/lifecycle, but remains a compatibility consumer,
not a second source of product policy.

- Protocol, content models, session state, restore/replica logic, commands,
  deterministic tests, routing identifiers, and design tokens: 100% shared.
- React subscriptions and feature view-model hooks: share when they remain
  renderer-neutral.
- Account authentication and cloud Bot availability do not own the Web/Electron
  conversation surface. Zero cloud Bots, account refresh/errors, and sign-in do
  not replace a usable local or other-Host Workbench with a creation guide.
  Account-level `applicationIntervention` is a deprecated compatibility field
  ignored by the Shell. Only the selected Host's actual connection failure can
  request a matching provider intervention. the downstream product no longer contributes an
  automatic `empty-workbench` creation guide; zero-Host startup has a neutral
  no-Agent state with a Settings action. Environment discovery and cloud
  creation services do not create an application-level Environment surface.
  The onboarding `bot-required` projection is retained for explicitly selected
  the downstream product configuration, not as a global desktop prerequisite. Native Expo
  account onboarding is a separate adapter and is not changed by this desktop fix.
- Product onboarding shares a renderer-neutral account-state projection. An
  authenticated the downstream product account with zero executable Bots can still enter
  Collaboration; `bot-required` belongs only to the Hermes/Codex Host path, not
  to the application account gate. Web and Expo still resolve the same
  region-aware `/dashboard/create` target when a user explicitly enters that
  Agent path, then refresh the account catalog after regaining focus.
- Conversation and composer behavior: shared models/controllers; separate DOM
  and native views.
- Workbench resource identity and durable routes: shared. AppShell geometry,
  right/bottom panel placement, iPad split view, gestures, text editing and
  accessibility: platform implementations with matching semantic APIs.
- Extension manifest, activation identity, install permissions, commands and
  declarative contributions: shared. Arbitrary React DOM/React Native component
  bodies are not a public cross-platform plugin ABI.
- Embedded feature controls share semantic state contracts rather than raw
  renderer markup. Web `Select`/`Option` primitives emit stable state and role
  attributes, while the Host theme adapter owns their colors, focus, selected
  and disabled presentation. Body-portaled controls must choose a named Host
  presentation plane such as `floating-control`; feature code must not invent a
  numeric `z-index` relative to an application modal.
- Modal windows follow the same ownership rule. Feature code supplies content
  plus a renderer-neutral descriptor; the platform owns the controller, the
  single modal Host, the window surface and all modality behavior. Web adapts
  that contract through Radix Dialog for Portal, focus, Escape and outside
  interaction. Expo adapts it through React Native `Modal` today and may map a
  fullscreen presentation to a navigation Stack later. Features must not own a
  scrim, focus loop, Escape listener, Portal or numeric modal `z-index`.
- Announcement windows are a content specialization of that modal contract,
  not another window manager. Trusted JavaScript calls
  `api.window.showAnnouncement()` with a serializable descriptor and awaits a
  data result; `AnnouncementCenter` owns request/extension lifetime, while the
  renderer supplies the themed content recipe through the existing modal Host.
  Campaign eligibility, impression persistence and automatic scheduling stay
  in a separate orchestration layer.
  Renderer-owned static assets must be resolved to an absolute HTTP(S) or blob
  URL before entering that descriptor. Relative Vite asset strings are a Web
  adapter concern and must not weaken the renderer-neutral validation contract.
- Timeline windowing, restore anchors and latest-Turn follow policy: shared
  algorithms. DOM `ResizeObserver`/scrollTop and RN `onLayout`/contentOffset are
  thin platform adapters; neither platform may introduce another virtualizer
  as window authority.

Trying to share the Web DOM frame through React Native Web would weaken the
desktop result. Trying to embed the DOM composer in native would create a
WebView boundary and break native input behavior. The reusable unit is the
typed feature contract, not the rendered element tree.

## Fixed navigation entrances

### Terminal character metrics boundary

TerminalPanel separates visual inset from its measured xterm host, and that host
also isolates inherited application letter spacing, word spacing and text
transforms. xterm owns font/grid metrics and its internal row compensation; CSS
must not override those internal rows. The terminal explicitly requests zero
additional grid letter spacing. Canvas cell measurement and the DOM width cache
must not see different application typography. WSP-21 acceptance measures full
row text advances and the last-column cursor as well as screen/host boxes.
`smoke:terminal-geometry` mounts the real panel and xterm with only the PTY port
replaced, exercises DPR 1/2, hostile body tracking, widths, wide cells, font change
and visibility, and includes the old inheritance as a failing control. Its
rounding budget accounts for pinned xterm's 32-glyph integer-width measurement;
it does not add layout padding or silently remove columns.

Terminal paste belongs to the panel's input presentation. Desktop keyboard paste
continues through xterm's helper textarea; the explicit paste action uses the
browser clipboard only while the current terminal is running. If clipboard
reading is unavailable or denied, a native text field lets touch users invoke
the system paste menu and confirm before sending. Both paths call xterm's
`paste()` so line-ending and bracketed-paste handling remain with xterm, then
flow through the existing `onData`/PTY writer. A late clipboard result must
not be delivered after the panel changes terminal or the session stops. The
entry field is View-scoped, cleared on cancellation or terminal change, and
never persists clipboard contents.

### Conversation terminal semantics

The Host remains the sole owner of PTYs and retained process output. The
renderer application projects those resources through one
`ConversationTerminalSessionRegistry` keyed by Conversation Scope. Its ordered
session directory, most recently activated terminal, Host identity, cwd, shell,
phase and bounded readable buffer are application semantics; xterm and panel
tabs are presentations, not a second process or session authority.

The Terminal panel adapter writes active-terminal changes when a terminal tab
is selected. Selecting Browser or another panel type does not erase the most
recent terminal selection. Closing the selected terminal falls back within the
same Conversation Scope, while releasing the Scope removes every association
and observer. Panel owner IDs and Conversation resource owner IDs remain
distinct.

`read_thread_terminal` is a read-only, no-argument dynamic tool. The calling
AppServer Host ID and Thread ID must resolve through `ConversationBindingStore`
to one Conversation Scope before the current terminal can be read. The tool
does not accept a session ID, enumerate other terminals, inspect xterm DOM or
cross Host/Thread boundaries. Its output is decoded from the AppServer terminal
projection and capped to the latest application buffer; the Host replay window
continues to own longer retention and reconnect truncation.

### Application Router authority

`createApplicationNavigation` in `runtime/workbench-navigation.ts` owns a React
Router data router with no loaders/actions. Electron uses `createMemoryRouter`;
Web uses `createBrowserRouter`. The existing Shell consumes its external-store
snapshot. Connected and hostless supervisors use the same implementation; Views
do not call the browser History API or keep a second writable application route.
Legacy v7 browser metadata is read only as migration input.

Application path, Router entry key, conversation identity and route/View scope are
distinct. `openChat` navigates to the entry's remembered conversation (or hostless
Home); it is not a POP. `navigateToHome` presents a new local Draft. Settings and
extension destinations normally PUSH, explicit invalid-route corrections REPLACE,
and only history controls POP. Router keys supply a known-entry projection for
back/forward. Web saves that key projection per browser session and verifies the
current Router key when restoring it; it is not another path authority. Desktop
memory history lasts for the window, not across process restarts.

History contains resource references, not evidence that a Draft still exists.
At Web bootstrap, the URL/current Router entry is resolved before choosing a
global last-used conversation, and the Router and initial activation consume the
same effective target. Host profiles validate Host availability, ScopeRegistry
validates retained Drafts, and BindingStore resolves durable promotion aliases
to canonical Threads. An expired unsubmitted Draft is not recreated under its
old ID. Global last-used preferences (including changes from another tab) cannot
override a valid current-entry target. Explicit embedded memory navigation starts
at Home and never reads or writes the containing page's conversation history.

The same resource projection validates later restored entries. Invalid references
fall back to the actual retained View, keeping its Composer; promoted aliases may
retain their original View. A View already bound to another Scope must not be
reused. Only the Router REPLACEs corrected entry metadata, preserving the current
Settings/Extension destination. The transaction consumes these corrections as
restoration events even when a POP is normalized into REPLACE.

`WorkbenchNavigationTransaction` fences preparation by intent epoch, commits only
accepted destinations, and restores the complete prior entry after a failed POP.
Changing routes cancels pending readiness without stopping a live turn. A late
Thread lease is released; late success/error cannot take navigation ownership.
POP to a different View of the same conversation must still restore that View.
Returning to the already retained View, by Chat or POP, presents it locally and
resumes readiness in the background; a newer intent or disposal fences and
releases late preparations. Selecting the current sidebar conversation from
Settings uses this same return operation, not a new View or a network-gated
selection. Submission ownership guards remain in force.
Sidebar and other selection adapters express only `selectConversation`; they do
not decide whether a Thread is already selected, whether pending hydration should
be deduplicated, or whether Settings requires Chat return. The transaction owns
that decision: reuse the remembered entry's View (or the actual retained View),
coalesce an in-flight destination only when its View also matches, and no-op only for the presented View with no
competing destination. `navigate` remains a distinct explicit-open operation, so
different history Views of one Thread keep independent Composer documents.
For a completed sidebar A→B→A cycle, the transaction remembers the last
successfully presented View per canonical conversation in a bounded preferred
map. It validates that input slot against its account-bound draft owner, not
just the 20-View presentation cache. Failed or superseded preparations never
publish a preferred View; POP updates it only after acceptance. Draft eviction
forgets the slot, and account revocation clears the map and fences pending work.
`ConversationDraftOwnerRegistry` owns at most 50 nonempty input slots and their
original Controllers independently of View/Scope resource caching. It does not
retain Thread or Host leases. Physical editing/submission protects input;
unprotected slots are evicted in last-used order, releasing attachment resources
and deleting document continuity. Empty editors are not content slots. Scope
promotion updates all retained slots, including ones with no cached View.
Unsubmitted New-chat Scope metadata also queries that input ownership: its
20-empty-record budget cannot evict a Scope with retained input. Empty history
records remain bounded separately and confer no retained-content authority.
All preparations use one intent/lifetime/Router-revision eligibility check and
one accept-or-release path, including local Draft readiness and promotion. A
promotion must originate from the still-active Draft and capture its View before
awaiting; an inactive Draft cannot supersede a newer navigation. Last-used
preferences are written only for still-current accepted command results, never
used as a second selected-conversation or route authority.
Thread/Draft stores, composer state, Host connections and background execution
remain resource owners independent of route history. Shell divider hit targets
start below the toolbar, so pane geometry cannot intercept history controls.

Reference boundaries and acceptance evidence are in the
[application navigation plan](../design/application-navigation/task_plan.md).

Chat and Settings are the built-in application routes. Local Model Services is
a normal Settings page using the shared Settings category and master-detail
container; there is no Environment application route, parent context pane,
breadcrumb, overview or connection-management page. Historical `/environments`
URLs normalize to Settings, preserving a concrete contributed settings slug when
one exists and otherwise opening Appearance.

The Built-in Agents extension registers Model Services only for Electron and its
configuration client remains permanently bound to the immutable `local` Host ID.
Moving the View does not make it follow the active conversation Host. Provider
connection identity, provider-scoped model declarations, write-only credential
intents and per-session selection remain separate; see
[Local Agent custom providers](local-agent-custom-providers.md). Model edit drafts
survive View reattachment and must be applied before saving a connection. A
capability-gated draft endpoint probe uses only explicitly entered credentials,
does not mutate the runtime and is not a substitute for full runtime validation.
The page is absent when that extension/platform contribution is unavailable; the
Shell never falls back to an active remote Host. Global Settings always retains
Appearance; internal developer mode adds Plugins and Laboratory, and Electron
also adds the read-only SQLite inspector described above. EnvironmentDirectory, account discovery and
persisted Host profiles remain runtime services used by Chat and providers, but
they have no built-in application navigation or creation UI.
Desktop account restoration runs asynchronously after extension activation and
never depends on OS Keychain. A Main-process `PrivateStorage` port persists only
region and session token in `userData/private-storage/lightvela-account.json`.
This is explicitly plaintext protected by directory 0700/file 0600 permissions,
not encryption or protection against same-account processes. Writes use private
temporary files and atomic replacement; keys and file types are validated. The
renderer still has no filesystem port or durable token storage. Legacy
`lightvela-account.encrypted` is not decrypted or migrated: one fresh login is
required. Logout clears new session data and obsolete local ciphertext without
accessing the system keychain. Generation/abort guards prevent cancelled saves
and late restoration from undoing sign-out.

### Authentication ownership

Trusted product assembly can contribute an external identity provider and an
account entrance without changing core Actor, membership or resource authority.
A branding-only client product can omit `ClientProductSession.persistenceScope`;
the application then owns `LocalClientPersistenceScope`, using the active account
contribution to partition caches and revoke old writes on identity changes.
Products with credential-incarnation semantics can still supply their own port.
Account contributions have explicit presentation precedence (`entrancePriority`,
default 0); equal priorities remain exclusive, and unloading a contribution
restores the next eligible entrance. A provider omits `signOut` when its gateway
has no logout operation. It owns credential verification and expiry; browser
projections are memory-only and generation-fenced. Recognition does not authorize
shared resources. Verified message provenance is owned by the Hub, not the Turn
or Renderer. Codex, SSH and the built-in DSH path share `ThreadIdentity`, the
immutable sender store, message projection and bounded native-history reader. The Web gateway derives a trusted connection context from signed
WebSocket handshake headers; AppHost passes it through an in-process submission
port. Each user message is keyed by stable Host + Thread + client message ID.
Only the English login name is persisted. Codex/SSH retain the existing Host queue
SQLite and transaction owner; queue admission and provenance share a transaction.
For DSH, the Headless `/appserver` identity overlay owns a separate managed
`thread-identities/opencraft-server/thread-identity.sqlite` v1 under the Hub data
root. It records attribution and derived provider metadata, never message bodies or
execution state, and does not open the independent Host stores. Native messages
remain the evidence for participation; queued or rejected submissions do not count.
The overlay resolves the current native address for its read-only history client;
retiring browser clients or the Hub does not stop the independent DSH Host. Queue dispatch never reattributes
the original submitter. History/live/shared Chat projection carry hidden sender
metadata; the native model input remains free of employee provenance.
Forked history preserves immutable author attribution separately from membership:
the Host records inherited message origins atomically with cloned sender bindings,
and exposes an optional inherited-message query to its metadata provider. A product
participant projection can exclude inherited messages. Origin records survive restart and nested
forks in the same Host-state database (additive migration v4).
See [external identity and provenance](enterprise-authentication.md).

The hostless and configured-Host Application supervisors share one explicit
service-disposal plan, including the client extension persistence backend and
account draft-scope subscription. Mode-specific navigation/conversation/Host
consumers retire before that shared plan; Host registry leases return before
extension provider cleanup, and owned AppHost transports close after services
using them. The outer Web Application and Supervisor both share one disposal
completion/failure among concurrent or later callers. Every cleanup step runs
even when an earlier disposer fails. Closing the IndexedDB connection and its
BroadcastChannel preserves document data for the next Application.

Startup rollback remains a reverse list of resources actually acquired; it is
not the complete-graph shutdown plan. Automatic reverse-construction cleanup
cannot replace the explicit normal consumer/provider order. Actual browser
coverage in `smoke:application:lifetime` checks both modes, held/failing extension
cleanup, retained data with stale old handles, and storage failure during startup.
It covers default public startup and an explicitly supplied local product, checking
that product teardown waits for its extensions and cache subscribers. The public
`smoke:extensions:builtin` and `smoke:plugin-settings` probes use that same synthetic
composition through `ClientWorkbenchProduct`, without a private account service or
product package. They exercise real extension management, navigation, persisted
enablement, protected bundled sources and Settings in Chromium.
Its configured Host wire deliberately rejects requests; this is not a connected
external Host or native-client acceptance result.

`smoke:hub-network` separately packages a local gateway with the trusted Relay
identity composition port. Its test-only credential adapter is not selected by
the public Relay entry. A second Relay runs the ordinary public artifact without
an identity provider. Real Chromium exercises login handoff across two TLS Hub
hops, anonymous rejection, target membership and revocation; private identity
services are not prerequisites. Run `build:relay` before this transport probe.

The application supervisor installs two renderer-neutral Cordis services before
activating extensions, and disposes them with the application (including startup
rollback). They are not per-Host, per-Conversation or per-React-View state:

- `authentication` registers provider-owned session/operation ports by activation
  owner through `authenticationProvider`. It validates explicit completion against
  the current session epoch and serializes cancellation before a replacement login.
  Providers retain credential storage, OAuth exchange, restore, logout and expiry.
  Neither this service nor the public View capability receives tokens.
- `authenticationFlows` owns the active interactive flow ID, feature lease, reason,
  presentation, pending/error state and result. Identity/profile changes are not
  login completion; a same-account reauthentication still has its own completion.
  Restore never opens a flow. Close/cancel retires its transaction; route departure
  or inline View disposal abandons only continuation. A valid late callback may
  update session truth but cannot close newer UI, navigate, or invoke feature writes.

The anonymous footer projects provider-owned `signInOptions` as one Radix menu,
using the shared menu theme and keyboard/focus primitives. Selecting an option
closes the menu and directly submits a `presentation: menu` flow; no intermediate
login dialog is mounted. Only the provider interprets/validates its opaque
`optionId` and selects a region, after any prior native cancellation has retired.
The footer reflects pending/error state; reopening its menu exposes retry/cancel.
Closing just the menu never cancels an already selected browser login. The same
content works in fixed/floating Sidecars, with its portal inside its owning footer.

For explicit reauthentication/other contributed surfaces the shared Shell projection
can render `signInViewId` separately from `viewId` (Account).
Matching login success dismisses only its own prompt; Account remains an explicitly
opened utility view. Views receive only `AuthenticationFlowPort`, not Cordis Context.
Inline environment login is owned by its form lease: authentication allows the
form to recheck prerequisites, and creation still requires explicit confirmation.
No flow persists callbacks, arbitrary URLs or privileged continuation commands.

the downstream product exposes `snapshot.session` (status + auth epoch) separately from its
legacy `phase` (Bot-catalog loading/error compatibility for existing Host consumers)
and `details.phase` (profile/entitlements). Shell identity, login, and environment
discovery consume session truth. A resource 5xx never logs out or invalidates a
successful login. Authoritative 401 is handled centrally with an epoch/abort fence;
old requests cannot clear a newer session. Account changes clear old details before
new data loads, and profile mutations are fenced after their asynchronous boundary.

Hermes diagnostic/reset commands belong to `LightVelaHermesCommandService`, not
`LightVelaAccountService`. The Hermes extension creates that command service and
borrows the Application's account plus its exact-bound AppServer registry. Each
activation owns a fresh command lifetime: unloading Hermes revokes its commands
without closing a borrowed account. A standalone definition creates its owned
account/cache and associated views inside activation, so re-enabling never reuses
closed resources. The account issues revocable request scopes without exposing tokens; JSON/native
account transport and browser command HTTP retain their existing platform paths.
An explicit sign-out rejects new command scopes, a current HTTP 401 retires the
shared session, and an old 401 cannot clear a replacement epoch. Stream and native
output callbacks stop when the borrowed scope is revoked, including transports
that ignore cancellation. This does not prove the remote command has terminated.
Native acceptance still forbids HTTP replay on failure. Existing HTTP business
failure details and SSE terminal/output semantics remain Hermes-owned. Unused
account WhatsApp wrappers and the duplicate runtime command port are removed;
actual WhatsApp features continue to use their Host protocol service.

Account content composes shared utility-window controls: SettingsPanel owns its
header/body/footer tracks; plain SettingsGroup/Row own compact alignment;
editable text uses Radix Popover, while the host Radix Dialog owns modality and
restores focus. Avatar editing, clipboard feedback and the semantic usage meter
are reusable renderer controls. The account feature retains profile mutations,
credit interpretation and regional billing URLs. Subscription management and
entitlement recovery open `/account/billing` on the signed-in region’s public
site (`lightvela.com` for China, `lightvela.ai` internationally); the legacy
`/account?tab=billing` URL is not used. Utility modal appearance is
theme-owned and content-sized, with no account-specific fixed canvas. Warning,
error, usage-track, utility-shadow and scrim colors are emitted by the theme
engine, not hard-coded in account CSS. Returning from external billing refreshes
account details; model configuration uses the host's settings navigation.

Downstream desktop login is selected through paired trusted local Main/Preload
entries; the public desktop does not create a private account. Core owns profile,
window, protocol and IPC admission. The product owns random state, PKCE, timeout,
cancellation, single-use exchange and its per-profile application-owned private
file session storage (not OS encryption). See [desktop product composition](desktop-product-composition.md).
Only the trusted
top-level renderer may invoke the narrow preload account port. A callback received
by another profile is forwarded to its live owner through a state-addressed local
socket; the socket carries only the one-time callback and is retired on completion.
Renderer credentials stay in memory; ordinary preferences remain origin-local.
Web retains its browser-navigation PKCE path. Remote login pages never replace the
desktop workbench or receive desktop IPC capabilities. Closing/reloading the
initiating renderer cancels its pending transaction; late callbacks cannot log in.
Authenticated account/control-plane reads and updates use a Main-owned HTTP port,
restricted to the saved session's regional authority and known account, instance
listing, enterprise service-session and configuration endpoints. Main attaches the credential;
renderer-supplied destinations cannot turn it into a general proxy. This avoids
depending on production Web CORS rules for random desktop loopback origins.

The Shell's Sidecar owns the application/account split entrance as its footer,
not as a window-wide bottom bar. Pinning changes content placement, never the
entrance's parent or local anchor while its owner remains visible. Closing all
Sidecar columns hides the footer too; a transient sidebar supplies its own footer.
The footer owns a non-shrinking layout row below the flexing pane viewport; it is
not a zero-height absolute overlay. Scrollable navigation is constrained above
that row even with docked DevTools or long lists. Floating sidebars use the same
content/footer ownership split. The entrance is locally anchored within this row.
Sidecar paints one continuous material plane behind both panes and the footer.
There is no edge gradient. Header projects the main surface's upper lip from
the same live primary/context frames and context visibility progress, moving
left across the compact rail without waiting for the context owner to unmount.
Its horizontal hairline and Sidecar's vertical divider share the same paint
progress. No independent CSS animation or terminal boolean controls painting.
Content lifetime still belongs to the physical pane exit owner.
Expanded/context materials remain unchanged. The adjacent main surface keeps
its theme-owned stroke/elevation, including soft and flat variants; titlebar
paint must not override it. Floating overlays keep their own elevation.
This is paint-only: pane geometry, resize targets, content identity and focus
ownership do not change. See `docs/workbench-design-language.md`.
Those children do not paint additional backgrounds or stack backdrop filters:
this avoids both a white entrance strip and exposed gray window material under
the neighboring context pane. Floating footer rows inherit their owner's surface.
The compact left square opens application navigation;
the right entrance fills the remaining first-rail width and opens account content.
The group uses coordinates anchored to the Sidecar's left/bottom origin. Compact,
hidden and pane-divider transitions never change either entrance's parent, left
column origin, vertical position or square application frame; only the account
entrance's trailing space may flex. Each content surface has an independent
pin preference, while at most one transient surface is open. Application
navigation is a vertical list of existing contributions; overlapping icons are
only an entrance preview, not a second navigation model.

The application entrance directly toggles its dock on wide screens. It never
opens an intermediate application menu or asks the user to keep it in the sidebar.
On compact screens the same action toggles a Sidecar-shaped drawer, preserving the
wide-screen preference. Account retains its independent menu and optional pin.
`aria-expanded`/pressed feedback for applications reflects current presentation,
not a suspended wide-screen pin. Radix still owns drawer dismissal and focus.

Environment discovery lives in `workbench-runtime/src/environment-directory`,
owned by the Cordis `environmentDirectory` service. Configured local/manual
profiles and trusted provider sources feed one directory. Entries are lazy
connection recipes, not connected Hosts: cloud lifecycle, source freshness and
transport phase remain separate. Provider-managed entries carry a typed
`MachineResourceLifecycle` with canonical and raw phases plus explicit action
capabilities; configured Local/manual Hosts carry `resource: null`. Resource
actions route only through the owning source, require a caller operation ID and
fail closed when either capability or handler is absent. `provisionHost()` still
persists a connection recipe and never means cloud allocation. the downstream product discovery lives in its plugin's
`environment-directory` folder and binds identity to region, account and instance.
It lists non-running states, paginates with generation fences, and clears entries
on sign-out. Explicit saved bindings preserve Host IDs; unbound legacy profiles
are not silently reassigned. Environment and Chat share an ephemeral profile
projection; discovery registers factories without connecting or changing the
active conversation. Passive Chat queries only connected/auto-connect Hosts.
New instance creation refreshes this same source, not a second profile registry.
The new-thread Host dot observes the selected Host runtime connection directly;
View/task activation errors never recolor it. Cloud resource phases
appear as secondary machine copy and cannot replace connection status.

There is exactly one Sidecar. It composes a primary application `SidecarPane`, an
optional contextual `SidecarPane`, and one Footer; the panes are not independent
sidebars. Each Pane separates layout from visibility: normal pointer resizing
changes the live layout width in both directions, and Frame and Viewport consume
that same width. Clip is only ink containment for explicit visibility/detent
transitions, not a way to freeze content during ordinary contraction.
Feature code provides only pane content. It does not own clipping,
opacity, mounting, dividers, Footer placement or numeric stacking levels. The
visual three-column layout is `Sidecar(primary + optional context) + main`; two-
column and immersive layouts are projections of those same slots.

`useContextPaneGeometry` owns one live MotionValue, shared by contextual frame
and viewport (not two independently writable values). Its projection enforces
`viewport = frame = live layout width` during normal drag, including contraction
and reversal. The committed width is only a persistence/rollback value. Release
updates that preference without deferred reflow. Explicit visibility progress
may clip the live layout on open/close without becoming its width authority.
AppShell dispatches preview/settle/synchronize operations. External preference synchronization runs
after dock and floating readers subscribe, so transforms cannot miss the write.
Floating presentation consumes the same viewport with its window-space cap.
Validation samples held-pointer frames, actual environment control containment,
contraction/reversal, no-jump release and cancellation/capture loss. A test that
accepts a wider frozen viewport during contraction encodes the wrong contract.

Docked and floating presentations share the same `SharedSidebarContent` owner:
primary navigation, context and footer each have one stable React portal and DOM
container. The presentation surfaces supply mount slots only. Reparenting retains
component state, scroll receipts and eligible keyboard focus instead of recreating
the conversation/settings tree. The floating surface budgets primary plus context
against its own viewport rectangle; it can project compact icons without losing
application actions or overwriting saved widths. Its Applications entrance changes
the in-overlay rail (or opens the existing drawer on very narrow widths), never
implicitly docks the entire Sidecar. Docking remains a separate header action.
Escape/outside dismissal retires both explicit peek and pointer-hover intent.
While floating, AppShell owns a transparent outside hit surface behind the
sidebar and above the conversation. Its pointer hit testing explicitly overrides
the non-interactive overlay host so blank-space taps reach it. A tap dismisses the transient presentation
without dispatching the same activation to the covered conversation; it does
not change the saved dock intent. Because this hit surface covers the viewport,
its touch highlight must remain transparent rather than flashing the whole
screen. Touch movement does not acquire hover intent.
Dismissal changes the requested presentation first, but the floating panel
continues to own its shared content, navigation projection and outside hit
surface until its exit animation completes. Only then may those portals move
back to the docked slots. Docking is a separate transaction and transfers the
owner immediately because the floating presence owner itself is removed.

The primary pane has three semantic detents: `expanded`, `compact` and `hidden`.
Expanded width remains a separately persisted preference; compact is
a 52px icon projection, not an overwritten width preference, and hidden only
changes pane visibility; it never clears application/account Pin preferences.
Pointer down creates a Web-owned resize transaction that snapshots the semantic
detent and live physical width, including takeover of a running settle animation.
The old animation must be stopped before reading that origin: stop can flush its
final value, so capturing first can leave a stale pointer baseline.
Pointer move directly updates live geometry and an adjacent candidate detent;
there is no spring chase of the pointer. Primary viewport is derived from that
frame: it equals the frame in the expanded range and uses only the expanded
minimum as a layout floor in the compact/hidden transition. One frame animation
drives detent settlement; viewport has no independent animation/writer.
Pointer up commits the candidate; cancel restores the saved target. Lost pointer
capture cancels once and foreign pointer events cannot drive the transaction.
Dock availability, persistence and
the renderer-free reducer cannot observe intermediate pointer positions. Keyboard
actions traverse the same adjacent state machine.

`SidecarPane` also defines the content-sizing contract: its direct feature child
stretches to the complete Viewport width. Settings, conversations and
extension navigation provide content only; they may not retain an intrinsic
route-era width inside a wider platform pane. This is why Settings replaces the
context slot without leaving an unowned blank strip.

The global Header is not a Sidecar pane child and never consumes the primary
detent. The shared Sidecar trigger and history controls remain a complete
window-chrome group at every detent; when the Sidebar is collapsed, the
persistent Header also shows Write. The separator between primary and context
panes begins below that Header and terminates above the Footer; it has no authority
over either fixed region.

`workbenchWindowMetrics` is the shared native/renderer window-size authority.
The primary desktop window may shrink to 480px, matching the main content
reserve and the shared Workbench window contract. At that width the Shell
uses its immersive fallback: application navigation, context and right tools
are temporarily hidden without changing their saved open/Pin/width intent.
Electron Main must consume this metric rather than maintaining a larger
platform-local minimum. The 760px value used by Settings is a content maximum,
not a minimum window width.

The main Web/Electron Workbench uses a unified sidebar topology. One physical
left pane contains a 60px desktop icon rail for Start/conversation/extension destinations,
the current application context in the adjacent list column, and Settings/account
at the bottom of that rail in normal flow. Chat supplies the conversation list; device Settings supplies its
category index; extension pages may omit context without adding a second
navigation column. These destinations use the actual application router and
extension projection. Start invokes the shared new-task action; there is no
second Start row in the conversation list.

`ShellNavigationConfig.layout=unified` selects this presentation in App. The
shared `shell-navigation` projection excludes the former application rail from
its geometry and docking decisions. Old application/account pins and compact
rail preferences do not resurrect it and are not rewritten. There is no
Applications drawer, rail Pin action or separate application resize handle in
the main Workbench. Other explicit renderer presentations retain their existing
contracts; an embedded shell without global navigation is unaffected.

The unified sidebar has one saved width (default 335px, minimum 300px, maximum 520px) and
one open/closed intent. Frame tokens add the 60px rail to the former 275px default
and 240px minimum list budget; legacy stored widths clamp to the new minimum.
Unsaved preferences use the new default, while non-unified presentations retain
their former widths. Its existing context resize transaction owns live frame
and viewport width; all nested destination/context slots follow the same value
while the pointer is held. Visibility clipping is separate and retains content
through exit. Header, main and right-tool geometry consume that single animated
left width. Neither the sidebar nor its presentation owns Host/Thread lifetimes.
Built-in contribution IDs select localized full names and compact rail labels;
the label projection does not create another navigation authority. Thread row
menus and the enterprise identity anonymous entrance use the same Intl runtime. The existing
four locale catalogs carry this sidebar copy without expanding standalone
language selection. Mode radio/checkbox menus share a reserved indicator column.
Touch row density uses the existing control hit minimum: single-line rows are
max(32px, hit minimum), two-line rows at least max(48px, hit minimum + 12px).

`shell-space` arbitrates the complete window budget: the desktop main reserves
480px, and ordinary right tools reserve at least 320px. Under pressure the tools
are suspended, then the whole sidebar becomes floating; there is no independent
compact application rail. The existing 32px restoration margin avoids breakpoint
chatter for automatic resize recovery. Explicit expand clears that resize history,
so a user's restore command works inside the 32px band. Saved width and visibility
intent are not resize output. Unified Shell has two explicit interaction modes:
desktop dock open/closed, or small-screen drawer open/closed. Mouse hover on the
closed entrance or window edge never acquires a unified sidebar. One Shell command
resolver handles button and Cmd/Ctrl+B; App does not register a competing sidebar
shortcut. Header and drawer controls consume that owner. The small-screen drawer
uses the existing floating owner, dismissible with Escape or an outside click.
In narrow browsers the sidebar is the stationary rear layer: the same gesture
progress moves the foreground page and restores sidebar scale/opacity in place.
Reduced motion keeps the rear layer at full size and opacity; no second timer,
blur or conversation clone participates in the depth effect.
An explicitly opened drawer transfers to the desktop dock when capacity returns;
its transient request cannot keep a desktop floating presentation alive. Choosing a global destination or Settings from
the floating sidebar dismisses it. Revealing suppressed tools uses full width.

Fixed and floating sidebars provide rail/list-column destination/context
slots for the same `SharedSidebarContent` portals. Moving these slots preserves
the DOM, filter, expanded sections, scroll and necessary focus. The footer occupies
the rail column, with square Settings and account entrances;
account menus remain Radix surfaces. In the existing mobile drawer presentation
(`AppShell.mobileSidebarEnabled`), the same portal slots share a full-width native
scrollport for application destinations and conversation context. Only Start is
sticky; other destinations, search and participation/server filters scroll away.
Settings and the named account occupy a separate fixed bottom track. The mobile
stylesheet owns that projection; desktop retains its quiet vertical icon rail
and fixed list controls. Existing portal/action/filter owners survive resizing.
No new breakpoint, action/state model, saved width or dock/resize policy is
introduced. Controls consume shared navigation and sidebar-entrance treatments. Anonymous use and account-provider behavior remain unchanged.

Mobile page-stack motion keeps per-frame progress in MotionValues. The foreground
edge directly consumes derived logical corner radii with the theme radius token;
an inherited animated CSS progress variable must not invalidate unrelated
conversation descendants. Both translated edges still share the same progress,
and this paint boundary does not change gesture, DOM or scroll ownership.

Desktop destination buttons show icons only; accessible labels and Radix tooltips
retain their names. The common Header owns the standalone managed site mascot/wordmark
and trailing sidebar toggle on conversation, task, settings and collapsed routes.
The measured brand region uses the default sidebar width capped by viewport
space; it is independent of whether a route supplies context. History arrows
are omitted from browser/Electron policies while router history remains intact.
A rounded content corner starts below the toolbar on the context column, or on
the main frame for a context-free route. Management views own their page titles,
so the shared Header omits duplicate management titles.

The browser Header does not reserve a separate Home button. The sidebar's global
Start owns new tasks while expanded; collapsed persistent Headers show Write
after the sidebar trigger. The off-layout Header clone measures the same action
count and geometry as the visible rail. Thread-edge header eligibility consumes
Shell width minus live right-panel width; left animation is not its input.

The single `leftPanelSlot` topology integrates the existing router, extensions,
space budget and account providers without another sidebar business model. Expo
keeps its existing native shell; this Web/Electron renderer change does not
establish native parity.

## Expo Web's place

Expo Web is a first-class output of `apps/workbench-expo`, not a compatibility
mode hidden inside the Vite app. It is appropriate for mobile-width browsers,
PWA distribution, and validating universal routes. The Vite app remains the
desktop browser/Electron target where precise Workbench layout and mature chunk
control matter.

Production routing can send desktop browsers to the Vite deployment and mobile
browsers to the Expo deployment, or expose the Expo build under a stable path.
Both connect to the same app-server and consume the same runtime snapshots.

## Commands

```bash
npm run dev:web          # Vite desktop browser renderer
npm run dev:expo:web     # Expo Router through Metro
npm run dev:expo:ios     # custom native build + iOS Simulator (macOS/Xcode)
npm run lab -- scenario smoke      # real 9988 SDK smoke as NDJSON
npm run lab -- scenario reconnect  # in-flight disconnect + reinitialize proof
npm run build:web        # Vite production build
npm run publish:web      # append-only publish to .runtime/workbench-web
npm run serve:web:static # production static host + /appserver WebSocket gateway
npm run build:expo:web   # Expo Web export
npm run build:expo:ios   # Metro production iOS bundle, works on Linux CI
npm run gate             # boundaries + types + Web builds + iOS bundle
```

## Vite Web release invariant

The browser and Electron renderer may consume the same Vite build, but they do
not assume that every file appears at the same instant. `build:web` emits a
Vite manifest, content-hashed assets and `version.json`. `publish:web` then:

1. verifies the build id and manifest;
2. appends or verifies every hashed asset without deleting an older hash;
3. excludes source maps from the public tree;
4. snapshots the manifest and version under `releases/<buildId>/`;
5. atomically replaces `index.html`, then `version.json`.

`index.html` and `version.json` use `no-store`; manifest-owned hashed assets use
one-year `immutable`; non-hashed public files revalidate even when Vite copies
them below `assets/`. If a lazy import fails, the
bootstrap compares its embedded build id with `version.json`, reloads once only
when a newer release exists, and otherwise renders an explicit recovery view.
This is a renderer delivery rule, not AppServer or Replica state.

The browser production host exposes the same-origin `/appserver` WebSocket gateway and
adds the authenticated HyperNode identity server-side. The current fixed
`OPENCRAFT_HYPERNODE_USER` is suitable for a single-user/debug deployment only; a
multi-user Web deployment must obtain that identity from its authenticated
gateway session and must never accept it from browser JavaScript.

The independent headless Linux server archive is a separate deployment of the
existing Local Agent Host, not a new Thread authority. Its Node launcher starts
the DSH-backed Host and serves a packaged Web Workbench from one HTTP server,
bound to loopback by default. The renderer's bundled Host profile resolves `/appserver` against the
actual browser origin at runtime; neither the browser nor the static host owns
the DSH process or its credentials. When employee verification is configured,
`/appserver` also applies the shared Hub identity overlay, advertises the same enterprise identity
metadata capability as Codex/SSH, and verifies the captured submission context at
native admission. Client identity fields cannot establish provenance. Request IDs
and logical-client epochs fence late replies across disconnect/reinitialize;
confirmed creation results keep the original employee even after the client leaves.
A separate `/apphost` WebSocket attaches
browser Clients to the existing Codex Engine Adapter through AppHostServer's
lease/generation contract; Codex's stdio process and account pool remain
Server-owned. The headless service retains that physical Host when the last
browser WebSocket leaves, so mobile sleep does not terminate an admitted Turn;
shutdown of the headless service releases it. The artifact is single-user, with a distinct private data root
and a single-writer lock. Explicit `--host 0.0.0.0` plus the dangerous-mode
acknowledgement allows unauthenticated HTTP on one port for static WebUI and
both WebSockets. Public mode does not check HTTP or WebSocket Origin, so an
HTTPS-terminating reverse proxy can forward to the same listener without
special forwarded-header handling; the explicit unauthenticated-public flag
is the only exposure gate. The
installer defaults to port 80 and grants only `CAP_NET_BIND_SERVICE` for
privileged ports. It adds persistent systemd supervision, not another proxy or
access policy. This direct public mode is not a secure multi-user service and
does not change the private default. The Web entry derives UUID v4 from
`getRandomValues` if `crypto.randomUUID` is unavailable on an HTTP origin;
this does not enable browser APIs that require HTTPS. It does not turn the
typed Client/Hub/Server topology into a multi-tenant Hub or expose native
Electron Preload features. The Web build registers the existing Model Services
View against DSH and Codex Accounts View against the Codex Host, so
configuration remains Host-owned rather than duplicated in browser storage.
The packaged Linux Web Host advertises `/` as the remote browse root for its
DSH and Codex nodes. The browser folder picker reads the Server filesystem via
`fs/readDirectory` and registers the chosen path with that node's Project
catalog; it never opens a macOS folder picker or uploads a client directory.
The root is a navigation hint, not a filesystem permission grant: the systemd
service's OS permissions still decide which directories can be read or used.
An older browser profile seeded with an empty root is updated only when it
still matches the bundled WebSocket endpoint; a custom non-empty root and
unrelated profile fields remain untouched.
The browser Workbench retains one AppServer transport object per Host; if its
`/apphost` WebSocket closes, reconnect replaces the invalid AppHost client and
lease inside that object. Existing Workbench listeners stay attached, while
the new lease reinitializes the logical client. If the service and physical Host
remain healthy, it keeps the same Host generation; service restart or physical
failure produces a new generation. Thread state is re-read from AppServer. The
Web host uses protocol Ping/Pong to terminate a half-open socket, and the browser
bounds the initial AppHost handshake; both mechanisms convert an otherwise
indefinite mobile-network stall into the same retryable transport failure. The
Codex Host logs payload-free logical initialize and Thread resume lifecycle
events so reconnect failures can be separated from history projection failures.
For each browser `/apphost` attempt, the Web client sends a new random diagnostic
ID in the WebSocket query. The headless server logs that ID with upgrade,
hello, Host-connect acknowledgement, heartbeat timeout and close stages; a
legacy client without the query receives a server-generated ID. If the browser
fails before it can read a WebSocket response, it posts only that ID, its
connection phase, readyState, elapsed time and optional close code to the
same-origin diagnostic endpoint. The endpoint rejects unknown fields and never
records the page URL, Thread ID, messages, credentials, IP address, Origin,
raw exception or close reason. These events locate the failing layer; a
browser WebSocket `error` cannot itself reveal an HTTP upgrade status. No
diagnostic event changes Host or Thread ownership or retries.
Both public `/apphost` and private `/ssh-apphost` attempts carry the same random
attempt ID and a public/private channel classification. Upgrade rejection logs
distinguish unavailable SSH management, origin rejection and missing/invalid
session admission without echoing cookies, headers or identities. Frame rejection
logs use allowlisted reasons (binary, JSON, protocol version, renderer/request/
host/lease ID, generation, message type or frame type), an allowlisted message
kind, frame sequence and pre/post-hello phase. Hello diagnostics include only
numeric received and server protocol versions; invalid version values become a
fixed sentinel. Neither malformed field values nor raw frames enter the log.
The diagnostic classifier is the admission validator, so adding observability
cannot silently relax the existing protocol checks. Logging callbacks are guarded
and cannot interrupt normal connections. The socket regression entry is
`tests/apphost-frame-diagnostics.test.mjs`.


Weak-network recovery separates shared connection reachability, per-Host protocol
readiness and per-resource restoration. Web foreground, pageshow and online hints
are coalesced by the shared AppHost socket owner. A negotiated `connectionProbe`
capability enables a bounded, correlated `connection/probe` exchange; old peers
receive no unknown probe message. The server answers probes outside its business
queues. Probe success proves bridge reachability, not engine or Thread readiness.
Hidden pages cancel probe deadlines; old sockets and cancelled probe replies
cannot affect successor connections. The server's protocol Ping/Pong remains a
fallback for detecting half-open connections. Failed probes revoke only Client
attachments, never service-owned execution.

AppHost ready and Host claim waits have finite control deadlines. Timed-out claim
acknowledgements release their original lease; each subsequent attempt uses a new
lease.

Expired claim records still count toward the shared request budget because
late grants retain cleanup ownership. If they saturate that budget alongside
pending requests, the client retires the bridge with retryable
`APP_HOST_REQUEST_LIMIT`; its socket owner then replaces the connection and
all affected Host attachments can recover. Detaching the bridge releases its
claims without stopping service-owned execution. Ordinary in-flight backpressure
without expired claims rejects only the excess request and keeps the bridge.
The generic WebSocket transport settles unfinished connect callers on explicit
close even when no platform close event arrives. Delayed close cleanup and
asynchronous decode failures are fenced to their original socket; neither can
close or fail a successor connection.

Closing one logical channel cancels its own ready/claim wait without
closing the shared client or cancelling service-owned startup. A grant already
in flight is released against its original lease and generation; its completion
cannot overwrite that channel's terminal closed status. Deterministic coverage
exercises close before ready, during shared startup and between grant delivery
and its promise callback (`tests/app-host.test.ts`); the browser origin smoke
also checks late release while a peer remains open on the same real socket.
Closing one logical channel cancels its own ready/claim wait without
closing the shared client or cancelling service-owned startup. A grant already
in flight is released against its original lease and generation; its completion
cannot overwrite that channel's terminal closed status. Deterministic coverage
exercises close before ready, during shared startup and between grant delivery
and its promise callback (`tests/app-host.test.ts`); the browser origin smoke
also checks late release while a peer remains open on the same real socket.

Expired claim records still count toward the shared request budget because
late grants retain cleanup ownership. If they saturate that budget alongside
pending requests, the client retires the bridge with retryable
`APP_HOST_REQUEST_LIMIT`; its socket owner then replaces the connection and
all affected Host attachments can recover. Detaching the bridge releases its
claims without stopping service-owned execution. Ordinary in-flight backpressure
without expired claims rejects only the excess request and keeps the bridge.
The generic WebSocket transport settles unfinished connect callers on explicit
close even when no platform close event arrives. Delayed close cleanup and
asynchronous decode failures are fenced to their original socket; neither can
close or fail a successor connection.

Business envelopes serialize per Host, allowing another Host on the same
socket and connection probes to progress during a slow activation. Local send
cancellation releases its pending acknowledgement without cancelling or replaying
remote execution. AppServer initialization rejects results from a revoked transport.

Workbench Host readiness ends at lease acquisition plus AppServer initialize.
`workbench-runtime/connection-lifecycle.ts` is the single connection owner for
cold start, reconnect and implicit Thread acquisition. It registers attempts and
promises before notifying observers, bounds each attempt, and owns retry tickets,
foreground admission and stability timers. Revocation synchronously invalidates
child sources before publishing connection loss. Readiness commits require the
current client, initialized protocol, open transport, connection revision and
assembled local services. A late initializer cannot cancel a successor retry.
`workbench-runtime/recovery-policy.ts` retains observation and demand-prioritized
conversation recovery; it has no connection timer or writable readiness authority.
Both owners remain scoped to the existing Runtime connection domain. Explicit visible leases recover first; explicit
open leases, running work and unresolved interactions recover in the background
with concurrency one and at most three transient retries. Cache residency and DOM
subscription counts alone do not create recovery demand. A reserved foreground
slot permits a newly visible conversation to start while hidden work is pending.
Making one lease visible schedules or promotes only that binding's existing
recovery task. It does not revalidate peer Threads or restore Host terminals and
file watches. Connection recovery still restores all demanded bindings; explicit
Thread retry retains forced same-connection revalidation.
Semantic Thread failure stays local. Same-connection revalidation forces a real
Resume instead of reusing its previously resumed fast path. A stable 60-second
connection is still required to reset connection retry escalation; cancelled
callbacks are fenced, and manual failures cancel automatic retries. PTY and file
watch recovery do not gate Host readiness. The application binds Host readiness to
host-scoped read-query cancellation and invalidation: active queries refresh,
inactive queries become stale, and existing data remains visible. Stable resource
query keys are retained across connections. This coordination is independent of
menu mounting; late cancelled reads cannot overwrite recovered catalog data.
Execution requests keep their existing admission and reconciliation policies and
are not replayed by connection or cache recovery.

Replica source operations register their generation before the first preparation
await. Disconnect settles synchronization callers immediately; late preparation,
pages, mutations and live-event failures cannot adopt or change a successor source.
Storage writes and clears use one queue across source generations for the same
client/cache key. Accepted external writes may finish after revocation, but cannot
overtake a newer write, and publication rechecks source ownership after storage.
The V3 ThreadView projection remains volatile. Negotiated history and queue
capabilities are read from the current initialized client, not a cold-start copy.
Logical AppHost claim removal precedes remote disconnect notification; notification
failure cannot retain local authorization or close a peer's service-owned Host.
The raw and logical-client Core adapters share a socket owner that revokes before
close and checks its identity after health and socket-open waits. RPC encoding,
synchronous send throws and asynchronous send failures settle the same receipt.

The app-like iPhone Web surface requests a fixed viewport scale for embedded
browsers and keeps focused editable text at a 16px minimum on coarse-pointer
phone viewports. This avoids WebKit focus zoom without changing desktop
Composer density or blocking keyboard focus. Page pinch zoom is intentionally
disabled for this product surface; actual WeChat and WeCom WKWebView handling
must be checked on device because an embedding browser may interpret viewport
scale limits differently.

Electron does not use this HTTP gateway. Its loopback server is static-only;
the application-scoped transferred port described in
[`architecture/opencraft-app-host.md`](./architecture/opencraft-app-host.md) is the sole
Renderer-to-native connection boundary.

Local macOS preview builds use a separate product identity, profile directory,
output tree and ad-hoc signing path. This prevents a preview from taking the
release app's single-instance lock, daemon socket, browser session or stored
credentials. The preview hook mutates only the assembled package: it removes
foreign native prebuilds and signs after all packaged resources are final.

Release renderers use one standard Oxc minification pass plus content-hashed
asset names. They do not enable top-level ultra mangling, repeated aggressive
compression, or a second JavaScript-obfuscator pass over Electron Main,
Preload, or Daemon bundles. Runtime correctness and debuggable failure
semantics take precedence over transforming control flow; source maps remain
outside the public published tree.

## Next feature rule

### Settings-owned local Model Services

Settings owns only the page placement, category navigation and master-detail
viewport. The extension-owned Model Services View keeps its provider directory,
drafts and immutable local Host client across Settings reattachment. Connected and
hostless shells use the same Settings route; neither creates an Environment parent
or a second model settings service. Removing the page from view must not dispose a
Host, alter the active conversation, or rewrite model/provider configuration.

Electron activates these settings with its daemon-owned `local` and
`local-codex` Host profiles. The generic OpenCraft Web package includes these
settings views and activates them from website-owned HTML configuration before
Host startup. The website derives `local` (managed site) and `local-codex`
(managed site), both `remote-control`, from its primary and Codex proxy targets. URLs
remain same-origin; private execution addresses and HyperNode user headers are
not exposed. The managed website disables the HyperNode plugin to avoid a duplicate
primary profile; its user header remains transport configuration only. Explicit `VITE_APPSERVER_HOSTS_JSON` overrides the runtime
list; explicit Agent/HyperNode build flags override activation. Static/Vite
pages without configuration retain existing defaults; invalid injected data
fails startup through the existing error boundary. Legacy generic Web HyperNode
links and remembered history resolve to `local` at the Router boundary; missing
local thread/project selections are copied without deleting legacy values or
overwriting existing local intent. This compatibility applies only to the
website-owned primary proxy without explicit Host overrides or a real saved
HyperNode profile. the downstream product excludes these
plugins and Electron ignores website configuration. The Web
extension registers presentation only; the deployment's WebSocket profiles own
the Host connections, and provider credentials remain on the AppServer Host.

Implement a feature in this order:

1. protocol/domain types;
2. renderer-free runtime command and snapshot projection;
3. first vertical platform adapter;
4. a second physically different adapter that proves the SPI;
5. freeze the smallest contract that both implementations need;
6. remaining platform adapters and cross-platform capability tests.

If a feature starts in either app with networking, timers, persistence, or
business state embedded in a component, it has crossed the boundary too early.

### Embedded console model authority

The embedded the downstream product Chat uses the Host's configured model policy. Its model
and reasoning controls are omitted; saved Composer choices cannot override the
current Bot/Profile configuration. Before each new Turn the runtime re-reads
the profile-scoped Host model catalog, validates input against its declared
default and submits that canonical model. It does not hard-code `auto`, choose
the first model, or overwrite Hermes reasoning settings. Missing defaults fail
before sending and direct users to model settings. Steering and queued follow-ups
retain the running Turn's model semantics. The full Workbench keeps user-owned
model selection.

### Embedded connection recovery

The resident Host runtime remains the sole backoff/reconnect owner. Embedded startup
observes readiness across failures instead of disposing on the first rejection.
Hermes capability initialization overlaps independent control-plane Bot bindings,
native Profile discovery and hosted-room capability reads. It still waits for
their current-connection results before advertising capabilities; an unsupported
Profile API remains an absent Bot capability, while control-plane failures still
fail initialization. The first conversation list remains a fresh `session.list`
read after Host readiness, not a speculative cache that could mask session
changes during connection. Transport stage logs distinguish Host connection,
initialize and `thread/list` latency without recording conversation content.
Disconnects preserve Thread, Composer document and attachment owners; reconnect
rehydrates existing threads and does not replay user submissions. The console shows
a slow-connection notice after 30 seconds; fixed-Profile Hermes transport attempts
have a 90-second deadline. Timeout fences late bootstrap responses and releases the
physical connection; disposal cancels pending startup. Manual retry shares an active
attempt. Authentication/configuration/resource failures retain their manual-recovery
classification. Account or Bot changes retire the old component and credentials;
preservation applies within that owner, not across account changes or refresh.

Embedded browser metadata (pages, tabs and conversation bindings) uses storage
owned by one Application lifetime. Closing the panel parks its pages; switching
conversations selects that conversation scope. Bot or account changes dispose the
Application and do not restore the previous identity's browser metadata. This is
presentation isolation, not an OS filesystem or browser-cookie security boundary.

## 会话顶部信息

手机宽度（不超过 640px）不展示会话标题旁的 Project/工作区附文，标题与操作按钮保留。桌面继续展示附文。已有“…”菜单的会话详情以只读方式展示实际项目名与工作目录：优先当前会话执行信息，目录尚未恢复时可用同一会话的规范 Thread 元数据；未知字段不伪造，不更改执行目录或启动会话。

会话信息使用共享 InformationPanel 两行元数据和 ModalSurface 自适应呈现：可用视口不超过 640px 为贴底 sheet，超过 640px（含 iPad 常规横竖屏和宽分屏）为至多 420px 居中弹窗；不按设备型号或 UA 分支。标题、右上关闭与目录复制均本地化，不保留重复底部关闭栏。长项目名/路径完整换行且可选，目录复制沿用共享控件的成功/失败反馈与非安全上下文回退。Radix 继续拥有模态、焦点、Escape 和遮罩关闭；窄屏仅顶部手柄拥有下拉关闭，短拖/取消回弹，不拦截信息区的选择与滚动，减少动态效果关闭进出动画。下拉手势由Web平台可选AdaptiveSheetHandle持有，与信息内容一起按需加载，通用ModalSurface不将手势实现加入首屏。主题、排版与触控命中尺寸由共享设计系统持有；不更改会话或执行状态。

## Managed Web deployment

The public npm release `@opencraft-app/opencraft` owns the website installation,
not the execution lifecycle. A stable HTTP/WebSocket entry process owns update
credentials, npm metadata, the serialized update job and the durable current /
previous release pointer. Compatible versioned Web workers own static delivery
and the external AppServer proxy. A candidate must pass health and build identity
checks before new requests switch; existing sockets lease their original worker
until disconnect. DSH/Codex belong to independently managed execution services.

`@opencraft/web-update-protocol` owns the status and worker compatibility boundary.
The Settings UI reads server status, submits authenticated update intent, and never
holds registry credentials or controls an execution process. Publishing a package,
installing a server version and refreshing a browser are separate actions. See the
[Web installation and update runbook](web-deployment.md) for setup, failure recovery
and the stable entry maintenance limitation.

## Managed server updates

The Web bootstrap owns the durable release pointer and update authorization. In explicitly configured server deployments, its execution adapter switches the same release's gateway/daemon through a dedicated systemd unit and checks daemon IPC readiness, release identity and unchanged external core PIDs before committing. A failed activation restores the prior execution release. Startup reconciles interrupted execution pointers against committed deployment state; cleanup retains every execution-referenced release. Runtime cwd, machine identity, credentials and DSH installation remain deployment-owned. Codex core/CLI are never replaced by this adapter. See [deployment contract](web-deployment.md#服务器执行端更新).

### File browser launcher

The built-in resource panel contributes `workspace.files.open` through WorkbenchPanelService toolbar actions. Both the empty right panel and new-tab picker project this same action. It opens the current toolbar context cwd as a retained resource tab (not a replaceable preview), reusing WorkspaceResourcePanel tree, Host filesystem and file preview. Repeated launches reuse the directory tab. Missing cwd omits the action; no client filesystem or guessed root is substituted. Embedded core chat retains its explicit action allowlist and read-only renderer.

### Server-owned conversation schedules

Conversation-local scheduling is a Host service with a durable occurrence ledger
and a narrow engine execution port. Views only manage plans and read results;
engines retain admission and execution authority. See [conversation schedules](execution-ownership.md#conversation-schedules)
for capability, restart, uncertain delivery, timing and shared-Host authorization
boundaries. Codex and DSH consume `@opencraft/host-schedules` through separate
execution ports; queue support alone does not imply an adapter for other engines.

Schedule presence in the shared Sidebar is a Host catalog projection, independent
of conversation execution status. The multi-Host reader uses capability-gated,
profile/authorization-scoped summary queries and Host invalidation subscriptions;
row components receive semantic summary data only. See the [schedule catalog
contract](execution-ownership.md#schedule-catalog-projection).

## Retired implementation audit (2026-10-16)

Private account/environment presentation and its product-facing fixtures are
owned by downstream composition. Removed forwarding wrappers and prototype
connection hooks are not public APIs. Product compatibility exports and stored
account/region identifiers remain with their actual downstream owner; their
presence does not create another core account authority.

The current Embedded Workbench uses Host readiness, binding and Conversation
capabilities. Its old standalone Bot Chat write-lease class had no production
caller; its self-only test and the unconfigured optional presentation gate have
been removed. Bot Chat still enforces the Conversation's read-only descriptor.
Real embedding admission/recovery and product-isolation browser checks, rather
than a detached lease fixture, cover the current composition.

The old demo seed/package subpath, unused identity-color projection, one-way
legacy Composer writer and unused query/convenience exports are retired. The
legacy Composer reader remains because stored drafts still use it. Syntax theme
regressions target the shared React theme implementation directly. Static
no-inbound/unused results are candidates, not deletion proof: executable package
exports, Vite/Metro platform files, workers, generated/shared upstream snapshots
and inline browser-fixture imports are checked separately. In particular, React
imports can be required by the test runner's classic JSX transform even when
TypeScript's automatic JSX analysis reports them unused.


Old navigation source assertions for exact component spelling, toolbar sizes,
header padding and an extracted DSH composition are retired where actual browser
or native provider regressions cover the behavior. The DSH discovery test uses
isolated real files and the installed native registry to check project switching,
shared user Skills and source attribution; omitting project roots fails it.
Authentication, account clipboard/focus and Bot-management fixtures consume the
current platform contract and actual services. Attachment tests reflect the
existing 1 GiB chunked capability and verify transport assembly through both
Codex adapter and local Host; no commercial wire limit is changed here.
Trusted platform Views receive optional `PlatformViewHost.currentUser` from the selected account contribution's authenticated `identity` projection: provider ID, stable subject ID and explicit handle. Display-only names, retained metadata and anonymous/loading/error snapshots cannot supply that identity. The provider owns authentication and revocation; this projection supplies no credentials or resource grants. enterprise identity maps verified staffId/loginName into this shared contract. Tasks uses an exact registered member handle or a client-selected viewing preference; it does not import enterprise identity or infer identity from a name.

### Global conversation text search

The global dialog keeps immediate title matching over the complete admitted metadata catalog and debounces ephemeral Codex `thread/search` queries per Server. Shared-native SSH admission forwards this stateless read and `thread/searchOccurrences`; no local transcript mirror, persistent index, resume, execution or history reconciliation is performed to search. Admission does not establish upstream feature support: native method-not-found and the known DSH unsupported-method response retain title-only operation. Other failures, disconnected Servers and remaining cursors stay visible instead of becoming empty complete results. Each Server scan is serialized; obsolete queued queries are skipped, and query, recipe, authorization and connection-incarnation changes fence results. Pages are loaded explicitly with cursor-cycle protection, deduplicated by Server route and Thread ID, and retain other Servers' results on failure.

Results render escaped message snippets. Selection resolves the first native visible occurrence, opens its conversation through the existing navigation transaction, and uses ConversationNavigationSource hydration/projection plus measured virtualized prompt positioning. User hits select their prompt; assistant hits open the containing turn at its prompt, retaining the surrounding context. Raw-history matches without a visible occurrence still open the conversation with an explicit positioning notice; failures to locate can be retried in the dialog. Native keyword scanning speed is not an indexed-search latency guarantee.

### Authenticated application manifest

Application branding owns both the initial Vite HTML and runtime document links.
A manifest link sets `crossorigin="use-credentials"` before insertion, including
for same-origin assets, so cookie-authenticated deployments can retrieve their
install metadata without a login redirect. Other brand links retain their own
fetch semantics; validated same-origin asset URLs remain mandatory.

Manifest publication is opt-in through the product descriptor's `manifestUrl`.
The managed site currently omits it: both initial HTML and runtime branding emit no manifest
link, while title, favicon, touch icon and public share metadata remain active.
Legacy static manifest/icon files remain available for existing pages; absence
of a link does not clear browser data, unregister workers or uninstall an app.
The platform's optional credentialed-manifest support remains available to
other product descriptors. This opt-out is independent of browser storage
failure recovery and is not evidence that a manifest caused a storage timeout.

Conversation headers expose capability-gated rename in standalone as well as embedded layouts. The same Host/Thread title writer owns persistence; Escape cancels, Enter saves, and failures use shared nonblocking notices. The pencil remains reachable for touch.
Sidebar pending/running/Goal/review/error/unread activities share the single trailing action lane. Content has body and participant tracks only, releasing the former18px status track and4px gap. One activity renderer supplies accessible state and the menu description; error/review/unread dots use the same5px neutral gray. Desktop shows activity until menu hover/focus/open; touch keeps activity beside actionable dots inside the existing44px target, including while open. Existing Radix owns actions; rows without actions keep activity in that lane without new permissions. Title and avatar geometry stays stable across states and capabilities.

## Startup resource ownership

启动按资源所有权分为四段，Web、Electron renderer 和嵌入 Workbench 使用同一个 Application，而不是为加快首屏再创建一份 Host 或账户。

| 阶段 | Owner / 进入条件 | 资源与退出条件 |
|---|---|---|
| Bootstrap | 页面/元素 owner | 主题、偏好与语言控制器；关闭页面取消后续安装 |
| Required | Application | 注册 provider、恢复当前 Host/路由/草稿、Shell/Composer；不得把当前 Host 连接降成后台功能 |
| Optional | Application 的 OptionalFeatureStartup | 首个可用页面提交并经过 paint 后启动；每项之间让出主线程，隐藏时等待 visibility 事件，dispose 取消并 drain 已开始的激活 |
| Demand | View 或连接尝试 owner | 设置/管理、连接器、文件预览、扩展解析器和 Hermes 协议实现；挂载或 connect 才导入，退役后不得安装迟到结果 |

显式打开 `/views/opencraft.tasks.board` 时，Tasks 的注册属于该路由的 Required 阶段，
在首个 Shell 呈现前完成；不能把尚在 Optional 队列的注册误判为扩展不可用并退回聊天。
从普通聊天启动时仍走同一 Optional owner 与加载/取消边界。此规则保留深链和刷新意图，
不提前加载所有管理页。

注册描述、业务服务和视图实现分开。下游产品/Hermes/内建 Agent 仍同步注册可发现页面及 provider；`createDeferredView` 只缓存成功的组件、合并并发加载，失败可重试，卸载屏蔽迟到呈现。页面离开不会销毁 Application 持有的账户、Host、会话或草稿。Hermes 使用 `DeferredDuplexTransport`，预先注册的同步 provider ABI 不变，只有 connect 才获取物理协议模块；转发消息、发送者 context、状态/失败分类和恢复提示，close 撤销尝试并关闭迟到 transport。

生成的 Agent Console 字典由同步器的 renderer 适配策略管理：保留全部语种的字面量动态导入，在管理页显示前准备当前字典；同一加载合并、失败删除 pending、语言代次屏蔽旧切换。不得仅设置区域编译常量而把国际站字典裁掉。Next SSR 真源行为不变，Metro 不引入 top-level await。

页面样式随页面代码进入；Shell 与会话样式由主入口持有。嵌入式 shadow root 通过 `bindShadowFeatureStyles` 镜像 Workbench 资源前缀下的延迟样式，文档副本服务文档级 portal；不复制宿主站点 CSS，随元素销毁断开 observer。包体门禁与静态协商见 [启动资源治理](startup-performance.md)。

启动装配入口是 `runtime/web-workbench-supervisor.ts`；命令、配置与共享服务类型在 `workbench-application-services.ts`，React Context/Provider/hooks 在 `appserver-runtime-context.tsx`。旧 Context 导入保持具名导出兼容，composition root 直接消费 supervisor。共享呈现 chunk 不再持有扩展动态导入映射，避免一个可选插件的新哈希让所有上下文消费者失去缓存。不得重新把插件装配放回跨页面使用的 hook 模块。

静态关键图显式包含HTML动态引导的main.tsx：异步语法本身不表示可选资源。主入口CSS属于Bootstrap；paint后的Optional功能样式则在实际请求测量中另计，不能用静态报告替代总加载成本。


### Configured unknown-machine display names

Managed Web operators may set `OPENCRAFT_MACHINE_DISPLAY_NAMES` to a JSON map
of exact Host IDs to machine display labels. The worker injects the validated
`machineDisplayNames` deployment field before application startup. For a Host
without a reported machine identity, its configured label replaces only the
“Unknown machine” prefix; its connection displayName remains after the separator.
Reported machine names and cloud resource names keep precedence. These aliases
never supply a machineId/platform/Agent or affect grouping, routing or authorization.
The application reads this immutable presentation configuration once; no browser
profile or backend connection recipe is rewritten. Unconfigured Hosts keep the
localized unknown label.


### Host-owned automatic Codex conversation titles

The shared local or SSH Codex product adapter observes newly created durable Threads and starts
one background title attempt after their first accepted text input. It uses the existing initialized AppServer connection for a
private
ephemeral Thread, a structured `turn/start` result, then `thread/name/set` on the
original Thread. Actual `model/list` availability selects Luna, then mini; it
never changes the conversation model or creates a second credential owner.
A missing small model, invalid result, error or 30-second deadline preserves the
existing preview. Existing/resumed/forked Threads are not bulk renamed.

The Host owns at most two simultaneous inference turns and 32 pending jobs; a
View disconnect does not cancel title generation. Inference has no project
documents, tools, plugins, hooks, memory, search or runtime workspace roots.
Private frames do not enter the conversation UI, completion notifications or
product metadata indexes. Cleanup interrupts only an unfinished private turn
and unsubscribes its ephemeral Thread. Host disposal cancels all pending work.

Manual rename, deletion and archive invalidate pending generation at admission.
Before applying, the Host serializes against original-Thread mutations and
rechecks the native name; an existing name is preserved. Successful persistence
invalidates catalogs for every initialized Client, including readers without an
open Thread View. Native storage remains the title authority. Only the adapter receiving the creation response owns the title attempt; other
Hubs or Clients observing notifications do not start another attempt. Pure native
core forwarding does not create a second owner; DSH and Hermes
continue to use their existing title sources.

### Account model defaults authority

Personal Composer model/effort defaults are account data, separate from installation UI preferences. `PlatformAccountContribution.modelDefaults` exposes `AccountModelDefaultsPort`; enterprise OA implements authenticated same-origin HTTP backed by `account-model-defaults.sqlite`. Records are isolated by verified staff identity and Host, with revision CAS and no browser persistence. Renderer query memory is a disposable projection. Account/activation changes fence writes and late responses; HTTP validates the current identity and scope for every operation. Failures surface through Composer model errors and never fall back to legacy browser account records or write shared Host config. Without an account port standalone installation memory remains supported. See [model configuration](../design/model-configuration.md#personal-defaults-on-shared-servers).


### Recovery episode diagnostics

One outage retains a `recoveryId` across backoff and connection attempts. Host-ready
is a distinct stage from authoritative history and generation-scoped capability
declaration readiness. Deferred registration is not proof that an Agent is active:
execution still awaits its admission/activation contract. The owner emits safe
stage durations, recovery request/UTF-8 response bytes, compatibility projection
compute time (separate from Replica publication readiness) and extra conversation counts. DSH additionally returns actual native
history reads/events and projection duration for each Resume. Native and renderer
spans use their own clocks; do not subtract timestamps across processes.

Web forwards only an explicit metadata whitelist to the existing diagnostic
endpoint (1 KiB limit); it excludes content, IDs of conversations, request params,
credentials and raw errors. Offline reports retain at most 32 episode/stage entries;
new lifecycle events/online flush them, without a telemetry retry timer. Logs do
not claim UI paint or phone power measurements. Read-only query cache invalidation
remains an application adapter; its RPCs join episode request metrics while the
episode is active.

### 单 Hub 主体协作

Headless 将 `access-control/collaboration` 作为 ActorStore / ActorAccess 后的协作权威，拥有独立托管 SQLite 中的私聊消息、投递、运行绑定与执行交接记录。`scripts/conversation-execution.mjs` 是有限的进程内 AppHost 适配；OpenCraftHostQueue 仍唯一拥有执行领取，并在领取前调用当前 Actor 授权校验。Wire 字段不构成可信调用上下文。契约及未隔离边界见[主体协作接口](actor-collaboration-api.md)。

[会话引用、读取与投递](architecture/conversation-interoperability.md)将Actor和Conversation资源分开，统一Collaboration接纳与交接，目标Host继续拥有执行队列。Headless本地Codex已接通稳定引用、按需历史、原始输入委托的服务端工具；其他引擎与跨Server投递须有实际适配，不因协议类型而自动可用。

### Read-only Office resource previews

Host file authorization, byte reads, resource identity and download remain in the
Workbench resource panel. `file-preview-core` owns engine leases without renderer
imports; `file-preview-web` owns DOM attachment and the built-in adapter registry.
`plugins/office-preview` receives authorized Blob bytes, lazily parses legacy DOC/DOCX/PPTX and spreadsheet formats
and owns third-party renderer cleanup. This is a trusted built-in service boundary,
not an additional public extension ABI. See [file previews](file-preview.md).


### Shared Codex credentials

An operator may bind an account to an existing OAuth `auth.json` owned by another local credential manager. Run the packaged `runtime/codex-account-reference.mjs` with the installation's Node binary, the Codex data directory, the absolute shared auth file and an optional local account ID. Run as the service identity in its actual mount namespace while no Codex writer owns that directory; the command acquires the existing writer lock. It stores an external file reference and fixed upstream account identity, never the source tokens or shared session databases. This is an operator tool, not a browser RPC for reading arbitrary paths.

Each credential selection rereads the file, including atomic replacements and symlink targets. Source identity must still match the registered account. Missing, malformed or changed-identity files fail closed without a cached credential. The external owner alone refreshes the source; OpenCraft neither refreshes these credentials nor writes or imports over the reference. Expiry or rejection requires that owner to renew the login. Ordinary managed accounts retain their existing refresh behavior.

The service must have read access to the source in its real mount namespace; do not assume root access, copy credentials, relax permissions globally or share the whole `CODEX_HOME`. Reference files use the existing private account-secret directory and file permissions. Removing the account removes its local reference, never the external source. Older readers do not understand references: remove the newly registered external account before rolling back to one, preserving all conversation and source data.

### Local connection diagnostic propagation

TransportFailureDisposition optionally carries immutable, locally generated
connection diagnostic metadata. The browser renewable lease captures its exact
WebSocket port when acquiring the lease, so a successor cannot replace the old
lease's attempt ID/time/cause. Fatal classification, retry permissions and wire
protocol remain owned by existing AppHost/runtime code. Only local connection
metadata reaches recovery presentation; backend errors/payloads are not copied.
See [recovery details](chat-ui-architecture.md#recovery-technical-details).

Initialization failure cleanup retires the physical client but retains its local
diagnostic status as a snapshot fallback until the next attempt starts. This is
presentation metadata, separate from automaticReconnectBlock and never read by
the reconnect scheduler; factory cleanup therefore preserves the first failure
ID without creating another retry policy owner.

### MCP App Web/Electron host

`apps/workbench-web/src/mcp-apps` owns the executable MCP App view, independently authored against MCP Apps 2026-01-26. `contract` is a narrow owner-bound capability interface; `owner` translates to existing typed AppServer MCP methods and Composer untrusted additionalContext. `policy`, `sandbox`, and `bridge` share one authorization boundary for standard JSON-RPC and Hypernode's `window.openai` compatibility API. Standard transport contains only JSON-RPC fields; signed compatibility envelopes are consumed by the injected bootstrap before a standard SDK sees them. Conversation renders the lazy App surface outside the collapsed tool transcript; ordinary tools remain unchanged. Native and static HTML previews do not gain this capability.

The Host remains the sole owner of MCP execution, resource versions and canonical conversation history. View state is ephemeral, catalog reads are shared per active owner, iframe instances exist only near the visible viewport in a foreground conversation. No polling or per-frame React updates are added. Switching owner/generation invalidates old views and pending results; tool calls are never retried. Restored built-in App cards may share one read-only canonical-history hydration before retrying a denied resource once. A failed hydration is evicted so a later explicit open can retry; a successful hydration remains cached for that owner. History loading does not grant resource access, and external servers or other resource URI namespaces do not enter this recovery path. Only inline display and text messages/context are advertised in this version. Download, sampling, resources subscriptions, nested frames and elevated browser permissions remain unsupported.

Automatic height distinguishes content invalidation from a height-only response to the iframe viewport. A viewport-dependent layout (such as body min-height:100vh with margins) cannot turn each applied height into another content request. DOM mutations, intrinsic media/font completion and width changes invalidate measurement; the observer callbacks share a single scheduled frame and are disposed with the view. Explicit App size notifications retain their existing bounded bridge semantics. The outer view observes the actual iframe width and coalesces changed-width host-context notifications; unchanged width or height-only changes do not replay context or tool results, fetch resources or rebuild the iframe. Browser geometry checks wait for the scheduled iframe measurement to reach the parent after removing temporary controls before sampling their baseline; growth and shrink assertions keep their original bounds.

References: [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx).

The Headless gateway supplies an actor-owned [MCP App builder](mcp-app-builder.md).
It reuses the existing dynamic-tool channel and MCP host, with one managed store
for definitions/releases, CAS publication and immutable runtime revisions. Generated
handlers execute in bounded QuickJS workers, not Node's application realm. The
existing execution engines remain the history authorities; remote Hosts do not
inherit this local resource authority. Service capability negotiation controls
which conversations receive the authoring tool.

## Host Composer command adapters

Trusted Host connection providers may optionally own localized Composer command
declarations and an action adapter. This extends their client-side adapter role,
not their authority over Thread, queue, Replica or authorization. Registration
validates and freezes declarations; catalog snapshots expose metadata only.
The resident runtime projects an optional command port over its captured provider
and protocol. Each invocation rechecks profile/runtime ownership, acquires the
same provider instance and releases that per-call lease on success or failure.
Retirement publishes removal immediately and drains already accepted calls.
No command registry or asynchronous lookup of the selected Host is introduced.
See [Composer semantics](chat-ui-architecture.md).

### Codex subscription windows and extra credits

Account pooling preserves subscription percentages even when extra credits remain.
Verified usage `credits.has_credits` or `credits.unlimited`, without an overage cap,
permits an enabled account beyond a full subscription window. Window JSON persists
this optional fact without resetting utilization or changing credential ownership.
Successful upstream responses can update the credit fact; omitted headers retain
the latest observation. A real upstream429 explicitly removes that exception.
Unknown/exhausted credits, authentication errors, disabled accounts and retry
backoff retain the existing admission rules. Usage refresh owns later recovery.

### Codex model capacity retry

The Codex Host continues only a failed Turn whose native error code is
`serverOverloaded`. It starts an empty continuation after 1, 2, 4, … seconds,
capped at 120 seconds between attempts. A successful or different failure ends
the sequence. New user input, an active Turn, or queued input takes precedence;
the Host checks the latest authoritative Turn before starting a retry and keeps
the native subscription while a retry is pending. An unconfirmed `turn/start`
outcome stops automatic retries so the Host cannot duplicate execution.
An older Host without the `opencraft/capacity-retry` capability is supported by
the active Conversation runtime using the same delay cap and empty continuation.
When the Host advertises version 1, the client cancels its fallback timer and
leaves retry ownership with the Host.

### Connection conformance and external waits

An independent observable specification replays deterministic event traces through
ConnectionLifecycleOwner, Runtime/RPC and Runtime/RPC/AppHost. Compare phase,
error presence and timer ownership after every event, including suspended clocks,
late completions and retired timer callbacks. A seed and event prefix reproduce a
failure. This bounded refinement check does not prove all implementation traces.

Revoked service assembly stops waiting for external acquisition or dial. Failed
bundles detach shared fields and registry claims before async cleanup; each late
acquired resource disposes itself without touching successor fields. Transport
factories must provide independent generations. This does not declare an
uncancelable external operation physically complete.

ReplicaClient storage is a disposable paint cache, separate from source authority.
A configurable five-second storage deadline switches that client instance to
source data without further cache writes and exposes cacheError. Accepted writes
retain their physical serial lane; timeout does not cancel them. A late cache
completion cannot publish or reenable writes. A settled load or commit rejection,
including invalid cached state, takes the same nonfatal source-authority path and
queues one best-effort removal of that client row for a later instance; timed-out
I/O is never raced by repair. clear still rejects when cache health or completion
cannot be established. Source protocol and authority-storage errors remain errors;
this policy never skips an authority transaction or replays a mutation.

Physical AppHost startup, close and reset barriers remain serialized. Their callers
have a twenty-second admission deadline: expiration returns a classified manual
failure instead of an endless reconnect, without releasing the physical barrier
or starting a competing generation. After the dependency actually settles, an
explicit retry can be admitted normally. This is bounded failure, not a claim
that an unavailable external process has recovered.

Connection admission bypasses the per-host frame I/O queue and enters the slot
owner directly, so a hung prior close/send cannot prevent its deadline from
starting. Frame sends retain their ordered queue and revalidate lease identity.
The default twenty-second slot budget precedes the bridge's thirty-second wait
and Runtime's sixty-second attempt budget.

`smoke:connection-process-recovery` exercises the complete built/installed Web UI
with a separate synthetic physical Host process. Three actual child-process
restarts while Chromium is frozen must recover after resume, retain the real
Composer draft, and reconnect on page reload without starting a Thread or Turn.
Set OPENCRAFT_LIFECYCLE_WEB_ROOT to that artifact's web directory. This checks
real process/network/browser composition with synthetic protocol data; it does
not claim live-user, real-model or physical-mobile acceptance.

The Electron Main and Preload bundled together use `opencraft:get-window-fullscreen`, `opencraft:window-fullscreen-changed` and `opencraft:set-window-appearance` for internal window projection. The renderer methods, payloads, admission checks and window lifecycle are unchanged; these channel names do not alter persisted identities or the AppHost transport.

### Shell content-plane shape ownership (2026-10-22)

The theme supplies `contentCornerRadius`; Shell projects it through the shared
`data-app-shell-content-plane` role on both the main reading Frame and the
RightPanel body. A conversation, browser, file viewer or empty launcher does not
choose its own pane shape. The tab strip/header stays outside that content plane.
Existing overflow on each plane clips child paint and pointer hit testing at the
same rounded border, and the preview upper-lip shadow follows that border.

A content plane is distinct from the animated reveal aperture and the tool's
layout viewport. Its shape never changes the viewport dimensions, surface
identity, scroll owner or control lease. Main/preview and regular/maximized modes
consume the same theme token; themes without that capability keep zero radius.

### Operation acknowledgement

Thread action acknowledgement and catalog revalidation have separate lifetimes.
Rename/delete UI settles after the native write; refreshing the complete catalog
continues in the background and cannot reinterpret a confirmed write as failure.
Deletion reports pending,
acknowledged or failed states through the existing notification owner. Conversation
menus are non-modal: the dialog they open owns the sole focus/pointer lock, which
must be released on confirm, cancel and Escape without editing body styles.
Turn interruption remains Thread-owned, coalesces pending requests for the same
Turn, and projects `interrupting` into Composer progress. Failure restores the
control and reports an error only for the still-matching visible owner.


Conversation resources use the same core Collaboration message/idempotency/handoff authority as Actor channels. Stable references, bounded untrusted native-history context, explicit model delegation and the existing Host queue are documented in [conversation interoperability](architecture/conversation-interoperability.md). Renderer routes never supply execution identity.


### Token usage collection controls and account presentation

The optional Token usage Settings view consumes the trusted first-party Host
query capability. Its collection control appears only when the current snapshot
explicitly declares `canConfigure`; the Host requires the current instance
administrator and accepts only a boolean `enabled` on its configure method.
Collection and view lifecycles remain independent. Pausing retains acquired
amounts and exposes incomplete coverage; re-enabling admits only new turns.
Account scope changes remount the presentation before reusing any snapshot,
and pending controls fence their late effects to the original generation. The
Host remains the authorization authority; presentation scope never grants access.
Number/date formatting follows the app locale, with Chinese and English copy
using the existing Settings bilingual presentation convention.

The usage view retains its current content height while a filter or drilldown query is pending. Returning from a conversation restores the summary cursor, scroll position and initiating row focus within the existing Settings viewport; it does not create another scroll owner. Account changes still remount and clear the previous principal’s snapshot.

Each physical TokenUsageQuery owner retains its two immutable timezone/date formatters. Query filters and authority remain per request; no actor-keyed formatter or completed-response cache is introduced. This bounds repeated ICU allocation during long-lived read workloads.

Usage snapshots may include summary.threads, the distinct conversation count over the complete authorized filter intersection, independently of the detail page. Older Hosts may omit the additive field. The view highlights settled tokens, keeps provisional/pending/system/unknown amounts separate, and presents model aggregates as readable numeric rows as well as filters.

The Token usage view is a managed optional built-in (`opencraft.token-usage`) on Web/Electron. Its manifest is discovered without importing the dashboard; activation contributes the Settings page and deferred platform renderer through the existing supervisor. Disabling withdraws those contributions and preserves the Host ledger and collection configuration. Persisted installation intent is owned by ExtensionManager; no second lifecycle or metering state is introduced.

The physical Token ledger reuses parameterized SQLite statements in a SQL-shape map bounded to 128 entries, avoiding per-event native statement allocation. The database owner still closes the connection; exact allocations, transaction boundaries and authorization are unchanged. No actor-keyed or completed-result cache is introduced.

The read-only usage query owner also bounds native prepared statements to 128 SQL shapes and lends only its prepare port to team projections. Manual bulk iterators close before snapshot rollback on success and exceptions, allowing later reads to reuse that physical owner. This is statement reuse, not a completed-response or per-person cache.

Token metering has its own managed `token-usage.sqlite` physical transaction owner
and an atomic, read-only import from former shared Host tables. Sender/queue
storage remains independent; no collector writes two ledgers. A metering lock or
failed open cannot block native input admission, and unpersisted acquisition
gaps mark returned coverage partial. Query workers have a 64MiB old-generation
and 4MiB young-generation limit; scan failure rejects bounded reads and lazily
restarts the worker. Source rebuilds select only the four fields they consume,
reducing allocation without changing ordering or exact arithmetic. The limits
and narrow row shape require measured resource/latency acceptance, not just
successful compilation.


#### Token usage people presentation

The optional dashboard selects a person from the existing authorized, paginated people usage view. The Host decorates only authorized team people rows with current human Actor display names through its existing identity-directory port, then rechecks the original request authority before delivery. Names are presentation metadata, never a participant key, identity binding, allocation weight, or ledger column. The same signed paging/date/model intersection applies when browsing people; choosing a row returns to that person's allocated conversation totals, and clearing the filter restores the team view. Self queries do not resolve or expose other people's names. Missing directory entries remain explicitly unknown; no enterprise directory or statistics account system is introduced.


Unchanged native metering metadata is idempotent at the persistence boundary: reconciliation compares stored execution/completeness evidence before rebuilding, and repeated rollout references or metadata cursors avoid writes. Effective participant completeness can remain false due to unresolved admissions without triggering polling rebuilds. Fact and admission mutations retain their own projection updates; changed terminal/response evidence continues through the normal reconciliation transaction. This does not alter source identity, equal allocation, database schema or query authorization.


Dedicated metering store v2 adds a thread/date index so filtered thread/turn reads seek the selected thread before its date range. This changes query planning without changing allocation, snapshot revisions, query authorization or the former Host schema. The managed database migration and complete target validator own index creation; repeated opens do not recreate it. Thread/turn-filtered team reductions materialize their selected turn set before grouping, preventing grouped plans from bypassing the thread index; unfiltered projection reads retain their original path.


The bounded native usage replay reports each oversized line once through
`onOversizedLine(mayContainFact, bytes)`. This observation cannot invent a usage
gap: ordinary output remains a skipped non-fact, possible facts retain the
existing missing-source reconciliation, and the committed cursor resumes after
the complete line. The observer has one typed call shape, never a second
object-shaped compatibility invocation.

### Native history read fault boundary

Codex Core history reads (`thread/read`, `thread/turns/list`, `thread/items/list`) use bounded, individually initialized read-only native sockets with capped concurrency and queue depth. They do not subscribe, resume, run tools or own the Core process. An oversized response or read socket failure resolves only its originating RPC; it cannot publish failure on the shared execution/subscription socket. Payload limits stay bounded, with a non-retryable `HISTORY_RESPONSE_TOO_LARGE` response for oversized pages. Host queue/Goal/tool-configuration resumes explicitly exclude history. Capacity retries inspect one summary turn, and schedule inspection scans bounded summary pages, retaining unknown when the target is unavailable. This is a failure-domain boundary, not tenant data separation or process-level resource isolation.

### Execution observation and bounded history delivery

The shared schedule owner tracks plans and occurrence bindings, while native
execution events and engine receipts supply outcomes. Codex/DSH/Pi implement the
same port with native-specific recovery; Pi now declares schedules and paginated
history. Per-conversation bounded flights keep slow admissions from holding peer
completion. History RPC serialization fails oversized results within the request
without retiring the shared connection. Configuration snapshots are confirmed
only after native installation in each adapter. The detailed ownership and
limits are in [execution ownership](execution-ownership.md#bounded-history-replies)
and [session capabilities](session-capabilities.md).

### Connector HTTP recovery and consumers

Headless connector reads use the selected browser server context. Polling owns state and pending approvals; a successful read only invalidates managed configuration when supported definitions or instances change. Management views retain and release their Host subscription independently of background connection/approval synchronization. List reads coalesce while in flight and support cancellation; a configuration invalidation during a read schedules at most one subsequent read. Authentication failure revokes earlier requests across Hosts and backs off recovery; stale rejections cannot invalidate a newer successful response. Origin/protocol or resource denial clears only the affected Host and waits for an explicit retry. Mutations are never automatically replayed.
