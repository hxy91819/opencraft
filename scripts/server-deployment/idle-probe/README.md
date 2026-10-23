# join-core idle probe（R3 v2 候选的版本化交付，2026-10-23）

来源链（candidate→受控真源）：
1. 候选原型与全部 16 例证：checkout `/data/code/mono2-worktrees/feat-join-token-usage-fix-and-ui-20261022/.amp/in/preflight-cand-20261023/`（本地 exclude，不入库）：
   probe.source.mjs=cc33209c1071469cb3a92978948f08171dc1d65c4e21207e6b982e2af01719da、preflight-cand.mjs(bundle)=64e8b625416d26bdfbe9c142f968fd613991a5277be0e412dbc5dd11ceb0a119、fixture=5455ac0e…、legacy=48c3f3ba…、runner=786a159f6d4fe1501cd806d9ee9bd120bbb0b3b9547b328ebca2e0dc53fa081b；
   回执：tests/results-20261023-094006.log（初终跑 14+T0b/T1 计=16 实案）与 results-20261023-094248.log（T1 父壳断言收紧后复终跑，主管家 thr_j43cwax2t5 亲自复跑 16 例一致）。
2. 本目录 = 相同实现迁入受控真源（沿 opencraft/scripts/server-deployment 既有结构；差异仅：版本常量改为静态 import opencraft's packages/app-host-protocol/src/version.mjs、ws 正常静态 import、bundle 走 opencraft/build/idle-probe/（gitignore build/）、fixture/runner 路径随迁，无逻辑改动）。
3. 构建：`node opencraft/scripts/server-deployment/idle-probe/build-idle-probe-bundle.mjs`（依赖取自本 checkout opencraft 安装，非跨 worktree）。产物不入库（build/），交付核验以 sha256 记录。
4. 复跑：`bash opencraft/scripts/server-deployment/idle-probe/run.sh`（TMPCHOICE 缺省 /data/tmp；每案唯一临时根+显式 kill/wait+pgrep 残留断言）。

最小集成差异建议（原 final-idle.py 外层 waiting/goals/queued/retainedUnknown 门槛保持原文不动）：
- final-idle.py L3 的 preflight 调用替换为 idle-probe（同端点 ws://127.0.0.1/apphost）；
- 保留硬契约：initialize→thread/loaded/list→逐 loaded thread thread/read(includeTurns:false)→active/unknown 统计；missing/unknown/畸形一律非 idle（退出 2）；协议/包络/连接失败立即失败并清 timer（退出 3）；成功 ACK 不代替业务回执；ready 版本不符立即非零。
- 线上安装由代码 lane 版本化交付（版本化文件+sha256），主管家择机执行；本候选不冒称线上 gate 已修复。

未验证边界：真实 Core 上的完整门禁未跑（本轮不 host/connect、不触真实会话、不激活/重启 Core、不造空窗、不处理 unknown=3）；迁移后无损回退无契约；真实会员客户端置顶验收未做。
