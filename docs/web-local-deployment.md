# 从源码打包并替换服务器上的 Web

用于已有 OpenCraft managed Web 服务的服务器：在本机从源码构建、替换网站，保持原 DSH/Codex 执行服务运行。以后在本项目说“打包替换本地 Web”，Agent 按本页执行；本机地址、服务配置、版本和历史证据先查 Git 忽略的 `.local/README.md`。这条路径直接使用本地包，不上传 npm。

当前模式由稳定入口启动版本化网站 worker，`deployment.json` 的 `current.releaseRoot` 决定实际网站。替换时应更新这个指针及固定启动包；`apps/workbench-web/dist` 是构建输出，不是当前服务的运行目录。首次安装及 npm 更新另见 [Web 部署](web-deployment.md)。

## 1. 核对当前部署

在当前 checkout 中检查分支、未提交内容、已有进程。下面服务名和端口是该本地部署模式的示例，以 `.local/README.md` 和实时服务为准：

```sh
git branch --show-current
git status --short
git worktree list
systemctl show opencraft-web.service --property=ActiveState,MainPID,ExecStart
curl --fail --silent --show-error http://127.0.0.1:10000/__opencraft_health
curl --fail --silent --show-error http://127.0.0.1:10000/__opencraft_updates
```

确定网站的状态目录、当前/上一版 release、固定 bootstrap、systemd drop-in、原 Node 路径与执行 WebSocket 地址。记录执行侧 PID/启动时间。网站正在检查或安装更新时，先等该任务结束，再准备替换。

## 2. 构建本地包

使用 `.nvmrc` 对应 Node 和当前 checkout 的依赖。选择本地精确包版本，设置 `OPENCRAFT_RELEASE_VERSION`；核对当前版本与公司渠道，避免未来正式版本号低于本机版本。源码未提交时保留 dirty 标记。

网站服务在每次 HTML 响应中注入 Host 列表与内置扩展开关。`OPENCRAFT_APPSERVER_URL` 提供 `local`（OpenCraft Server），`OPENCRAFT_CODEX_APPSERVER_URL` 提供 `local-codex`（Codex），两者使用同源代理路径；浏览器中已有的 Host 关联保持不变。通用包和公司 npm 包均不需要部署用的 `VITE_*` 构建变量。设置执行地址仍是网站服务的运行时配置，不在页面上填写。

`OPENCRAFT_HYPERNODE_USER` 只作为代理请求头发送，不注入网页，不决定 Host 身份。网站的主端点统一使用 `local`，运行时配置关闭 HyperNode 插件以避免重复 Host。内置 Agent 设置页在存在 `local` 或 `local-codex` 时激活，不包含执行引擎。

`VITE_APPSERVER_HOSTS_JSON` 保留为开发/测试的显式覆盖，优先于网站注入配置；`VITE_WEB_BUILTIN_AGENTS=enabled|disabled` 与 `VITE_HYPERNODE_PLUGIN=enabled|disabled` 也可显式覆盖激活选择。没有注入配置的 Vite/static 部署沿用原默认行为（内置 Agent 未启用，HyperNode 启用）。LightVela 构建不包含这两个插件；Electron 的 Host 来源不变。

```sh
set -e
: "${OPENCRAFT_RELEASE_VERSION:?设置本地包的精确版本}"
export OPENCRAFT_SOURCE_REVISION="$(git rev-parse HEAD)"
if [ -n "$(git status --porcelain)" ]; then
  export OPENCRAFT_SOURCE_REVISION="$OPENCRAFT_SOURCE_REVISION-dirty"
fi
export OPENCRAFT_WEB_PACKAGE_OUTPUT="$PWD/.local/local-web/$(date +%Y%m%d-%H%M%S)"
npm run typecheck --workspace @opencraft/workbench-web
npm run test:web-release
npm run test:web-updates
npm run test:web-updates:e2e
npm run package:web:server
```

打包输出最后的 JSON 给出 `packageRoot`、`archive`、版本、buildId 和 integrity。记录 tgz 的 SHA256；保留旧包，不复用一个已有版本的目录覆盖文件。最终打包会再构建一次，以最终输出为准。

先用最终自包含包在独立状态目录、空闲端口启动探针，沿用原执行地址（下列地址为示例）：

```sh
probe_state="$(mktemp -d /tmp/opencraft-web-probe-XXXXXX)"
OPENCRAFT_WEB_STATE="$probe_state" OPENCRAFT_WEB_PORT=10001 \
OPENCRAFT_APPSERVER_URL=ws://127.0.0.1:9989/rpc \
OPENCRAFT_CODEX_APPSERVER_URL=ws://127.0.0.1:9988/rpc/codex \
node "$OPENCRAFT_WEB_PACKAGE_OUTPUT/package/runtime/cli.mjs"
```

