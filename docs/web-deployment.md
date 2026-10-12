# Web 安装与一键更新

公司 npm 包 `@tencent/opencraft-web` 包含网站、Web 服务和更新器。Node.js 22 或更新版本和 npm 是运行前提。DSH/Codex 执行服务独立部署，通过 WebSocket 地址接入；此包不创建、升级或重启执行服务。

直接从源码打包并替换已有服务器网站，见[本地替换指引](web-local-deployment.md)；该流程使用本地包，不需要先发布 npm。

## 首次安装

在部署用户自己的 npm 配置中设置公司源和认证；认证凭据只留在服务器，不写入网页或仓库：

```ini
@tencent:registry=https://mirrors.tencent.com/npm/
```

首次试运行（将版本与执行地址替换为实际值）：

```sh
OPENCRAFT_APPSERVER_URL=ws://127.0.0.1:9989/rpc \
OPENCRAFT_WEB_STATE="$PWD/opencraft-web-state" \
npx --registry=https://mirrors.tencent.com/npm/ \
  "@tencent/opencraft-web@${OPENCRAFT_RELEASE_VERSION:?设置精确安装版本}"
```

长期运行时固定安装启动包，避免每次服务启动重新解析 `latest`：

```sh
npm install --prefix /opt/opencraft-web/bootstrap --ignore-scripts \
  --registry=https://mirrors.tencent.com/npm/ \
  "@tencent/opencraft-web@${OPENCRAFT_RELEASE_VERSION:?设置精确安装版本}"
```

使用包内 `opencraft-web.service` 作为 systemd 模板，核对 Node 路径与运行用户；配置 `/etc/opencraft-web.env`：

```ini
OPENCRAFT_WEB_HOST=127.0.0.1
OPENCRAFT_WEB_PORT=10000
OPENCRAFT_WEB_STATE=/var/lib/opencraft-web
OPENCRAFT_APPSERVER_URL=ws://127.0.0.1:9989/rpc
OPENCRAFT_PUBLIC_ORIGIN=https://opencraft.example.com
OPENCRAFT_NPM_REGISTRY=https://mirrors.tencent.com/npm/
# 可选：指定部署用户的 npm 配置文件
# OPENCRAFT_NPM_USERCONFIG=/home/deploy/.npmrc
# 可选：Codex 使用独立地址
# OPENCRAFT_CODEX_APPSERVER_URL=ws://127.0.0.1:9988/rpc/codex
```

反向代理将 HTTP 和 WebSocket 一起转发到网站端口，不过滤 `/__opencraft_updates`；保留已有的域名访问认证。执行服务放在另一 systemd unit/cgroup，网站 unit 不得使用会停止执行服务的 `PartOf`、`BindsTo` 或升级脚本。

## 网页操作

首次启动会在状态目录生成权限为 `0600` 的 `admin-key`，终端只显示文件位置。“设置 → 网站更新”直接显示“检查更新”，访问者无需部署密钥即可查询公司 npm `latest`。部署管理员读取该文件并授权管理后，可以安装更新、回退上一版。管理登录有效期一小时；需要同源 JSON 请求。

