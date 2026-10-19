# Startup performance governance

治理同时观察传输量、解压/解析/执行、首个可用输入、启动后的工作以及重复访问缓存。单个 FPS、gzip 或 coverage 数字不能替代这些维度，浏览器 CPU 限速也不等于设备功耗实测。

## Resource model

阶段与生命周期以 [startup resource ownership](platform-architecture.md#startup-resource-ownership) 为准。`startup-resource-policy.vite.ts` 是构建预算与禁止模块的可执行真源；`startup-resources.vite.ts` 从最终 chunk 图生成私有报告，检查 Web/embedded 入口、Workbench 和必需 provider 的静态依赖保守并集。恢复的具体 Host/页面可以额外按需加载；不得把其成本冒称为零。

当前保守并集预算：原始 JS 3.7MB、独立 CSS 700KB、JS/CSS gzip 1.2MB、静态关键 JS 最多120个请求。JS 中的 shadow 内联 CSS计入 JS。预算按解析成本与传输量分别控制；调整必须附同场景浏览器测量和模块归属原因，不得仅提高阈值掩盖回归。管理实现、字典数据、连接器目录、HTML/扩展 parser 和桌面 panel 不允许进入静态关键图，即使总字节没超标。

在下游产品目录运行 `npm run build:web:release` 即执行门禁，私有图在 `apps/workbench-web/.startup/<outDir>/resources.json`，含模块、静态/动态边、关键文件与字节；位于 dist 之外，不进入公开产物。`npm run test:startup` 覆盖禁止模块与预算负例、延迟 transport 的取消/重试/发送上下文/失败分类、真实 HTTP 压缩协商。产品目录的 `npm run smoke:startup-boundaries` 覆盖真实 React 延迟视图、语言切换竞态和 shadow 样式生命周期。

## Loading and cache

- 管理页面、连接器目录/详情与低频 parser 保持在动态边之后；连接器图标用 `?no-inline` 生成独立哈希资源，列表的 lazy image 才能实际节省传输。
- 稳定 React runtime 和图标库独立成组，共享 packages 按入口集合分组并合并小于4KB的邻近组，不把全部可选供应商塞成一个启动 vendor 包。此策略减少应用改动污染共享运行时，但不保证业务 Shell 的每次部署零失效。
- `node scripts/compare-startup-resources.mjs <before.json> <after.json>` 按文件 URL 与模块归属报告关键缓存失效字节；合法代码变化和仅依赖哈希传播分别审查。不能把相同 chunk 数量当作缓存稳定证据。可加 `--max-invalidated-js <bytes>` 作为指定场景的硬门禁。
- `npm run check:startup:cache` 在隔离临时目录构建同一 Headless 发布两次，仅通过构建插件改变可选 Bot 扩展名称，不改工作区源码；关键 JS 失效超过900KB即失败。私有报告保留在 `.local/startup-cache/`，构建目录自动清理。该检查进入 `gate`，900KB只约束这个受控场景，不是所有业务修改的通用预算。
- 文件和扩展解析仍保留 HTML 导航/CSP 清理、扩展签名/摘要与 self-contained 校验；延迟导入不得跳过这些边界。

## HTTP and compression

构建为大于等于 1KB 且压缩确实更小的哈希 JS/CSS/SVG/JSON 生成 gzip 和 Brotli sidecar。构建阶段完成压缩，运行时按 Accept-Encoding（含 q=0、显式 identity 与 wildcard）选择已有表示；缺少 sidecar 回退原文，所有可接受表示均禁止时 406。MIME 按原始资源，Content-Length 按表示，Vary: Accept-Encoding；HEAD 无响应正文。可选 PDF 的 sidecar 与原文件一起进入其资源包。

HTML 注入部署配置，故保持动态原文/no-store；version.json no-store；内容哈希资源 immutable；404 不回 HTML。source maps 及其压缩后缀不公开。旧资源继续由既有发布/回退保留契约管理，不清用户数据、不在请求期间压缩。

## Validation matrix

至少采集冷/热缓存、正常/限速 CPU、弱网、后台恢复；分别记录 Composer DOM/首帧与后续长任务、实际请求字节和压缩头。恢复当前 Host、直接设置路径、文件 HTML 预览、语言切换与快速关闭/重开都需回归。测试使用隔离账户/Host 或协议替身，不向真实会话发送消息或调用模型。发布后另核对实际 sourceRevision/health 和匿名页面，不以本地结果替代真实生效。

## Initial calibration (2026-10-16)

必须同时保留 Rolldown `strictExecutionOrder` 与 `preserveEntrySignatures: allow-extension`：显式分组关闭递归依赖收集后，缺少执行顺序保护的试验产物曾出现初始化错误，已废弃。预算从最初试算3.5MB校准到3.7MB，覆盖此执行保护及必需provider完整根集合；初版图约3.61MB JS、232KB CSS、1.074MB gzip，但发布复核发现其中遗漏异步HTML引导的main.tsx入口，故这些不是完整Bootstrap覆盖数字，已由下述补正替代。通用vendor小组20KB合并曾将可选依赖带入关键图至5.95MB，被门禁拒绝；不采用该策略。

隔离 Chromium、390×844、4倍CPU限速、3Mbps/80ms的同场景测量：旧版启动实际JS约5.49MB、传输约6.56MB；治理后约3.115MB、1.069MB。旧版弱网三次21.26–21.35秒，治理版约5.2–5.5秒到可输入区域；最终精确值及版本保存在任务证据，不承诺不同设备复现相同绝对时延。请求数从旧版46增至90，是保持按需边界与缓存稳定性的代价；弱网测量包含该代价。受控可选扩展名称变更的关键缓存失效由首轮2.12MB降至约763KB，仍有业务Shell引用传播，并非零失效。

真实发布构建已检查匿名首页、直接设置路径、模型服务、账户、连接器及记忆入口；页面代码/当前语言按需到达，其他字典未随首页下载。登录、远端Hermes及手机瓦数/电池续航仍需各自的真实环境验证。浏览器限速只证明传输和启动工作减少，不能换算为省电百分比。

iOS离线 Bot runtime保留单可执行HTML的打包约束，避免依赖网站取脚本；这份离线资源不套用网络拆包预算。Native账户根布局不再提前读取整个HTML，首次挂载MobileBotHost时才由asset loader获取并缓存；读取失败仍可重试。此项只移除无使用者的预读，不宣称降低首次打开Bot WebView的全部解析成本，实际手机启动和内存仍需实机测量。

### Bootstrap coverage correction

HTML本身是薄引导器，动态载入的 `apps/workbench-web/src/main.tsx` 仍属于Bootstrap必需根。构建根集合显式覆盖main、Workbench entry、必需provider与embedded入口；只把HTML的JS facade标为root会漏掉主入口CSS。发布核查发现此遗漏后，新增根匹配回归，并把完整静态关键CSS预算校准为700KB、gzip为1.2MB。JS3.7MB/120请求、受控缓存900KB与禁止功能模块规则不变。原浏览器实测的传输/时延数字不依赖静态报告，仍有效。

补正后同场景双构建保守并集为JS3,611,874B、CSS677,212B、gzip1,132,713B（受控变体1,132,721B），受控关键JS失效771,441B，均通过上述门禁。新增main根正例/可选main负例后startup共9项通过。

发布后匿名首页后续约832KB CSS包含Required和Optional两段：444915B主入口CSS必须进入静态关键预算；其余Optional激活产生的样式是后台启动成本，仍计入浏览器实际请求测量，不能借“静态图”口径隐去。热缓存时观察到额外embedded内联样式JS参与加载，故不能把冷启动单次3.11MB当作所有后续访问的固定上限；真实页面与多入口保守预算分别记录。

The demand-loaded math renderer has its own build group. It must not be merged
with small required protocol modules: that merge also promotes KaTeX CSS into
the startup closure. The source-level demand gate checks the renderer, and
actual default/product builds retain the same byte and request budgets.

Build-selected browser plugins use a dedicated compatibility TypeScript
program covering Web and plugin sources with uniform ESNext and DOM declarations.
ESNext describes APIs for the checker; existing browser/ECMAScript policy still
rejects unsupported APIs and is not raised. The actual runtime graph continues
to select linted files, including lazy plugins supplied by a trusted factory.

### Typography stylesheet ownership

`tokens.web.scss` owns the generated global typography variables. Component role
mixins consume the generated, CSS-free role metadata, so importing the mixin does
not re-emit the global `:root` projection into each component chunk. Both generated
outputs derive from the same typography registry and share the freshness check;
font values, utilities and startup budgets are unchanged.
