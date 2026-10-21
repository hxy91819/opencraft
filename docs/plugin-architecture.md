# OpenCraft Extension Platform 与插件内核架构

> 开发入口：[当前插件边界、API 与贡献路径](extension-development.md)。本文同时保留目标拓扑和迁移历史；目标设计不是已实现 API。当前类型以 `packages/extension-contract/src/index.ts` 为准，示例以 `examples/extensions/hello.mjs` 为准。

GitHub上游迁移要求公开Application/Headless/Relay通过产品装配端口接入下游产品/企业身份，
不能无条件导入私有插件；移除配置中的必需身份提供者必须保持拒绝，核心Actor、
成员与资源授权不下沉到产品。当前拆分尚在实施，已知直接依赖与验证不变量见
[upstream transition](upstream-transition.md#boundary-migration-record-and-remaining-review)，不把菜单开关当依赖隔离。

Web supervisor 通过 `WebWorkbenchSupervisorOptions.serverExtensions` 接收可信工厂，
仅在服务端工作台接入时加载；通用默认列表为空，不把 Headless 等同于企业身份。
原有 ExtensionSupervisor 继续拥有激活、失败回滚、贡献撤销和释放；产品不另建账户
注册表或替换 credentialScope/readStateScope。构建 owner 可通过
`OPENCRAFT_SERVER_EXTENSIONS_ENTRY` 显式指定本地 JS/TS 装配文件（相对 OpenCraft
workspace root）；缺失文件或 URL 拒绝构建，无配置时不探测下游目录。
该选择只改变装配入口，不证明下游产品或全部私有实现已脱离公开依赖闭包。

客户端本地缓存只消费核心 `ClientPersistenceScope` 的 namespace、固定 Host 会话记忆
分区及同步变更通知，不读取下游产品 region/profile/credential 字段。产品提供只读投影，
保留既有持久键及账号撤权时序；应用卸载仅释放订阅，不旋转持久 namespace。
此端口不是 Actor、readStateScope 或远端授权证明；资料刷新可改变记忆分区，不能据此
清除输入草稿。

`@opencraft/client-product` 提供可信客户端产品生命周期：Application 在创建 Cordis 和
应用元数据之前调用可选 `bootstrap`；Supervisor 创建唯一产品 session，先借用缓存端口，
再按产品返回顺序经既有 ExtensionSupervisor 激活，随后等待可选 preflight，最后启动
配置 Host。session 贡献可选 builtin 描述，仍由现有 ExtensionManager 读取用户持久意图。
启动失败逆序回滚；正常卸载先释放扩展和缓存订阅，再释放产品 session，不另建生命周期管理器。
Bot 管理通过 session 的可选 `botManagement` 声明 provider 准入与空态提示；省略准入
表示所有启用 profile，显式空列表表示不开放候选。核心按目录实际能力选择唯一管理
目标，不修改当前聊天 Host；产品声明不是权限授予。Vela 在自己的 client plugin
保留原云端专用策略，核心不再解释私有 provider ID 或账号语义。


默认 Web/Electron 入口不选择私有产品，保留本地与远端 Host；本地缓存按服务器和可选
平台账户的不透明 scope 分区，明确 null 不回退旧 identity。没有账户贡献的 local 分区
仅属于本地客户端，不声称代表服务器登录身份。产品若拥有凭据代次，须提供自己的
ClientPersistenceScope，不能用本地 fallback 取代凭据撤权。
构建 owner 通过 `OPENCRAFT_CLIENT_PRODUCT_ENTRY` 显式选择本地装配文件，校验方式
与服务端扩展入口一致，无配置不探测下游。产品登录回调、账号创建、平台/Hermes
装配、嵌入预检和 Collaboration 描述归 `plugin-lightvela-client`；产品构建入口由下游
提供。客户端及 Collaboration 私有包的实现、锁和测试由下游产品工作区拥有，核心不再安装
这些私有包；产品保留原包名与导出。平台/Hermes、账号SDK、三个私有共享快照
和原生产品源码也归下游；核心保留通用接口与原工作台。私有测试随owner迁移，混合
测试保留通用断言；云桌面provider三条原依赖限制由产品默认检查执行。显式私有构建
原生别名和smoke工具仍在过渡，不能据此宣称全部拆分或来源核实已完成。

Web构建预设由可信本地Vite配置组合：核心导出`createWorkbenchWebConfig`，拥有通用
能力和平台约束；下游持有私有功能选择、Next环境定义、SDK去重、允许域名、开发代理
身份与产品outDir。产品名不隐式选择私有行为；产品runner使用核心自己的Vite版本及
原预览桥、noVNC补丁、真实构建图兼容检查。私有包边界检查与发布命令也归产品，
公开核心不再提供指向下游Web目录的CLI别名。原生Bot仍使用同一产品配置及原内存
打包契约，不从远端获取执行代码。此归属变化不等于来源授权已核实。

下游产品的嵌入 element、Root、账号/物理连接 adapter 及产品集成测试由下游
`products/<product>` 拥有。构建通过 `OPENCRAFT_EMBEDDED_PRODUCT_ENTRY` 显式选择本地文件，
默认公开 Web/Electron 不附带私有嵌入图；嵌入专用 target 未配置入口直接失败。
产品构建保留原 loader URL、element API、绘制/连接与释放时序。通用绘制、发送、
音频、连接和面板 helpers 仍属于核心，不复制组件、不以空实现代替完整客户端。

普通中继的可部署边界见 [relay deployment](relay-deployment.md)：`apps/relay-server`
独立启动，`plugins/relay-connect` 可选出站连接；企业身份 验签、JWE 与员工字段映射属于
下游产品的企业插件，通用 Principal/成员/角色/撤销属于核心包。实例只接收固定 issuer、
公钥、实例与 Origin 范围的短期凭证；中继注册权不产生业务管理员权限。启用核心准入后，
认证插件缺失保持拒绝，不能以停用插件绕过成员授权。

### 服务端请求身份端口

通用 HTTP/WS 网关只消费 `@opencraft/app-host-server` 的受信装配端口
`WorkbenchRequestIdentity`：`admissionStatus` 返回准入结果，`connectionContext`
提供已验证的 `TransportSubmissionContext`（返回 null 拒绝连接），`handle` 在核心
准入之后处理身份来源自己的 HTTP 路由。该端口不是 Renderer 可提交的身份，
也不是浏览器扩展安装 ABI。未知网关配置项及缺少方法的身份端口在启动时拒绝。

企业身份 插件拥有签名、解密、时钟容差、员工 sender 映射及旧 HTTP 别名；通用网关
不导入 企业身份。静态文档探针使用 `/__opencraft_access/admission`，无准入配置的匿名
部署也能返回 204；启用成员校验、Actor 约束或配置的身份提供者时仍须通过相应校验。
未注册的 `/__opencraft_*` API 返回 404，不能回落成成功的 SPA HTML。

断言验证器默认只对精确的核心 GET 准入探针读取原始方法/路径头。产品旧worker
兼容由可信Headless composition的`relayAssertionOptions.additionalAdmissionProbePaths`
显式提供，relay-connect只转交这份编译装配，不从私有relay JSON或HTTP读取路径列表。
验证器校验并快照额外路径；POST、query或未声明路径不做转译，签名/Host/Origin/
实例/期限/nonce和成员授权照常生效。受管站点声明自己的旧别名，核心不内置企业路由。

所有 WS 入口同时遵守核心准入与连接证明。证明缺失、过期或提供者抛错拒绝升级，
有限的证明期限必须是有效数值。已建立连接取成员证明与上下文期限的较早值，
到期先撤销消息接收再关闭；核心继续拥有 Actor、成员撤权和资源授权。
Headless 通过可信服务端 composition 创建身份适配器；受管站点的企业参数及插件实例化
位于下游入口。企业身份 实现、专属文案与集成验证由下游拥有，公开 workspace 不依赖它。
核心 Actor/Relay 验证使用合成签名身份提供者，保留准入、撤权和持久化覆盖；企业身份 原有
签名及员工元数据验证随产品运行。下游产品客户端其余依赖仍待隔离，不称完整拆分已完成。

### Relay 启动装配

`relay-server/application` 拥有通用配置校验、路由/签名、Hub、TLS 与监听生命周期。
可信启动代码通过 `createIdentity` 工厂提供 `IdentityProvider` 与 `close`；
配置只声明认证 origin、issuer、签名 key 和允许的 provider，不加载配置指定的模块。
配置了认证却缺少工厂、声明外 provider、未知字段或不完整 TLS 均拒绝；
默认 CLI 可以运行纯中转 Hub，但不能把缺失的网关提供者当匿名继续。
启动回滚与幂等退出均释放 Hub 状态锁、监听和身份资源。

下游产品拥有旧企业配置转换及私有插件创建，并通过打包函数的 `relayEntry`
显式选择编译入口。核心默认不探测父目录或引用产品；`packageWebServer` 与
`packageRelay` 的编译期入口参数不是 HTTP/浏览器可安装插件接口。
企业身份 已迁往下游；本边界仍不等于下游产品客户端私有目录已经全部迁出。

> 状态：R3 已落地 Trusted V1 内核；生态与 Restricted Channel 仍为 Proposed  
> 架构修订：R3（Extension-first 商业 Workbench）  
> 适用平台：Vite Web、Electron、Expo iOS/iPadOS、Expo Web  
> 本文同时包含已实现内核与后续公共扩展边界；以“实现账本”为准判断当前能力。

### 当前实现账本（2026-09-04）

已实现并进入仓库质量门：

- 随标准 Headless 分发的 `opencraft.account`：每部署独立本地账号的服务端凭据插件，拥有密码策略、验证及凭据版本证明；通过核心提供的窄存储端口保留既有账号库，不依赖统一账号中心。核心仍拥有浏览器登录态、自然人绑定、成员与资源授权，停用插件不能绕过准入。由私有配置启用，非浏览器扩展安装；见[服务器登录](server-authentication.md#自部署账号插件)。

- 可信产品装配可提供外部身份 provider、账户入口和设置页；凭据验证、员工目录与
  企业界面由下游插件持有，核心保留主体绑定、成员与资源授权。
  详见 [外部身份与消息来源契约](./enterprise-authentication.md)。

- `packages/extension-contract`：renderer-free manifest V1、activation identity、Command、Settings、
  location-neutral View、Navigation、Sidebar Catalog、Settings Page、Workbench Surface、双明暗
  语义 Theme palette 与 disposer API；
- `packages/extension-runtime`：每 Activation 一个 Cordis Fiber、统一公开贡献快照、预检后单次发布、
  内部贡献 prepare/commit/逆序 rollback、generation fence、串行 activate/deactivate 和完整 dispose；
- 最小 Settings Value Store 已落地：只支持当前 Profile，只读写 manifest 已声明字段，提供
  default、运行时校验、`get/set/reset/subscribe`；Web 使用独立 IndexedDB Adapter；
- WebSocket Host provider 已从匿名 Cordis plugin 迁移为 `vela.websocket-host` first-party Extension；
  provider owner 是 activationId，卸载会先撤出 provider，再等待在用 Host lease 归还；
- `vela.theme-pack` 是第二个真实 Extension 切片：插件只登记 accent/ink/surface/contrast 与
  diff/skill 语义色，应用根统一派生完整 Token；选择被持久化，卸载时原子回退到内建中性主题；
- Theme palette 现在还可选择性声明 `surfaces`（window/sidebar/panel/input/popover 的
  `#RRGGBB` 色值）、`material.window`（translucent/opaque）和
  `material.elevation`（soft/flat，主工作区表面阴影）。没有覆盖的值继续由原算法生成。
  注册层拒绝 CSS/URL、未知选项和不完整的明暗色板，并冻结嵌套数据。
  Web/Electron 已消费这些字段；Expo 动态主题不在本轮范围。完整链路见
  [Theme surfaces and native appearance](./platform-architecture.md#theme-surfaces-and-native-appearance)。
- 场景测试覆盖成功激活、激活失败零残留、内部 commit 中断回滚、旧代 API 拒绝、重激活代际、
  平台筛选、Theme palette 校验和真实 WebSocket provider lease retirement。
- Workbench 已采用 Obsidian 式 `entry -> semantic View -> host placement`：插件不再用一个
  `View.location` 同时表达侧栏按钮、设置页和物理容器；Sidebar 只消费声明式入口和目录，
  应用级导航事务统一拥有 URL、Back/Forward、激活态与卸载回退。

已实现第一阶段的 `module-url` Installation、启用意图持久化、刷新恢复、运行代际和声明式设置
页面，以及自包含 ESM 摘要固定和更新失败恢复。尚未实现：签名包/依赖 lock、惰性 activation event dispatcher、Extension Workshop、
Marketplace、restricted host/permissions，以及把 Chat/Panel/Composer 的所有既有内建项迁入
Supervisor。`internal.register()` 只供 first-party 适配器使用，不属于稳定社区 ABI。

Settings V1 刻意不包含 global/host/workspace 多层 scope、自定义 migration、远端同步或 Replica。
插件卸载只撤销 schema，不删除持久化值；重新安装同一 contribution 后原值重新生效。

### 插件平台补齐进度（2026-09-22）

- Embedded Chat 在同一 Application 内将语音、Collaboration、Bot Chat/Management 呈现和 Terminal 面板模块放入延后启动队列，首屏可用并完成 `show()` 的可见帧后才按依赖顺序激活；Full Workbench 默认保留 eager 策略。必需 Host/provider、账户身份和 Terminal 协议服务不后移。队列不拥有第二份扩展 registry；销毁先撤销未完成 import 的工厂 scope，再排空已开始激活，最后释放其借用的服务。该计划不是通用 activation event dispatcher。
- 扩展管理在普通 Settings 的“插件”页与 Skills 的“扩展”Tab 共用同一个 `ExtensionLibrary`。应用通过 `PlatformViewRegions.ExtensionLibrary` 提供内容；不受技能 Host 选择影响。目录只读合并 Supervisor、Manager 与公开贡献，区分内建/安装、启用意图、运行故障和当前版本仍运行时的操作失败。列表搜索/来源筛选，详情复用 Manager 操作；关键内建项不开放停用/移除，可选内建项支持启停，URL 安装仅开发者模式。Settings 导航向普通用户展示入口，不要求开发者模式；同时在有 Host 和无 Host 的工作台传入应用级 Supervisor 与 Manager，列表不依赖当前技能 Host。旧的 URL-only 设置实现已移除，避免漏掉内建项。
- Web bootstrap 保留 WebSocket 基础连接扩展为关键依赖；主题、语音、模型管理、产品接入等第一方扩展使用可选激活，失败记录在 Supervisor，继续其他扩展。语音、Builtin Agents、HyperNode、Bot Chat/Management 的动态 import 和工厂也通过 `loadOptional` 有界执行；平台账户服务模块仍属于 Application bootstrap 的必需依赖。
- Collaboration 改为可管理的可选内置扩展，通用 Web 默认停用；由 `ExtensionManager` 有界加载并激活，启停意图与用户安装扩展共用持久化仓库。停用时不加载实现或注册导航；产品初始默认值不覆盖已有用户选择。内置来源只允许启停，随应用更新，不开放 URL 更新/移除。详细产品边界见 [Collaboration Workspace](../design/collaboration-workspace.md#扩展发现与启用)。
- 持久化产物独立存入 `system/artifacts/<sha256>`；安装集合只保存引用，CAS 成功后才切换安装指针，候选写入失败保留旧指针。缺失产物不自动联网换版本，插件提示显式重新加载修复。旧产物暂时保留，后续 GC 不影响正确性。
- 安装记录的公共规范化入口为内嵌产物补齐相同 SHA-256 的 `artifactRef`；显式引用与内嵌产物不一致时拒绝该记录。写入返回、当前内存快照和持久化通知重读使用同一规范，旧内嵌格式无需重写数据，失败更新也不会因通知时序改变原安装身份。
- Module Loader、`activate` 工厂与每个内部 adapter prepare/commit 等待默认各 15 秒；subscription/internal disposer、rollback 与 command drain 默认每次 5 秒。超时撤销旧 API，继续剩余清理；工厂或 commit 迟到返回的 disposer 仍被调用，退休后命令结果不再成功返回。不隔离 trusted 模块同步死循环，也不能强制终止任意插件自行创建的副作用；prepare 必须无副作用。
- Supervisor 退出从首次 `dispose()` 同步关闭激活准入并撤销尚未交接的 activation API 开始。所有退出调用共享同一个清理结果，包括失败；先排空已接纳的 activate/deactivate，再逆序释放已激活扩展，使等待中的消费者仍可借用提供方完成回滚。工厂和内部 commit 跨等待返回的 disposer 必须先归入事务，再检查退休状态；不能因 API 已撤销而丢失资源，也不能重复清理。已开始的清理失败会向退出调用传播，普通激活失败不等于退出失败。退出后 `deactivate` 返回 false，optional module 的迟到成功或失败不能重新发布描述符；动态 import 本身不由 Supervisor 强制终止，工厂和 commit 仍受上述原有期限约束。
- Installation Manager 的首次退出也同步关闭准入；已进入的安装/更新操作在既有期限内排空，排队与后续操作在执行 loader 前拒绝。随后只逆序退休本 Manager 管理的定义，不关闭共享 Supervisor 或无关内建扩展。所有退出调用共享清理结果，逐项失败不跳过其余定义，也不能被吞为成功；普通操作失败与资源清理失败分开。保存的 enabled 意图不因 Application 退出改变，新 Manager 可正常恢复。
- 公共 `OpenCraftExtensionDefinition` 只引用公共 API，第一方 Theme Pack 已消费；`api.signal` 在失败或停用时先于清理 abort，运行中的插件可继续登记资源 subscription（贡献本身仍只在激活期登记）。自包含示例见 `examples/extensions/hello.mjs`，测试覆盖注册导航、调用公告与卸载中的待决结果。
- Manifest V1 的格式解析保留合法的未来 `apiVersion`，当前 Supervisor 在执行 `activate` 前单独检查 API 与平台兼容性。未来 API 的安装记录不会被当作损坏记录删除；Manager 投影 `incompatible`，保留启用意图及配置。当前仅支持 API 1，不承诺旧 API 永久兼容。
- `reload` 与同 ID 重新安装共享替换流程：候选成功激活且保存成功才更新安装记录；失败重新激活本进程保存的旧定义，使用新 activationId，旧安装版本和 enabled 保持不变。已停用插件重新安装保持停用。
- 更新恢复不回滚插件自行产生的副作用。新 module-url 安装随记录持久化自包含 ESM 与 SHA-256；恢复先校验保存内容，不请求源 URL，只有显式 reload 才下载候选。模块上限 512 KiB，静态/动态 import 与 import.meta 在执行前拒绝，要求作者 bundle 私有依赖。旧的未固定记录仍走原 URL 加载，显式更新后固定。摘要用于完整性而非发布者身份认证；可信代码不是沙箱。完整版本范围、第一方隔离、公共接口扩展与客户端验收仍在建设；公开范围与未完成项见本文第14节，当前可执行贡献路径见 [Extension development](extension-development.md)。

## 1. 结论

OpenCraft 是桌面/Web/移动 Workbench。它的公开生态和用户心智应当以
Plugin/Extension 为中心：安装、启用、设置、命令、面板、渲染器、Workspace 集成、升级和
卸载都属于稳定的 Extension Platform。

Agent Capability 是 Extension 的一个可选 Contribution，也是 AppServer/MCP 能力进入模型
的适配层；它不取代传统插件 API。完整 Agent 调用语义由
[`agent-capability-fabric.md`](./agent-capability-fabric.md) 定义。

OpenCraft 仍然不能把 Cordis 的 `Context` 直接作为公共插件 API。

最终方案吸收五套系统各自最强的一层：

- **Codex**：AppServer 负责插件目录、安装、启用、策略和可用性；客户端只激活已编译的
  first-party bridge，并把第三方 App UI 放入沙箱；
- **Obsidian**：插件、View 和子组件都有明确的 `load/unload` 所有权，注册操作自动归还
  disposer，开发体验非常好；
- **Chrome Extensions**：manifest-first、稳定 API namespace、package-contained code 和按需
  background lifecycle；权限与 isolated world 仅作为可选 restricted mode 的参考；
- **Firefox WebExtensions**：manifest-first、能力授权、执行域分离、受限 API 和消息桥；
- **Cordis**：作为 OpenCraft 内部的依赖注入、激活图、Fiber 生命周期和逆序清理内核。

一句话定义：

> **Cordis 是 OpenCraft 的内部扩展内核，不是安全沙箱、第三方 ABI 或 Agent 能力协议。**

公共插件以版本化 `OpenCraftExtensionApi` 为受支持边界。可信内建功能可以直接使用 Cordis；
用户明确启用的本地/Workspace Extension 可以采用 Obsidian 式可信执行。独立
ExtensionHost、Electron utility process、远端 Host 或 sandbox UI 是可选的故障/安全隔离
策略，不是所有插件的前置条件。

若发行渠道启用 Restricted Policy，Extension manifest 才申请安装级权限上限。普通可信
Extension 可以不启用细粒度权限 broker。无论插件采用哪种信任模式，Agent-facing
Contribution 仍不会因为安装或激活而自动进入模型上下文。

主体协作的目标设计还遵循[核心与插件边界](architecture/actor-collaboration.md#核心与插件的边界)：主体、授权和 Hub 分发由必备核心拥有；身份来源、执行引擎与通信渠道由插件适配。插件安装权限与主体对目标资源的权限分别建模，可信执行模式不意味着调用主体获得额外资源权限。身份或渠道插件卸载不能关闭核心授权检查；目标资源的最终校验、延后执行与撤销约束继续有效。该边界不表示现有插件机制已实现主体准入或多租户隔离。

面向开发者的一句话定义是：

> **插件经显式贡献接口接入，由统一的激活与卸载生命周期管理资源。**

这不会推翻现有的多 Runtime 设计。OpenCraft 仍然保留多个独立 Cordis Context；新增的
`ExtensionSupervisor` 用一个 Contribution Broker 跨域登记贡献，并把所有 disposer 挂到
同一个插件 Activation Fiber 上，从而做到“一次激活、原子贡献、一次卸载、完整清理”。

## 2. 客户端扩展边界

插件目录、安装和启用状态属于 Host/AppServer；客户端 bridge 按可用性惰性激活。
内部 registry、主题 factory 和编辑器扩展登记不构成第三方任意代码执行边界。
外部 App 内容经独立 sandbox、CSP、资源代理和主题/尺寸 RPC 呈现。

客户端贡献使用 manifest 身份、命名空间和由激活 owner 持有的 disposer；停止激活
按生命周期回收。命令、View、编辑器、Markdown 与设置贡献继续使用各自 registry，
统一 SDK/activation 编排不代替这些领域 owner。

明暗偏好、色板、代码主题、字号和动效是独立设置。system 偏好才订阅系统主题；
平台订阅由根服务持有，缓存和重复注册需显式处理。

现有 AppServer Plugin source/catalog/install/policy/interface 字段由生成协议定义；
客户端 Extension 与该原生协议的区别见下一节。当前 SDK、manifest 与安全边界
的实现状态以本文前述实现账本及后续正式契约为准。

## 3. 先区分两种“插件”

Codex AppServer 的 `Plugin` 与 OpenCraft 客户端的 `Extension` 不是同一个概念：

| 概念 | 权威方 | 典型内容 | 是否能改 OpenCraft 主界面 |
| --- | --- | --- | --- |
| `AppServer Plugin` | 某个 Host/AppServer | Skills、Hooks、MCP、Apps、提示词、远端能力 | 不能直接改；通过协议事实和沙箱 App 呈现 |
| `OpenCraft Extension` | OpenCraft Application/ExtensionHost | Command、View、设置、资源处理器、Composer provider | 只能通过声明式贡献点或受信任内建 renderer |

一个发行包未来可以同时提供两部分，但目录、安装记录、执行位置和权限必须分别建模。
上游 `PluginSummary` 不能被误当成客户端可执行模块清单。

现有协议已经包含：

```text
PluginSource = local | git | npm | remote
PluginSummary = install/enabled/policy/availability/interface
PluginInterface = metadata/capabilities/icons/screenshots/prompts
```

因此 OpenCraft 不再发明一套与 Codex 冲突的 marketplace/install 协议。它增加的是客户端扩展
manifest、贡献协议与执行宿主；上游目录通过 adapter 投影进统一的插件管理页面。

## 4. 第一性原理

### 4.1 安装、启用、解析与激活不是一件事

插件生命周期至少包含：

```text
discovered
  -> installed
  -> resolved
  -> activating
  -> active
  -> deactivating
  -> inactive

任何阶段 -> failed -> quarantined -> retry/resolved
```

- `installed` 只说明产物可用；
- `enabled` 是用户/组织策略；
- `resolved` 说明版本、依赖、平台和能力请求都可满足；
- `active` 才说明代码已经运行且贡献已经提交；
- `quarantined` 防止启动崩溃循环。

### 4.2 插件、Activation、Contribution 与 View 必须分离

- Plugin/Extension 是稳定发行身份；
- Installation 是某个 Profile/Host 上安装的版本；
- Activation 是一次可失败、可销毁的运行实例；
- Contribution 是 Activation 登记的命令、View 或 provider；
- View 是某个 Renderer 对贡献的呈现，不拥有 Activation。

推荐身份：

```ts
export type ExtensionId = `${string}.${string}`;
export type ContributionId = `${ExtensionId}.${string}`;

export interface ExtensionInstallationKey {
  readonly profileId: string;
  readonly hostId: string | null;
  readonly extensionId: ExtensionId;
}

export interface ExtensionActivationKey extends ExtensionInstallationKey {
  readonly activationId: string;
  readonly generation: number;
}
```

同一个远程 Host 上的插件与本机插件不是一个 Activation。`activationId` 是每次激活的
不透明随机身份，`generation` 表示同一激活内的授权/通道代次。迟到消息必须同时匹配
两者，不能写入新实例。

### 4.3 执行位置、权限和呈现位置是三条正交轴

一个插件可以在 SSH Host 执行命令、在本机 ExtensionHost 维护状态、在 iPad 的 WebView
呈现 UI。不能用一个 `hostId` 或一个 `platform` 枚举把三件事压在一起。

### 4.4 所有状态必须有权威方

- AppServer 插件安装、远端 Hooks/Skills/Apps：Host 权威；
- OpenCraft 本地扩展启用、授权、quarantine：Profile 本地权威；
- 插件 View 布局与打开状态：Renderer View Checkpoint；
- 插件业务事实：只能由明确的 Domain/Host 权威产生；
- TanStack Query：缓存 marketplace/install 等异步查询，不拥有 Activation 或实时状态机；
- Replica：不接受插件任意 key/value 写入。需要同步的数据必须先定义领域 namespace、
  schema、权限和迁移策略。

## 5. 目标拓扑

```text
ApplicationSupervisor
├─ HostRuntimeRegistry
│  └─ HostRuntime(hostId)
│     ├─ AppServerClient / Resume / Replica
│     ├─ HostPluginCatalogPort
│     └─ HostCapabilityPort
├─ RendererRuntime
│  ├─ CommandRegistry
│  ├─ WorkbenchResourceRegistry
│  ├─ ChatContributionRegistry
│  └─ ComposerContributionRegistry
├─ BrowserRuntime
├─ QueryClient
└─ ExtensionSupervisor
   ├─ CatalogProjection
   ├─ InstallationStore
   ├─ AccessPolicyStore (optional for restricted channels)
   ├─ ActivationGraph
   ├─ ContributionBroker
   ├─ TrustedBuiltinRuntime ── Cordis Fibers
   ├─ TrustedExtensionRuntime ── Cordis scope / local extension host
   ├─ RestrictedExtensionHost (optional) ── isolated realm / utility process / remote Host
   └─ SandboxedUiBroker (optional) ── iframe / webview / MessagePort
```

构造和销毁顺序是一个不变量：

1. Application 创建 Host、Renderer、Browser 和 Query 等核心 Runtime；
2. Application 用这些 Runtime 的窄 Port 创建 `ExtensionSupervisor`；
3. ExtensionSupervisor 完成 manifest 解析和惰性激活；
4. 退出时先销毁 ExtensionSupervisor，撤销全部贡献和借用；
5. 最后销毁它曾借用的核心 Runtime。

插件永远不能拥有 `HostRuntime`、Browser backing 或 React root。可信连接扩展可以贡献
`HostConnectionProvider`，但它只负责校验配置并构造 `DuplexTransport`；返回的物理连接从
创建成功起由 Application 持有。Provider Activation 通过 lease 等待全部 Host 释放后才
能卸载，不能越过 Application 直接连接、重连、恢复 Thread 或写 Replica。

### 5.1 连接类型不是 Host 类型

```text
HostConnectionProfile (IndexedDB / platform secure store)
  ├─ hostId                  稳定执行命名空间
  ├─ providerId              如何连接，例如 vela.websocket
  ├─ providerConfig          provider 私有、JSON 可迁移配置
  ├─ hostKind                local / remote-ssh / durable 等语义
  └─ presentation metadata  名称、roots、是否出现在侧栏

HostConnectionProviderRegistry (Cordis contribution owner)
  └─ acquire(providerId, platform) -> ProviderLease
       └─ validate + createTransport

HostRuntimeRegistry (Application owner)
  └─ HostRuntime(hostId) -> Transport + AppServer + Session + Replica
```

`providerId` 与 `hostKind` 正交：WebSocket 既可以通向本地 daemon，也可以通向 SSH
gateway 或 Durable 服务。动态增加 Host 先持久化 Profile、再注册惰性 Runtime；删除时
先阻止新查找并回收 Runtime，再删除 Profile。存在活动 View、流、命令、交互或 hydration
的 Host 不可删除。环境变量只在 Profile Store 为空时进行一次 bootstrap，不是第二个
配置所有者。

## 6. Cordis 的准确位置

### 6.1 Cordis 负责什么

- 服务依赖和激活排序；
- 一个 Activation 对应一个 Fiber；
- event/effect/service 的逆序清理；
- 插件失败状态和重新激活；
- 可信内建 feature 的配置 schema；
- 开发模式下的 reload/HMR。

Cordis 的 `FiberState` 已覆盖 `PENDING / LOADING / ACTIVE / FAILED /
UNLOADING / DISPOSED`，非常适合实现 Activation 内核。`ctx.effect()` 可把跨 Registry
取得的 disposer 统一挂回插件 Fiber。

### 6.2 Cordis 不负责什么

- 代码沙箱；
- OS/网络/文件权限；
- 跨进程认证；
- 公共 API 版本兼容；
- marketplace 签名与供应链校验；
- Replica 写权限。

`Context.isolate()` 只隔离服务解析，不隔离 JavaScript realm。把根 Context 传给第三方，
等于把当前 scope 能看到的服务全部交出去。

### 6.3 不合并成一个巨大 Context

云桌面第一阶段使用现有可信内建 Panel definition / renderer / toolbar 注册，
由 Workbench Application 显式注入后端与媒体适配器；不增加公共权限或新的全局 Context。
未接通适配器时不发布可用入口，桌面进程、观看连接和独占控制租约分开所有权。
框架及后续接入条件见 [Conversation desktop plugin](cloud-desktop-plugin.md)。

云桌面与下游产品插件保持单向依赖：通用插件拥有桌面 contract、面板和 noVNC
媒体适配，不读取账号或调用企业云服务；`lightvela-platform/desktop` 只消费通用
contract/media 子入口，拥有精确绑定校验、资源准备及后端 attachment 交接，
不导入桌面 React renderer、noVNC 或 Hermes Chat 隧道。生产观看授权/输入门禁
尚未实现，缺失 viewer port 时不发布能力。源码和 package dependency guard
固化此边界；可信插件仍不是安全沙箱。

当前 Chat、Panel、Session、Replica 的 Context 可以继续独立存在。跨域原子卸载由
Contribution Broker 完成：

```ts
interface ContributionBroker {
  registerCommand(owner: ExtensionActivationKey, input: CommandContribution): Disposable;
  registerView(owner: ExtensionActivationKey, input: ViewContribution): Disposable;
  registerComposerProvider(
    owner: ExtensionActivationKey,
    input: ComposerProviderContribution,
  ): Disposable;
}

function activateBuiltin(ctx: CordisContext, broker: ContributionBroker): void {
  ctx.effect(() => broker.registerCommand(/* ... */));
  ctx.effect(() => broker.registerView(/* ... */));
}
```

所以“一个插件跨多个产品域贡献”不要求“所有产品域共享一个 DI 根”。

### 6.4 View、入口与布局不得合并

OpenCraft 采用与 Obsidian `Ribbon/Command -> ViewType -> WorkspaceLeaf` 相同的所有权原则，但不公开
任意 DOM 注入：

```text
Extension owns        View declaration, command, catalog data and business state
Navigation owns       entry activation and browser/application history
Workspace owns        View instance, placement, focus, resize and responsive projection
ExtensionSupervisor   activation generation, atomic publication and retirement
Presentation plugin   semantic contribution projection, layout preference and interaction grammar
```

公共贡献必须分开：

- `ViewContribution` 只定义“是什么”，不带 `location`；
- 承接 AppServer Bot 的 View 由 Bot 插件声明唯一语义角色 `bot-conversation`；Workbench 不知道插件的具体 View ID，角色冲突在扩展激活事务提交前失败；
- `NavigationContribution` 定义 `sidebar-primary/sidebar-footer` 入口及语义 target，并可声明 `titleMessage/shortTitleMessage/badgeMessage`。贡献拥有文案，Shell按当前locale解析完整可访问名、短标签和徽标；不按产品/插件ID选择文案或徽标。消息在注册时校验并冻结，随激活回收。Settings Page 可声明 `shortTitleMessage` 用于应用级工具入口，未声明时回退完整title。平台仍拥有几何、紧凑显隐和交互；
- `SidebarCatalogContribution` 引用 View，由宿主保留标题、折叠、滚动和间距所有权；
- `ViewContribution.role: "connector-management"` 声明连接器管理能力，沿用唯一事务 owner 和激活回收契约。核心 quick picker 只在该 View 与唯一关联 Settings Page 同时满足平台/audience 且 renderer 可用时提供管理入口；不识别产品私有 ID。缺失、歧义或退役时不提供入口，旧菜单回调不得跨激活代次导航。原生 MCP 连接与选择仍由现有 manager 负责，不依赖该管理页。
- `SettingsPageContribution` 引用 View，由 Settings route 生成导航；
  目标管理页可声明 `management.entryPoint: "workbench"`，表示它拥有应用级工具入口；未声明的管理页保留上下文管理行为。核心按声明投影导航和独立路由，不识别产品页面 ID。平台仍决定容器、响应式几何与滚动；入口共用贡献的语言、平台、audience、排序与激活生命周期。
- `WorkbenchSurfaceContribution` 只声明特殊宿主 surface，目前仅有 `empty-workbench`。
- `BotContribution` 只声明 Bot 身份、头像、可用性和打开动作；它不拥有任何 Sidebar DOM 或坐标。
- `SidebarLayoutStore` 是 durable 置顶顺序的唯一所有者；Sidebar 根拥有拖拽事务、临时投影、磁力落点和滚动坐标系。
- AppServer Bot 目录先投影成带 `hostId/kind/entityId` 的 `SidebarEntity`，协议适配器负责创建与打开命令，React 不直接调用仓库。

Bot 提供方不能注入侧栏 DOM，也不能持有面板坐标。Bot 来源可以来自扩展贡献或任意
AppServer Host；两者进入同一个 Sidebar 实体投影后，才由平台分别呈现 pinned、row 或
collapsed rail。暂时离线的实体不会从 durable order 中删除。

桌面左栏、iPad Split View 和手机 Drawer 可以投影同一 Navigation/Catalog 声明；插件不得写死
侧栏宽度、左右方向或桌面 CSS 坐标。

## 7. 公共 Manifest 与 API

### 7.1 当前 Manifest V1

可安装可信模块导出 `OpenCraftExtensionDefinition`。以下是当前合法的 Manifest；
完整字段以 [ExtensionManifestV1](../packages/extension-contract/src/index.ts) 为准。

```ts
const manifest = {
  manifestVersion: 1,
  id: "example.hello",
  name: "Hello extension",
  version: "1.0.0",
  apiVersion: 1,
  trust: "trusted",
  platforms: ["web", "electron"],
  activationEvents: ["onStartupFinished"],
};
```

当前 `apiVersion` 是数字，Host 仅接受 1；平台值为 `web | electron | expo`。
`dependencies` 是必须已经 active 的扩展 ID，不是版本范围解析或下载请求。
不能从声明 activation event 推定已有完整惰性调度；平台声明也不代表该平台已有安装器。
`engines`、`requestedPermissions`、`provider/sandboxUi entrypoints` 属于后续设计，
不是当前 V1 可消费字段。可信产品编译入口与用户安装的模块 URL 是不同的装配边界。

### 7.2 当前公共 API

公开类型 `OpenCraftExtensionApiV1` 提供：

- 生命周期：`signal`、`identity`、`subscriptions`；
- 数据：可空 `storage`、可选 `localPreferences`；能力存在性以实际宿主为准；
- 贡献：`commands`、`settings`、`views`、`navigation`、`sidebar`、`workbench`、
  `themes`、`bots`、`window`。

此处的 View/Workbench 注册描述支持的贡献，不承诺加载任意 React UI。
`window.showAnnouncement` 只提交数据，由应用拥有窗口、焦点、Portal 与销毁。
现有可信产品装配可访问更多内部接口，不属于可下载模块的公共 ABI。

公共 API 不提供根 Cordis Context、React Component、Query client、
AppServer Transport、可变 Replica、文件系统或 Electron IPC。
可信模块仍运行在 Renderer realm；这不是隔离执行宿主。
数据与生命周期语义见 [插件持久化契约](plugin-persistence.md) 与
[可运行示例](../examples/extensions/README.md)。

#### 7.2.1 稳定性契约与后续目标

V1 只做向后兼容增加；删除成员或改变语义须提出 V2 与迁移路径。
当前已有 API 1/平台兼容拒绝、失败清理和安装恢复测试，不代表下列目标全部实现：

- API/engine 版本范围协商、机器可读跨端 capability discovery；
- 完整依赖解析、声明式权限授予、隔离宿主及版本化 RPC；
- 发布 SDK、统一旧版本兼容样本和跨端完整 contract suite；
- API 废弃诊断与公开迁移窗口。

新增公共能力须带现有消费者兼容与生命周期证据，不能直接把产品内部 Context、
React props 或生成协议类型变成稳定 SDK。贡献方法见 [贡献指南](../CONTRIBUTING.md)。

### 7.3 发行、解析与 Artifact

当前 V1 先提供明确标记为可信开发通道的 `module-url`。它用于团队内部和插件 SDK
成形前的快速迭代，不冒充正式 Marketplace 安装：

```text
module-url
  -> download bounded self-contained ESM + SHA-256
  -> validate dependencies and evaluate saved bytes
  -> validate manifest + platform + API version
  -> persist disabled InstallationRecord
  -> activate one Supervisor generation
  -> persist enabled=true only after activation succeeds
```

新安装把产物独立保存为摘要寻址文档、安装记录只保存引用；进程重启不重新下载已固定的源 URL。
该内容校验不是签名或发布者信任校验。只有显式 reload 请求候选版本；候选激活或保存失败保持
原安装指针，并尽可能恢复本进程旧定义。清理失败报告 failed，不能保留不存在的 active 状态。

它沿用 Obsidian 已验证的三层所有权：Installation Repository 保存用户意图，Module Loader
解析工件，Extension Supervisor 保存活跃实例；三者由 Extension Manager 串成唯一事务。
启用是“先激活、后保存 enabled”，停用是“先保存 disabled、后卸载”，所以刷新永远以明确的
用户意图恢复，而不会把半成功运行态误当成安装事实。损坏记录和单插件加载失败会隔离，不阻塞
Workbench 启动。Web 端记录保存在产品命名空间内的 IndexedDB；入口必须开启 CORS、使用
HTTPS（当 OpenCraft 由 HTTPS 提供）并自行 bundle 私有依赖。外部模块只得到冻结的公共
`OpenCraftExtensionApiV1`，不会得到内部 Cordis seam。

最小入口是一个无需私有 OpenCraft import 的自包含 ESM：

```js
export default {
  manifest: {
    manifestVersion: 1,
    id: "com.example.hello",
    name: "Hello",
    version: "1.0.0",
    apiVersion: 1,
    trust: "trusted",
    platforms: ["web"],
    activationEvents: ["onStartupFinished"],
  },
  activate(api) {
    return api.commands.register(
      { id: "com.example.hello.greet", title: "Greet" },
      () => "hello",
    );
  },
};
```

正式 Marketplace 仍采用下面的 Verified Artifact 链路；届时 `module-url` 保留为显式的
Developer Mode 来源，而不是自动升级为已验证包。

`local/git/npm/remote` 是来源描述，不是可直接执行的 URL。安装链路必须显式经过：

```text
CatalogEntry
  -> DependencyResolution + PlatformResolution
  -> VerifiedArtifact(hash/signature/manifest)
  -> ContentAddressedStore
  -> InstallationRecord
  -> Activation
```

规则：

- manifest、入口文件、资源清单和最终 hash 一起进入安装记录；
- 依赖图按 Profile/Host 生成确定性 lock，循环依赖和不兼容 API 在激活前失败；
- 社区扩展默认自行 bundle 私有依赖，只把版本化 OpenCraft SDK 视为 host-provided API；
- 插件不能共享主应用的 React、Cordis 或任意 npm 单例，避免 ABI/实例冲突；
- 正式 Marketplace 的 Web 安装不从任意 CDN `import()` npm 包；Verified Artifact 只能从
  受控独立 origin 加载；这不包含显式可信 Developer Mode 的 `module-url`；
- 更新先安装并验证新 Artifact，再创建新 Activation，贡献提交成功后才切换当前版本；
- 旧版本保留到新版本通过健康门，失败时回滚 Installation pointer；
- uninstall 先停用并撤销贡献，再删除 Installation；Artifact 的物理 GC 独立、可重试。

Artifact Store 是安装基础设施，不是业务状态，也不进入 Replica。远端 Host 的 Artifact
由该 Host 管理；浏览器客户端只取得 catalog/projection 和经过策略允许的 sandbox 资源。

## 8. 三种执行策略

执行策略是 Deployment Policy，不是 Extension API 类型。同一个 Extension 工程可以在本地
开发时以 `trusted` 运行，进入未知来源市场后按产品策略改用 `restricted`。

### Internal

- 随 OpenCraft 发布；
- 与应用同进程并可使用内部 Cordis/React；
- 用于核心 Chat presenter、协议 projector、浏览器 Adapter；
- 不属于公共 SDK 兼容承诺。

### Trusted

- 用户明确启用的 local/workspace/signed Extension；
- 默认使用公开 SDK，但可以在平台允许时获得 Node/DOM 等宿主能力；
- 可以同进程 Cordis scope 运行，也可以放进专用 ExtensionHost 做故障隔离；
- 不要求逐项文件/网络权限 broker；用户的信任对象是整个 Extension；
- 即便有完全权限，也仍必须遵守 Activation owner、generation fencing、稳定 ID 和 disposer；
- 导入 OpenCraft 私有包属于 unsupported 行为，而不是 Host 宣称能够安全阻止的攻击面。

这就是 OpenCraft 第一阶段最适合 vibe coding 的模式，接近 Obsidian：简单、直接、可调试。

### Restricted（可选）

- 面向未知 Marketplace 来源、组织受管环境或需要运行外部 App UI 的场景；
- 可以使用独立 origin、utility process、远端 Host、iframe/WebView 和受限 RPC；
- 可以启用文件、网络、终端、剪贴板、凭证和 Thread 级 permission broker；
- Host 可以设置 CPU、并发、消息大小和心跳预算。

普通同源 Web Worker 只能做线程/故障隔离，不能被宣传为安全沙箱。只有产品真的需要
Restricted channel 时，才建设和承诺相应安全边界。

UI 呈现位置与执行策略正交：Trusted 插件也可以选择 iframe；Restricted Provider 也可以
只贡献宿主原生声明式卡片。

## 9. 可选访问策略

本地 Trusted Extension 不强制启用细粒度 Permission。若组织策略或发行渠道需要 Restricted
Mode，可以把“请求访问”和“实际授予访问”分离。这里的 Permission 是 Artifact 安装上限，
不是 Agent-facing Capability Spec：

```ts
type ExtensionPermissionRequest =
  | { readonly kind: "workspace.read"; readonly roots: readonly string[] }
  | { readonly kind: "workspace.write"; readonly roots: readonly string[] }
  | { readonly kind: "network"; readonly origins: readonly string[] }
  | { readonly kind: "terminal.execute"; readonly hostScopes: readonly string[] }
  | { readonly kind: "conversation.read" }
  | { readonly kind: "conversation.write" }
  | { readonly kind: "clipboard.read" }
  | { readonly kind: "clipboard.write" };
```

Restricted Mode 下的不变量：

1. manifest 只是请求，不是授权；
2. 用户、组织策略和 Host Policy 的交集才是 grant；
3. grant 单独持久化，可撤销，可按 Host/Workspace 收窄；
4. API 每次调用在 broker 端校验，不能只在安装时校验；
5. `activeThread`/`activeResource` 类临时授权不扩展成全局权限；
6. 插件看不到原始凭证，只能调用被授权的操作；
7. 权限改变会使旧 generation 失效并重新激活。

## 10. Contribution 模型

### 10.1 所有登记都必须带 Owner

当前多个 Registry 只用裸 `string` 作为 key。目标接口必须携带来源：

```ts
export interface ContributionOwner {
  readonly activation: ExtensionActivationKey;
  readonly apiVersion: string;
  readonly trustTier: 0 | 1 | 2;
}

export interface ContributionRegistration<T> {
  readonly id: ContributionId;
  readonly owner: ContributionOwner;
  readonly value: T;
  readonly priority?: number;
}
```

规则：

- ID 必须位于 extension namespace；
- 完全相同 ID 不能静默覆盖；
- 只有明确定义的 replacement point 才允许 override；
- priority 只用于允许多实现的 provider，不用于绕过唯一所有者；
- owner 卸载时全部自动撤销；
- Registry snapshot 暴露 provenance，方便诊断“是谁注册了这个 View”。

### 10.2 公开贡献面

| 贡献面 | 社区扩展 | 可信内建 | 说明 |
| --- | --- | --- | --- |
| Commands / menus / keybindings | 是 | 是 | 执行经能力 API；冲突可诊断 |
| Workbench resources / views | 是 | 是 | 社区 UI 为 sandbox/declarative view |
| Settings schema | 是 | 是 | Host 生成字段 UI，值与页面位置分离 |
| Settings page / navigation / sidebar catalog | 声明式 | 是 | View 与入口分离；可信内建可登记平台 renderer |
| Bot identity / action | 是 | 是 | 数据提供方不拥有侧栏；Bot Panel 统一投影、置顶和拖拽 |
| Composer suggestion/provider | 是 | 是 | 返回 typed item；不取得编辑器实例 |
| Tool activity presentation | 受限 | 是 | 社区返回声明式卡片或 sandbox URI |
| Chat AST renderer | 受限 | 是 | 社区不能注册任意 React Component |
| Theme/icon/token extension | 受限 | 是 | V1 已支持双明暗语义 palette；不覆盖任意全局 CSS |
| Protocol projector / Resume strategy | 否 | 是 | 属于一致性和安全核心 |
| Replica reducer / Resume strategy / Auth | 否 | 是 | 属于一致性或凭据核心 |
| Connection provider factory | 否（V1） | 是 | 只产出 Transport；Application 持有实例并管理 lease |
| Browser engine / physical Surface | 否 | 是 | 社区只能请求 Browser capability |

### 10.3 View 恢复

Workspace checkpoint 只持久化：

```ts
interface ExtensionViewCheckpoint {
  readonly contributionId: ContributionId;
  readonly extensionVersion: string;
  readonly stateVersion: number;
  readonly state: unknown;
}
```

恢复时先解析 Extension，再做 state migration，最后创建 View。插件缺失、禁用或迁移失败
时显示稳定 placeholder，不能让整个工作台白屏。View 关闭只销毁 View instance，不自动
停用 Extension；Extension 停用会关闭或占位它拥有的全部 View。

## 11. 跨平台策略

OpenCraft 共享 manifest、command、resource、permission、activation 和 view state 协议，
不承诺共享插件的 React 组件体。

| 能力 | Vite Web | Electron | Expo iOS/iPadOS | Expo Web |
| --- | --- | --- | --- | --- |
| 可信内建扩展 | 编译进应用 | 编译进应用 | 编译进应用 | 编译进应用 |
| 本地能力扩展 | 独立/opaque-origin 执行域 | 受限 utility process；Worker 仅作内部调度 | 默认不支持任意本地代码 | 独立/opaque-origin 执行域 |
| Host 能力扩展 | WebSocket/AppServer | IPC/SSH/AppServer | WebSocket/AppServer | WebSocket/AppServer |
| 沙箱 UI | iframe | sandbox webview/iframe | 受控 WebView 或声明式 native fallback | iframe |
| 原生 View | 内建 React DOM | 内建 React DOM | 内建 React Native | 内建 React Native Web |

iOS 平台限制不是抽象失败。社区扩展如果只有 DOM UI，可以在 WebView 中运行；如果只
提供声明式贡献，则由 Native Host 渲染；如果要求本地任意代码，则该 target 明确标记为
unsupported。不能为了“100% 插件代码共享”把整个 Expo App 变成 WebView。

## 12. 与 AppServer / Multi-Host 的关系

每个 `HostRuntime(hostId)` 提供该 Host 的插件目录和能力 Port。应用级
`ExtensionSupervisor` 聚合它们，但不把远程代码拉入本地 Renderer 执行。

```text
Plugin catalog identity    = pluginId
Installed server instance  = (hostId, pluginId, version)
Client extension instance  = (profileId, hostId|null, extensionId, activationId, generation)
UI view instance           = (rendererId, contributionId, viewInstanceId)
```

- SSH Host 的 Skill/Hook/MCP 在 SSH Host 后面运行；
- Durable Host 的插件能力由 Durable Host 的 AppServer 投影；
- Renderer 通过统一 HostRuntime 路由命令；
- 一个插件在两个 Host 安装时是两个可用性/授权实例；
- 全局插件管理 UI 可以聚合展示，但不能抹掉 Host 来源。

Codex 当前的 first-party bridge 只对 `local` Host 生效，是产品策略证据，不应被泛化成
“所有插件都只能 local”。OpenCraft 的 bridge 必须显式声明 location policy。

## 13. 包与模块边界

先建立最少两个新包，不一次拆出十个空壳：

```text
packages/
  extension-contract/
    manifest.ts
    identity.ts
    capabilities.ts
    contributions.ts
    rpc.ts

  extension-runtime/
    extension-supervisor.ts
    activation-graph.ts
    contribution-broker.ts
    permission-store.ts
    installation-store.ts
    trusted-cordis-runtime.ts
```

平台实现先放在对应 App 中：

```text
apps/workbench-web/src/extensions/
  sandbox-capability-host.ts
  iframe-ui-host.ts

apps/workbench-desktop/src/extensions/
  utility-extension-host.ts

apps/workbench-expo/src/extensions/
  sandbox-webview-host.tsx
  native-contribution-renderers.tsx
```

只有在 Web sandbox、utility process 和远端 Host 已产生两个真实实现后，再抽
`extension-host-*` 包。公共插件开发工具稳定后再发布 `@opencraft/extension-sdk`；它只是
`extension-contract` 的友好 facade，不依赖 Cordis。

## 14. 当前设计差距

### 14.1 已经正确

- Registry 与 runtime 行为分开；
- Chat renderer、directive、resource policy、Panel definition/renderer 已可插拔；
- Cordis Fiber 已提供 disposer 和失败边界；
- HostRuntime、Replica、Session、Renderer 没有被塞进一个全局 Context；
- Web 与 Native 已经按 semantic model / platform renderer 分层；
- AppServer 协议已经拥有最新 Plugin 产品面类型；
- 可信 `module-url` 已保存自包含 ESM 的 SHA-256 固定产物，支持离线重启和更新失败保留旧安装指针，见 [Artifact 链路](#73-发行解析与-artifact) 与 [产物行为测试](../tests/extension-artifacts.test.ts)；
- 可信 V1 的 API/平台兼容拒绝、激活失败回滚、期限和退出故障已有行为回归，见 [安装测试](../tests/extension-installations.test.ts) 与 [Supervisor 测试](../tests/extension-runtime.test.ts)。这些测试覆盖受信任模块的合作式故障边界。

### 14.2 尚未完成的生态边界

- 部分旧 Chat/Panel/Composer Runtime 仍使用内部 Cordis install，尚未全部迁移至统一公开贡献协议；
- 公共贡献已有 namespace 与 Activation owner；正式发行的发布者签名、来源信任和依赖 lock 仍缺失，已有的摘要固定与恢复不提供发布者身份保证；
- 已有 manifest 与活动依赖检查，activation event 调度、完整依赖解析及可选 capability grant 仍待建设；
- 没有 Web sandbox/utility/remote ExtensionHost；
- 没有 View state migration、失败 quarantine、crash-loop 防护；
- React Component registration 还没有明确标注为 Tier 0 only；
- 现有可信模块故障回归不能替代隔离宿主中的恶意代码测试；同步死循环和模块自行产生的任意副作用仍不受强制终止。

因此当前架构可以维护内部 feature，但不能安全地宣称“支持社区插件”。

### 14.3 Extension Workshop：Vibe coding 的产品入口

Vibe coding 不直接修改 OpenCraft Runtime。Agent 和用户共同维护一个真实 Extension 工程：

```text
my-extension/
  opencraft-extension.json
  src/
    extension.ts
    providers/
    ui/
  tests/
    activation.test.ts
    permissions.test.ts
    smoke.test.ts
  package.json
  tsconfig.json
```

标准闭环：

```text
scaffold
  → Agent 修改 TypeScript
  → typecheck + contract tests
  → bundle package-contained code
  → manifest/API/access diff
  → preview + hot reload
  → user installs as workspace/profile extension
  → optional sign/publish
```

不变量：

- Agent 可以创建、解释、修改和测试工程，不能绕过用户动作静默安装；
- Preview 与正式 Activation 使用相同 Host/RPC，只是 Installation scope 和信任级别不同；
- 每次预览钉住 Artifact hash，热更新创建新 generation，不原地替换正在执行的代码；
- 生成代码只能引用 `@opencraft/extension-sdk`，构建器拒绝内部包与路径导入；
- 发布包必须包含源码 provenance、依赖 lock、访问说明、兼容版本和可重复测试结果；
- `contributes.agentCapabilities` 是可选项。普通主题、View、Command 插件不需要理解 Agent
  Capability Spec、Lease 或 Invocation。

Harness 式 `inspect → define → run/update/stop` 可以作为 Workshop 的快速 Preview 实现参考，
但最终产物必须回到上述工程、构建和安装链，而不是永久保留一段进程内匿名代码。

## 15. 实施顺序

### Phase 0：冻结术语与边界

1. 新建 `extension-contract`；
2. 明确 `AppServer Plugin` 与 `OpenCraft Extension`；
3. 将公共文档中的“plugin”区分为 `builtin extension`、`server plugin`、`community extension`；
4. 标记现有 `runtime.install(Cordis Plugin)` 为 `@internal`。

状态：1-3 已完成；4 随各 Runtime 迁移逐步完成。

### Phase 1：可信内建扩展内核

1. 实现 `ExtensionSupervisor`、Activation Graph、Owner metadata；
2. 用 Contribution Broker 接入现有 Chat/Panel/Composer Registry；
3. 把现有内建扩展迁移到统一 Activation；
4. 证明一个 Extension 可原子注册 command + panel + tool presenter 并完整卸载。

状态：1 已完成；Contribution Broker 已覆盖 command/settings/declarative view；WebSocket Host 已完成
第一条真实迁移和 lease 验证。Chat/Panel/Composer 迁移与 tool presenter 组合证明仍待完成。

### Phase 2：惰性激活与恢复

1. manifest validator；
2. `onCommand/onView/onResource/onStartupFinished`；
3. Installation/Activation/Failure store；Restricted Mode 再增加 Permission store；
4. View checkpoint、state migration、缺失插件 placeholder；
5. TanStack Query 接入 AppServer marketplace/install mutations。

### Phase 3：Extension Workshop

1. `@opencraft/extension-sdk`、scaffold 与 TypeScript 模板；
2. typecheck、contract test、bundle、Artifact hash；
3. Trusted workspace/profile install 与热更新 generation；
4. manifest/API/access diff 和失败 rollback；
5. Agent 驱动的创建、修改、测试与 Preview UI。

### Phase 4：远端 Host 与 Agent Contribution

1. AppServer Plugin catalog adapter；
2. SSH/Durable 的 location-aware Activation；
3. `contributes.agentCapabilities` adapter；
4. Agent ModelView/Invocation/Receipt contract；
5. Web/Expo declarative UI fallback。

### Phase 5：Restricted Channel（按商业需求选做）

1. 独立/opaque-origin Web Host 或 Electron utility process；
2. iframe/MessagePort、sandbox webview、Expo WebView；
3. permission broker、revoke、预算和 generation fencing；
4. 故障、超时、崩溃、越权和 sandbox 测试；
5. 组织策略或未知 Marketplace 来源接入。

## 16. 质量门与不变量

### 生命周期

- 一个 Activation 只有一个 Cordis Fiber owner；
- 激活任一步失败时，已经登记的贡献全部逆序撤销；
- disable/uninstall/update/Host disconnect 都不会遗留命令、View、event、timer 或 process；
- View unmount 不等于 Extension deactivate；
- 旧 activationId 或旧 generation 的异步返回永远不能提交。

### 稳定 API

- SDK 构建与类型检查不允许依赖 OpenCraft private package/path；这是一条支持边界，不冒充沙箱；
- V1 Extension 在后续兼容 Host 中继续通过 contract suite；
- 内部 Cordis、React、AppServer 和 Replica 重构不改变公共 API；
- 用户生成 Extension 的 Preview 与正式 Activation 使用同一 API/RPC 语义；
- Trusted plugin 崩溃、更新失败或 disposer 抛错不会破坏 Activation 账本。

### Restricted Channel 安全门（启用时）

- 未授权 API 在 broker 端拒绝，而非只在 UI 隐藏；
- sandbox UI 无主文档 DOM、Cookie、令牌和原始 IPC；
- manifest 路径、包内容、签名/hash 与更新来源可审计；
- 权限撤销不需要重启应用。

### 一致性

- 公共 Extension API 不提供 Replica 任意写入口；
- server plugin availability 始终带 `hostId`；
- contribution ID 全局确定、可追踪、无静默覆盖；
- 缺失/故障插件不能阻断工作台恢复；
- Marketplace Query cache 失效不改变已经激活的运行事实。

### 跨平台

- 同一 manifest 在四端得到一致的 capability 与 contribution 解析结果；
- unsupported target 明确降级，不静默丢按钮；
- Web/Native 对同一个 declarative contribution 通过契约测试；
- sandbox 主题只使用版本化语义 Token。

## 17. 复审结论

OpenCraft 当前的方向没有错，真正的问题不是“Cordis 用少了”，而是还没有把内部插件机制和
公共插件生态分层。

如果直接把现有 `Context`/`Plugin` 暴露出去，虽然能快速得到 Obsidian 级开发便利，却会把
Web、Electron、Expo 和 SSH Host 锁死在一个不稳定的 TypeScript 内部 ABI 上。真正必须
隔离的是公共 API 与内部实现；安全沙箱是否启用由插件来源和商业渠道决定。

如果按本文实现：

- 内部功能继续享受 Cordis 的轻量 DI 和自动清理；
- 插件作者得到接近 Obsidian 的 `activate + subscriptions + registerContribution` 体验；
- 本地 vibe coding 可以采用简单的 Trusted 模式；需要时仍有 Restricted channel 演进路径；
- AppServer Plugin、Skills、Hooks、MCP Apps 与 Codex 协议保持原生兼容；
- React DOM、React Native 与远端 Host 不需要共享组件体或进程模型；
- 将来可以建立真正的 marketplace，而不需要再推翻 HostRuntime、Replica 和工作台布局。

这应当成为 OpenCraft Extension Platform 的正式目标架构；面向 Agent 的可选调用投影见
[`agent-capability-fabric.md`](./agent-capability-fabric.md)。

## Trusted product Thread metadata and badges

The renderer-neutral `SingleContributionRegistry` in `extension-runtime` owns the
exclusive registration lifecycle for identity avatars, Thread badges and Thread
list grouping. Web adapters validate their own contribution shapes. Preparation
is side-effect free; competing prepared contributions arbitrate again at commit.
Each commit has a distinct registration identity, so an old disposer cannot
remove a later registration even when the plugin reuses the same object. The
public snapshot stays stable between changes and unloading restores `null`.
Priority-based account entrances and multi-item registries keep their own semantics.

`threadBadge` is an internal React contribution for one optional product-owned
Thread adornment. Shell owns layout, identity and overlay exclusivity; the product
owns data and content. The trailing slot takes its content width, stays right-aligned
with the existing row-menu gap, and consumes no space for absent content. 企业身份
uses it for the last three server-array participants plus a circular “…” on overflow;
the full participant Popover and creator provenance remain product-owned.

Codex Host accepts an optional Thread metadata factory against its existing shared
SQLite and native-history port. The provider observes native results/notifications,
owns explicitly advertised metadata RPCs and releases before Host storage closes.
It does not intercept model input, claim native execution ownership or add another
message identity store. Headless composition installs the optional product factory
alongside its configured identity presentation; other deployments remain unchanged.

Headless startup consumes a trusted compiled identity composition, not enterprise
imports. The adapter returns verified providers, optional request presentation and
Thread metadata, owned storage outcomes and a disposer. Core retains local/OIDC
login, membership, Actor authority and execution lifetime. External provider
principals identify verified humans; a product can further restrict eligibility
through its explicit `isHuman` predicate. Session credentials continue through
the separate Actor path and cannot masquerade as browser human identities.
The managed site owns its numeric employee binding rules, token/allowlist parsing and existing
presentation/preferences assembly outside the replaceable upstream prefix.
Standalone and managed packaging choose their entry explicitly; importing an
application module never starts an extra CLI/listener. See
[server authentication](server-authentication.md#headless-composition-contract).

`threadListGrouping` is an optional trusted presentation contribution in
`extension-react`: the plugin provides mode descriptors, stable group identities,
metadata watching, ordered Thread references and collapse actions. Shell owns
the display-mode dropdown/context menus, group chrome and existing navigation.
Null mode or contribution retirement restores the Shell taskflow list.
An optional filter descriptor and filterThreads/setFilterEnabled expose personal
filtering through Thread references only. Shell owns title/server filters, the
chip and hidden-row count; product identity tests and account preferences stay
inside the plugin. When personal filtering is enabled, only confirmed creator/participant membership
matches; unresolved metadata and ready empty creator/participants data are excluded.
Shell adds no unknown-membership status row or expansion control.
When 企业身份 has no display identity, it omits the optional filter descriptor; Shell
hides its chip and menu group without changing the stored preference or hiding rows.
Product-specific creator semantics, account ordering and preference schemas stay
in the plugin. The optional `api.localPreferences` port supplies generic
product/extension/account isolation and activation fencing; see
[persistence](plugin-persistence.md#8-插件的账号本地呈现偏好).

## Application branding

`extension-contract` declares renderer-neutral `ApplicationBrandingContribution` and
`APPLICATION_BRANDING_CHANNEL`. A trusted plugin registers one declarative descriptor;
Web validates same-origin asset URLs and consumes the existing single-contribution
registry. Commit owns cleanup, conflicting owners fail, unload/rollback restores the
OpenCraft fallback. Shell owns mark size, rail alignment and responsive geometry;
plugins own names and assets. A descriptor may set `showMarkOnMobile: false`
to keep its wordmark without a mobile drawer mascot; omission preserves the mark.
The Shell consumes the descriptor without knowing a product name. Embedded
renderers do not mutate host document metadata.

Product branding packages belong to their downstream workspace. The public Web
supervisor has no product branding imports. A trusted client product may return
managed builtins through its existing session; `ClientProductContext.defaultExtensions`
contains the resolved website/build defaults at creation time. Persisted
extension-manager choices still win. This list is not an authorization grant.
The Web supervisor owns the manager and its rollback/disposal; Electron does not
load Web-only builtins. Product composition owns names, assets and default policy.

Plugin package metadata `opencraft.extensionId`, `webBranding` and `webAssets` declares
initial HTML branding and public resources. The generic Vite adapter serves/copies
packaged plugin assets under `/plugin-assets/<directory>/`; it selects initial title
and links only for the explicitly selected branding plugin and rejects multiple owners.
The public adapter only sees packages installed inside its declared workspace.
A downstream config may use the same adapter against its own plugin directory,
so packaged assets support runtime website selection without becoming public-core
assets. Electron/embedded builds omit the Web metadata adapter.
Runtime registration is authoritative after startup: Shell updates document title and
one effect owns favicon/manifest/touch links, restoring predecessors on cleanup. A
runtime-only deployment may show neutral bootstrap metadata before activation; select
the same plugin at build time for matching pre-JavaScript title/install metadata.

Separately, a downstream build may select `OPENCRAFT_PRODUCT_PUBLIC_DIR`, a trusted
local directory resolved relative to the core workspace. The generic Vite adapter
serves its current files in development and emits their original bytes at the
same relative URLs in builds. Core defaults select no such directory. Missing or
nonlocal roots, symbolic links and collisions with core public files or generated
outputs fail instead of overriding another owner. Development requests read the
current directory, including newly generated files; preview serves the fixed built
output through Vite rather than changed source files. `copyPublicDir: false` retains
the packaged native document's exclusion of public assets. This build input is
not runtime website configuration, a remote code loader or browser-controlled input;
plugin branding still uses the separate declaration and lifecycle above.

The optional `share` declaration contains a public HTTPS origin, a same-origin
image path and a public product description. Build and runtime adapters share one
metadata projection for Open Graph/Twitter and `image_src`; initial HTML is readable
without JavaScript. Document cleanup restores previous metadata nodes as well as
links, and neutral/replacement brands remove the previous owner's share image.
Share titles are the public product name, never private conversation content.
This publishes crawler metadata, not an authenticated WeChat JS-SDK integration;
actual WeChat thumbnail selection/caching requires client verification.

Downstream managed site owns its preserved brand artwork and original asset URLs in
`products/join/plugins/join` outside the public core. Its client entry decorates the
existing account/engine product session with the managed `join.server` builtin;
its Vite config selects product-local branding metadata/assets. Explicit build
settings (including an empty list) override website defaults as before, while
persisted choices remain authoritative. The product owns its original brand
lifecycle, asset-size and desktop/mobile browser assertions; public generic tests
use synthetic plugin descriptors and the public fallback brand. This ownership
transfer does not grant redistribution rights to product artwork.

Verification: `tests/application-branding.test.ts` and
`tests/extension-installations.test.ts` cover generic validation, ownership,
rollback and persisted enable/disable. Downstream tests cover original product
metadata/assets and the same desktop/mobile activation/unload/replacement paths.

Tasks member profiles consume the existing optional `IdentityAvatarContext` and
`AvatarImage`. An explicit nullable `{kind,id}` reference is display data only;
Tasks never imports the 企业身份 implementation or derives identity from a name. The
product provider resolves photos; missing providers, unknown kinds and failed
images retain the caller's initials and geometry. Profile references cannot grant
authentication, access or ownership, and task assignment works without a provider.

### Startup registration and demand presentation

扩展元数据/provider 必须在路由恢复前可发现，管理页实现不属于注册依赖。Web 的 Required/Optional/Demand 阶段、共享账户/Host 生命周期、延迟组件失败重试和连接导入取消屏障，以 [Startup resource ownership](platform-architecture.md#startup-resource-ownership) 为当前实现契约；事件名 `onStartupFinished` 本身不保证模块已脱离关键图。构建应检查真实静态依赖，见 [启动资源门禁](startup-performance.md)。

### Provider-owned Composer commands

`HostConnectionProvider.composerCommands` is an optional trusted client adapter.
Plugins declare localized `prompt` or `action` suggestions and implement action
execution through a protocol port bound to the resident Host. The core presents
the declarations and dispatches only explicit standalone action submissions; it
does not choose engine command names or wire methods. Provider retirement/replacement
and Host/profile invalidation reject new calls, with accepted invocations drained
under independent provider leases. This does not grant plugin authorization or
change ordinary Thread submission and queue ownership.

### Removed product built-ins

The current product's built-in declarations are the authority for bundled extension availability.
A saved built-in absent from this product is not loaded or exposed in its extension catalog;
it does not become a failed installation. Its durable record is retained so a product switch
or later reintroduction preserves the user's enabled/disabled choice. Other bundled extensions
and installed module URLs still restore independently. The background task is named
`extensions.restore`; it is not owned by a particular optional product feature.