发布者按下文[内网 npm 发布流程](#内网-npm-发布流程)验证并上传精确 tgz。发布不会自动更新用户部署；用户点击“检查更新”读取最新版本，再点击“更新网站”安装已检查的精确版本与 integrity。npm 访问失败会在页面显示，当前网站继续运行。打包命令不执行发布。

## 内网 npm 发布流程

在本项目中，用户说“发布内网 npm”或“发布公司 npm”，目标是 `@tencent/opencraft-web`，源为 `https://mirrors.tencent.com/npm/`，默认渠道为 `latest`。这授权上传已验证包并完成发布后验收；沿用该授权继续，不为同一步骤重复确认。用户指定其他包或渠道时以当前指令为准。“检查更新”和“补文档”按各自任务范围执行。

用户已确认 OpenCraft 与相邻 TokenJuice 使用同一套 npm 凭据，允许直接复用其私有配置。优先使用 `OPENCRAFT_NPM_USERCONFIG` 指定的配置；未指定且相邻 checkout 存在时使用 `../tokenjuice/.npmrc`；其他部署使用部署用户自己的 `.npmrc`。只向 npm 传文件路径，凭据留在原文件，不复制到仓库、包、网页或日志。TokenJuice 的 `publish-to-tencent.mjs` 实际只打包和本地安装，远程发布使用下面的 `npm publish`。

1. **确定发布对象。** 检查分支、`git status --short`、`git worktree list`；读取 `package.json`、`packaging/web-server/package.json` 和打包脚本。版本以公司源实时查询为准，包模板的版本不是已发布版本。优先发布用户已认可且通过验证的精确 tgz，核对原 SHA256/SRI，避免重新构建时混入后续并行修改。需要新版本而用户未指定时，查询 latest 和已占用版本，选择下一个未占用 patch 版本并在进度中说明。新的包版本与 buildId 一起记录。
2. **确认公司源可用。** 通过以下配置查询身份与版本；缺少权限只阻塞远程发布，保留已准备的包和验证证据。包不存在的公司 `E400` 提示不是凭据失败。npm 输出只提取必要字段；错误摘要先脱敏，不保存或展示原始凭据及错误输出。

   ```sh
   registry=https://mirrors.tencent.com/npm/
   npm_userconfig="${OPENCRAFT_NPM_USERCONFIG:-$HOME/.npmrc}"
   if [ -z "${OPENCRAFT_NPM_USERCONFIG:-}" ] && [ -f ../tokenjuice/.npmrc ]; then
     npm_userconfig="$(realpath ../tokenjuice/.npmrc)"
   fi
   npm whoami --registry="$registry" --userconfig="$npm_userconfig"
   npm view @tencent/opencraft-web dist-tags versions --json \
     --registry="$registry" "--@tencent:registry=$registry" --userconfig="$npm_userconfig"
   ```

3. **构建与验证。** 复用已验证 tgz 时保持其内容和版本；新构建从当前 checkout 生成，显式写入来源 commit，dirty 工作区追加 `-dirty`。先选择精确版本并设置 `OPENCRAFT_RELEASE_VERSION`，然后执行：

   ```sh
   : "${OPENCRAFT_RELEASE_VERSION:?设置待发布的精确版本}"
   export OPENCRAFT_SOURCE_REVISION="$(git rev-parse HEAD)"
   if [ -n "$(git status --porcelain)" ]; then
     export OPENCRAFT_SOURCE_REVISION="$OPENCRAFT_SOURCE_REVISION-dirty"
   fi
   export OPENCRAFT_WEB_PACKAGE_OUTPUT="$PWD/.local/web-packages/$OPENCRAFT_RELEASE_VERSION"
   npm run typecheck --workspace @opencraft/workbench-web
   npm run check:i18n
   npm run test:web-release
   npm run test:web-updates
   npm run test:web-updates:e2e
   npm run package:web:server
   ```

   浏览器首次使用先运行 `npx playwright install chromium`，也可设置 `OPENCRAFT_CHROMIUM_EXECUTABLE`。按变更范围补相关门禁和项目要求的独立审查；已验证且内容未变的包复用原证据。`test:web-updates:e2e` 会重建网站，打包也会重建；最终以打包输出的 buildId/tgz 为准。核对包名、精确版本、包 metadata、网页 `version.json` 与 HTML buildId 一致，检查归档中凭据和本机记录已排除，记录 SHA256/SRI。启动最终自包含包做健康探针并核对 buildId；浏览器检查使用隔离状态，不替换用户运行实例。

4. **发布精确归档。** 将 `tgz` 设为上一步打包输出 JSON 的 archive 路径。显式指定公司源与 scope，发布已检查的 tgz：

   ```sh
   : "${tgz:?设置已验证的 tgz 路径}"
   npm publish "$tgz" --tag=latest --ignore-scripts --provenance=false --json \
     --registry="$registry" "--@tencent:registry=$registry" --userconfig="$npm_userconfig"
   ```

   npm 上传响应不确定时先查询该精确版本和 integrity：远端已存在且一致则继续验收；已存在但内容不同则保留现场并说明版本冲突，另选新版本。记录上传与 latest 渠道状态。发布包与安装更新是两个操作；仅发布时保持运行服务和执行进程不变。
5. **验证可分发和可发现。** 用 `createNpmReleaseSource`（`scripts/web-deployment/releases.mjs`）查询公司 latest、下载刚发布的精确版本、校验 SRI/SHA256，并用 `unpackRelease` 校验版本和 buildId。已有部署时在真实页面运行：

   ```sh
   OPENCRAFT_WEB_TEST_URL=https://opencraft.example.com \
   OPENCRAFT_WEB_EXPECTED_LATEST="$OPENCRAFT_RELEASE_VERSION" \
   npm run test:web-updates:live
   ```

   URL 使用实际部署地址；预览认证参数见下文。该测试只检查，不安装。部署已运行同版本时 `updateAvailable=false` 正常；旧版部署应发现新版本。没有可访问的真实部署时，交接明确仅完成源查询/下载，页面尚未验收，不用模拟结果替代真实页面。

完成交接包含包名/版本/渠道、构建来源与 dirty 状态、buildId、SRI/SHA256、远端查询与下载结果、真实页面验收、是否安装或重启。机器路径、实际部署信息和日志记在 Git 忽略的 `.local/`；发布方法留在本文件。Git 提交/推送与 npm 发布分别记录，避免把本机未提交文档当成其他 checkout 已具备的入口。

## 连续性与回退

更新器保持入口进程运行，新版网站在独立进程通过健康检查后切换新请求。已有 WebSocket 留在原网站进程，关闭后该进程退出；更新任务清理不再被当前版本、上一版、运行中进程或磁盘状态引用的历史版本目录；旧页面需要的历史静态 chunks 保留。页面不会被强制刷新，可在工作完成后点击“刷新页面”。更新任务不依赖浏览器连接，页面关闭后仍继续。

初始网站会复制到可写状态目录；固定启动包可保持只读。安装失败保留原版；切换记录原子写入状态目录。服务重启读取上次已安装版本，未完成任务标记失败，不重发聊天或更新。回退同样先启动、检查上一版再切换。如持续磁盘错误导致状态恢复失败，页面明确提示，可能被状态引用的版本目录会保留；修复存储后重试更新或按 deployment.json 中 previous 恢复。保留状态目录和固定启动包可恢复部署；切勿删除正在运行的版本目录。

更新范围是包内网站 worker 与 Web 代理。稳定入口/更新器本身不在此次热更新范围；新包必须使用 worker protocol 1，不兼容版本拒绝安装。入口维护升级需要单独安排服务重启；执行进程仍独立，但入口连接会重连。执行服务升级仍需自己的排水/切换方案，不能由网站更新承诺不中断。

## 检查结果与浏览器回归

公司源在包不存在时返回 `E400` 和明确的包不存在提示，标准 npm 源通常返回 `E404`。更新器将这些结果显示为“暂无发布版本”，不会误报为凭据故障，也不会允许安装。认证失败、网络故障、npm 缺失和其他源错误分别显示原因；服务器的原始 npm 输出及凭据不会发送到页面。检查失败时显示“检查失败”，不会继续显示“尚未检查”。

安装测试依赖和浏览器后运行完整生产网站的 Playwright 回归：

```sh
npm ci
npx playwright install chromium
npm run test:web-updates:e2e
```

也可设置 `OPENCRAFT_CHROMIUM_EXECUTABLE` 使用已安装的 Chrome。该命令先构建生产网站，再测试匿名检查、公司源包不存在、认证/网络/源错误及重试、检查时密钥草稿和布局保持、管理员安装/回退、已有执行 WebSocket 连续性、失败保留原版，以及新页面实际加载的构建。测试使用独立状态目录、本地 npm 源和执行端点，运行真实 npm CLI 与包内 worker，不发布包、不启动模型推理。HTML 报告与失败 trace 放在 Git 忽略的 `.local/playwright/web-updates/`。WebSocket 回显证明代理连接保持，不能替代真实 DSH/Codex 执行连续性验证。

真实部署另有只读检查，必须显式指定预期发布结果：

```sh
OPENCRAFT_WEB_TEST_URL=https://opencraft.example.com \
OPENCRAFT_WEB_EXPECTED_LATEST="${OPENCRAFT_WEB_EXPECTED_LATEST:?设置精确版本或none}" \
npm run test:web-updates:live
```

它在真实页面点击检查，等待 npm 查询完成，断言发布结果、无查询错误以及页面/服务构建一致；不安装或回退。测试环境使用自签名证书时允许忽略证书错误，仅限此测试浏览器。预览网关登录可通过 `OPENCRAFT_PREVIEW_USERNAME`、`OPENCRAFT_PREVIEW_PASSWORD_FILE` 提供；登录测试不记录 trace、视频或失败截图，避免保存真实凭据。内部域名可通过 `OPENCRAFT_HOST_RESOLVER_RULES` 设置测试 Chrome 的域名映射。
