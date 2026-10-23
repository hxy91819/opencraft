# OpenCraft 服务文档

OpenCraft 是多端 Agent Workbench 核心，包含 Chat Runtime、Web Workbench、Expo 客户端、Electron 桌面壳和 AppServer 适配层。下游产品/Hermes 产品与 Agent Console 共享适配由下游产品持有；公开核心保持独立运行时、包管理器、构建矩阵和发布所有权。

## 权威入口

- 服务所有权、依赖和生成路径：[仓库元数据](../config/catalog-info.yaml)。
- Agent 工作规则：[AGENTS.md](../AGENTS.md)。
- 项目维护方法与验收路由：[OpenCraft 维护总纲 Skill](../.agents/skills/opencraft-maintenance/SKILL.md)；不替代下列正式架构文档。
- 仓库历史与下游消费契约：[仓库历史与下游消费](upstream-history.md)。
- 平台与插件架构：[平台架构](platform-architecture.md)、[插件架构](plugin-architecture.md)。
- 运行观测平台：[定位、服务与数据/CLI/Skill 规格 V1](observability-platform.md)、[功能与非功能验收矩阵](observability-acceptance.md)；当前为待实现规格，最终以真实部署验收为准。
- 主体与协作设计纲领：[原生主体、Hub、Channel 与授权](architecture/actor-collaboration.md)；人类与 Agent/Bot/Session 具备原生主体性，权限独立授予；属于目标设计，不代表多租户已实现。
- 存量会话的 Skills 目录刷新：[实现边界与验收标准](session-capability-refresh.md)；正文版本更新与 Hermes 自动热刷新已取消，Connector 按下列独立文档推进。
- 平台级 Connector：[机制、已实现链路与剩余范围](platform-connectors.md)；由平台运行时持有连接与授权状态。
- 跨端存储生命周期：[SQLite / IndexedDB 升级与恢复](sqlite-lifecycle.md)、[插件持久化契约](plugin-persistence.md)、[Host 通用文档 API](host-document-storage.md)；九个自有 Node SQLite 库已接入账本/备份/旧库处置，Host 五库启动期门控并投影健康摘要；回退只回退代码，不自动恢复备份，不承诺 N-1 兼容，不引入 Drizzle。
- Chat 与浏览器 Workbench：[Chat 架构](chat-ui-architecture.md)、[浏览器 Workbench](browser-workbench-architecture.md)。
- 执行所有权：[会话、运行实例与能力租约](execution-ownership.md)；明确创建提交、执行准入、断线撤销、释放及 warm 边界。
- Tasks 与看板：[领域模型](tasks-model.md) 与 [实现入口](../plugins/tasks/README.md)；两张业务表，同源列表/看板、多会话关联与独立活动状态，首版源码已实现。
- 构建目标：[构建矩阵](build-matrix.md) 与 [目标配置](../config/build-matrix.json)。
- iOS 手机端容器与手势：[Mobile shell](mobile-shell.md)；打包的 frontend Bot runtime 与原生通信：[Embedded Bot bridge](mobile-bot-bridge.md)；缓存与请求状态：[Mobile data architecture](mobile-data-architecture.md)。
- 行为验证架构：[Harness 设计纲领](architecture/harness.md)。
- 根目录与文件归属：[仓库布局](repository-layout.md)。

## 核心不变量

- GitHub 是目标核心上游，下游产品持有私有装配并消费固定版本；状态见 [迁移状态](upstream-transition.md)，不建立两套可写核心。
- `opencraft/` 保持独立 npm workspace 和锁文件，`frontend/` 保持独立 pnpm workspace 和锁文件。
- AppServer 事件游标、投影状态和 durable history 的生命周期必须一致；Hermes 转译遵循 Hermes Desktop 语义，Chat Runtime 统一 Turn、queue、steer、工具活动和滚动所有权，各引擎适配保留其原生协议与能力边界。
- Web、Expo 与 Electron 共享领域模型和设计 token，但平台能力通过显式 adapter/port 接入，不能用平台条件分支破坏核心状态机。
- 下游产品工作区中的机械生成过渡兼容层由该产品持有，源码所有权在其前端服务；生成目录禁止手改。

## 变更边界

下游产品可以消费 `frontend/` 中显式列入同步闭包的 UI、domain、repository 和 locale 实现。新增跨服务复用优先提取稳定 workspace package；在包边界完成前，必须同步生成物并通过 drift check。OpenCraft 的 CI 只做安装、校验和构建，不发布 frontend、不修改 GitOps，也不推进任何生产环境。

## 验证

在仓库根目录运行：

```bash
npm ci
npm run gate
```

下游产品工作区的 Console 同步与原探针在产品目录运行显式命令，不是独立核心的前置依赖。

只改局部包时可以先跑相邻类型检查和聚焦测试，但跨包、共享前端、协议、构建矩阵或平台入口变更必须完成全门禁。发布需要单独、明确授权，构建通过不代表已经发布。
# 任务工作区设计

OpenCraft 工作区的所有权、呈现策略、不变量及验证账本见 [design/](../design/README.md)。