验证 `/__opencraft_health`、`/version.json` 与包内 buildId，并检查 HTML 中的 `opencraft-deployment-config`。真实浏览器确认两个 Host、模型菜单两组及「模型服务」「Codex 账户」设置；不要发送任务。完成后关闭自有探针并删除临时状态。具体 npm 发布验收见 [发布流程](web-deployment.md#内网-npm-发布流程)，本地替换复用其中相关测试，不执行上传。

## 3. 仅替换网站服务

Agent 根据第 1 步发现的实际路径完成以下步骤，保存本次可回退快照：

1. 备份 `deployment.json` 和网站 service/drop-in，并保存旧包位置。将新包复制到新的固定 bootstrap 和状态目录下新的可写 release 目录；旧网站的 `web/assets` 补入新目录，只复制缺少的文件，保留旧页面可能延迟加载的 chunks。
2. 仅停止网站 unit（示例为 `opencraft-web.service`）。停止后再次核对状态文件与准备时一致；若期间被其他更新改写，保留实际指针并恢复服务，重新核对后再继续。
3. 原子写入新状态：`schemaVersion: 1`，`current` 使用新 release 的 `{ releaseRoot, version, buildId }`，`previous` 使用本次替换前的 current，`job: null`。保留其他私有状态文件及 `admin-key`。
4. 将网站 unit 的 `ExecStart` 改为新 bootstrap 的 `runtime/cli.mjs`，保留原 Node、状态目录、执行端点、npm 配置、认证和监听地址。执行 `systemctl daemon-reload`，启动网站 unit。
5. 有截止时间地重试健康请求，容忍启动期间连接失败。健康必须通过，且 `/version.json`、更新接口 current、HTML meta 的 buildId 都等于最终包；仅 `systemctl start` 返回不代表就绪。

网站入口维护会使浏览器 WebSocket 重连；原执行服务、Daemon 和 DSH/Codex 进程保持运行。保持原执行侧 unit 和 Nginx，不把它们加入网站重启操作。当前部署不支持通过本地 tgz 的 HTTP 上传热安装；不要把编辑磁盘指针但未重新加载进程当成已生效。

## 4. 验证与回退

刷新真实浏览器，确认首页、设置页、执行服务连接及此次修改可用；核对页面实际加载的 buildId，比较执行侧 PID/启动时间。查询健康接口的示例：

```sh
curl --retry 15 --retry-connrefused --retry-delay 1 --max-time 3 \
  --fail --silent --show-error http://127.0.0.1:10000/__opencraft_health
curl --fail --silent --show-error http://127.0.0.1:10000/version.json
```

查询成功后仍需比较期望 buildId。已有“检查更新”页面可运行 `npm run test:web-updates:live`；`OPENCRAFT_WEB_EXPECTED_LATEST` 应设为公司渠道的实际版本，它不一定等于刚安装的本地版本。页面测试的环境参数见 [浏览器回归](web-deployment.md#检查结果与浏览器回归)。

替换后健康或真实页面不通过：仅停网站，恢复**本次**备份的状态指针和 unit/drop-in，daemon-reload 后启动，重试直到旧 buildId 和原执行地址就绪。保留旧资源和状态，不删除可能仍被运行/磁盘指针引用的目录。历史 `.local/` 回退脚本可能限定某个版本，不能盲目用于下一次部署。

将 commit/dirty 状态、最终包版本与 buildId、实际运行路径、健康与浏览器证据、执行进程前后状态、替换步骤及本次回退方法写入 `.local/`，更新其 README。源码、构建包和实际运行网站分别交接。本页的示例服务信息不替代实时探针。

## 5. 同时升级执行侧

daemon、协议或启动参数变化时，需要同时升级执行侧；仅网站资源变化不需要重启执行侧。实际 unit、bundle、启动文件、状态目录与备份路径以 `.local/README.md` 为准。

重启执行侧 unit 会停止它拥有的网关、Daemon、DSH 和 Codex，运行中的轮次会被标记为中断。执行侧目前没有排水或新旧版本切换机制；网站独立更新的连续性不能用于说明执行侧重启也不中断。

先备份 daemon bundle、启动文件和相关 drop-in，构建并升级执行侧，按部署要求调整启动参数，再重启执行侧。等待健康通过，并用 `runtime/machine/read` 等匹配本次变更的协议探针确认后，才替换网站。记录重启前后的任务状态、进程身份和探针结果；是否允许中断由本次部署授权决定。

执行侧失败时恢复 daemon bundle 和启动文件，删除本次新增的 drop-in（原有配置恢复备份），重载 service manager 并重启执行侧；等待健康通过，核对恢复后的启动命令与协议。若网站已替换且整体验收失败，同时按本次网站快照回退。保留两侧备份和失败证据，不删除用户状态。
