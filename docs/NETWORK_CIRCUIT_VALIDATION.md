# 专线与网络页面验证

日期：2026-10-26。前后端工作分支：`arco-design-vue`。环境：本地 Docker、Go/Gin、PostgreSQL、Vue 3 / Arco；Chromium 浏览器连接本地前端。此次工作未提交或推送。

专线功能、设备/专线列表对齐及操作日志日期布局的实现和代码复核已完成；当前诊断页按保留的较新代码完成交互与溢出验证。独立 finish review 首轮只要求更正设备 brief 中的旧文件名及外观记录；同一 reviewer 复核该修正后给出 `ship`、remaining clear。此次 verdict 仅覆盖这一文档修正，沿用首轮完整评审的范围，不扩大界面或真实系统验收结论。共享 `DESIGN.md` 与 `.impeccable/design.json` 保持原字节。

入口：[专线管理](http://localhost:9527/#/network/circuit)、[设备管理](http://localhost:9527/#/network/device)、[操作日志](http://localhost:9527/#/admin/sys-oper-log)。业务约定见 [专线规格](../../docs/superpowers/specs/2026-10-26-network-circuits-design.md)，配置与快照同步说明见 [Docker 开发说明](../../README.docker.md)。

## 实现与接入边界

- 专线支持检索、新增、编辑、详情、规划中删除、当前筛选内有权记录的完整 CSV 导出、A/Z 两端和已有 Zabbix 主机及入出站监控项绑定。只有规划中记录可删除，终止状态不能恢复；线路编号包含已软删除记录在内保持唯一。
- 所有读写受动作权限和数据范围约束；端点设备必须可读。修改与删除采用版本 CAS。重复编号返回业务 422，保留草稿以便改正；409 专用于并发版本冲突。精确注册路由校验防止详情 `/:id` 权限覆盖独立的 `/export` 或 `/options` 动作。
- 绑定变更先核验主机归属、监控项归属、数值类型、启用状态及 `bps` / `Bps` 单位，再写入数据库；名称由后端从上游解析。未改变的绑定允许在上游不可用时维护其他台账字段，清空绑定无需上游读取。
- 使用用户指定的 [Deepreo/gozabbix](https://github.com/Deepreo/gozabbix) 本地克隆：`/Users/wenwu.yan/Works/go/gozabbix`，分支 `motor-circuit-readonly`，上游基点 `432897ae0c316a0f7f662c157ef521bd76548b34`。原 GPL-3.0 `LICENSE` 与模块声明不变。有限补丁处理响应上限、JSON-RPC 信封验证、原子解码、拒绝重定向及安全 HTTP 错误；保留现有 context、Bearer 和可注入传输。
- 后端通过相对 `replace ./third_party/gozabbix` 使用 70 文件可复现快照，`scripts/sync-zabbix-module.py --check` 和逐文件比对通过。根模块测试不进入该嵌套 SDK 模块；SDK 单独验证。没有修改 Go 模块缓存。
- 令牌只在后端；应用限定 20 秒与 4 MiB 响应，前端监控相关请求为 25 秒。上游操作仅限已有 host/item/history/trend 读取，没有创建或修改 Zabbix 配置。

## 流量证据语义

| 数据 | 当前实现 |
| --- | --- |
| 1h / 6h / 24h | 按监控项数值类型读取 history；曲线使用实际样本的分桶均值，观察峰值独立计算。超过 12000 条时标明部分历史，额外探测样本仍参与观察峰值。 |
| 7d | 读取小时 trend；曲线用 `value_avg`，观察峰值用 `value_max`，缺少小时保持空缺，不补造趋势。 |
| 当前值 | 独立读取最后采样及时间；超过 5 分钟的值留空并显示过期，历史曲线仍可存在。缺失/无效值为空，真实零保留为零。 |
| 曲线与单位 | `Bps` 转为 bps；最多 720 个图表点，采样间隔推导缺口；端点、方向、单位、采样时间与部分数据状态可见。入出站用文字及实线/虚线共同区分。 |
| 部分失败 | 各序列独立保留成功结果；未配置、未绑定、空数据、过期、上游错误及截断分别呈现。 |

## 已运行的代码与浏览器验证

| 层次 | 结果 | 证据范围 |
| --- | --- | --- |
| SDK 离线 | `go test -race -count=1 -v ./...` 21 项顶层测试、`go vet`、格式与 diff 检查通过 | 全部 HTTP 测试指向本地 httptest。带标签的上游登录/CRUD 集成文件未执行，不计作运行时 skip。 |
| 后端完整门禁 | `make test`（`go test -race -cover ./...`）、`make fmt-check` 通过 | 最终 RBAC/422 修正后重跑，变更网络包执行；其他包可能使用 Go 测试缓存。 |
| 后端专项 | CAS、重复编号 422、10 角色 × 11 动作权限矩阵的 focused race 回归通过 | 包含默认拒绝、显式通配权限、编辑依赖与管理员；曾失败的权限重叠与重复编号用例修正后通过。 |
| PostgreSQL | 隔离 schema 集成通过并自动清理 | 并发更新唯一赢家、非法绑定不写入、软删编号不能复用；不清理开发台账。 |
| 跨仓检查 | `make checksilent UI_DIR=../go-admin-ui/src`：0 errors / 0 warnings | 本地不存在 core 源码目录，该目录未扫描；不是远端 CI 证明。 |
| 前端完整代码门禁 | 62 文件 / 432 单测、type-check、API 契约、i18n 通过；全量 lint 0 errors / 40 条既有 warnings | 这组完整门禁早于最后日期定位修正；最终日期变更随后通过定向 lint/type、单测和浏览器回归。 |
| 设备 / 专线最终浏览器 | 23 / 23 通过；对齐专项 16 单测通过，定向 lint 无警告 | 在通用“新增 / 导出”修正后重跑；包括权限、草稿/CAS、重复编号重试、11 秒监控请求、绑定、四档流量、空/过期/部分失败与手机动作。 |
| 操作日志 / 共享布局 | 22 / 22 浏览器、2 / 2 英文日志与导出、13 / 13 ProTable 单测通过 | 真实指针编辑两端日期和时分秒；覆盖取消、清除、重置、打开时 resize、320/390px 抽屉边界。 |
| 当前诊断页 | 14 / 14 模拟浏览器用例通过，37.2 秒 | 对保留的 15:20 代码新跑；运行/停止、恢复、权限、iPerf3、键盘、节点资料、窄屏、原文/滚动与任务丢失。没有真实诊断任务。 |
| 最终生产构建 / 体积 | 最后日期定位修正后 `build:prod` 与 `check:size` 通过 | 首屏 gzip 460.35 kB，预算 500 kB。构建通过不等于生产部署。 |

聚合退出码为 `../../.local/circuit-work/final-code-gates.json`、`final-build-gates.json`。完整日志保存在同一忽略目录，本文只记录结果与范围。独立 [功能代码复核](../../.local/circuit-work/code-review.md) 和 [网络对齐代码复核](../../.local/circuit-work/alignment-code-review.md) 均通过，无未解决 Critical、Important 或 Minor 项；早期报告中的构建数值不替代上表最终 460.35 kB。

## 本地 Zabbix 读取与清理

本地 Docker API 对接 Zabbix 7.0.25。验证创建一个明确命名为“接入验证（临时）”的本地规划中专线，绑定已有服务器接口的入出站监控项，读取真实 history/trend。它是接口接入样本，不是真实业务线路。

| 时间段 | 每方向返回点数 | 模式 |
| --- | --- | --- |
| 1 小时 | 20 | history |
| 6 小时 | 120 | history |
| 24 小时 | 480 | history |
| 7 天 | 168 | trend |

两方向在验证时均返回 `ok`、`partial=false`，包含独立当前值、观察峰值及最后采样时间；同时验证后端解析绑定名称、重复编号 422、台账修改、旧版本冲突和筛选 CSV 导出。数据只代表记录的采样窗口。

完成后核对临时记录的编号、名称、规划状态和最新版本，通过应用 API 删除，再次 GET 返回 404；`live-validation.json` 记录 `cleanup.status=passed`、`remainingTemporaryRecord=false`。隔离 `circuit-review` 浏览器的 Cookie、localStorage、sessionStorage 已清除，转到 `about:blank` 后关闭；私密临时记录文件已移除。没有 Zabbix 上游写入，也不将浏览器清理声称为 API JWT 吊销。前后端开发容器最终运行且健康。

## 页面与截图范围

用户选择的质量参照为 `/admin/sys-post` 的 [1440px 桌面](../.impeccable/review/network-circuit/reference-post-desktop.png) 与 [390px 手机](../.impeccable/review/network-circuit/reference-post-mobile.png)。设备、专线直接以标准筛选面板、工具栏和列表开始，沿用原生 Arco 与保存的明暗、强调色、字号、密度和圆角偏好。专线工具栏为“新增 / 导出”（Add / Export），抽屉保留业务标题；设备仍为“同步台账 / 导出”，无手工创建设备 API。

模块名按目录职责组织：设备 `editor.vue` / `detail.vue` / `form.ts`，专线 `editor.vue` / `detail.vue` / `binding.vue` / `endpoint-editor.vue` / `form.ts` 及流量文件，诊断 `output.vue`。设备/专线共同的标签和触控样式位于 `network/shared/input-label.ts`、`drawer.scss`、`list.scss`；它们不定义私有色板。旧设备外观 helper 与其对比度测量仅作为历史记录。

日期控件保留 `YYYY-MM-DD HH:mm:ss` 和原有查询语义；窄屏将两端输入分行，弹层按测量的可用空间采用原生锚定与内部滚动，确认栏可达。独立指针检查实际提交 `2026-08-05 08:09:10` 至 `2026-08-28 17:18:19`；Escape 不查询，清除同时移除两个日期键，重置只查询一次。共享筛选抽屉的 padding 选择器修复后，在 390px 和 320px 均无右侧越界。

诊断页的 15:20 较新代码保留紧凑控件和固定深色终端；用户获知保留边界后回复“继续”。本轮评估当前交互与溢出，不声称其完成 sys-post 原生外观对齐或与旧视图脚本相同。15:09 原生卡片版报告/截图已失效于当前版本，新的浏览器日志和 `diagnostics-current/` 截图才用于本轮验收。

| 截图组 | 路径 / 数据来源 |
| --- | --- |
| 设备、专线及抽屉 | [network-aligned](../.impeccable/review/network-aligned/) 中 `device-*`、`circuit-*`；主要列表/详情/编辑/绑定/流量使用本地 API、既有 Netdisco 快照及上述临时专线。 |
| 专线异常与英文 | `circuit-mock-*`、`circuit-english-*`；仅对 `/api/v1/network-circuit` 使用隔离响应模拟，明确覆盖空、错误、未配置、过期/部分数据、长英文与键盘。 |
| 日期与共享抽屉 | `oper-log-*`、`shared-device-filter-390.png`；现有 mock fixtures，1440/390/320px，另有 320×568 短屏、英文暗色和 18px 偏好。 |
| 当前诊断 | [diagnostics-current](../.impeccable/review/network-aligned/diagnostics-current/) 13 张；1440/1280/900/390/320px，模拟任务及节点结果。 |

精确 50 张路径及每类滚动/视口说明见 [finish evidence](../../.local/circuit-work/finish-evidence.md)。主任务和 finish reviewer 均逐张打开最终图片，另外检查了两张 sys-post 参考。抽屉、短屏日历和会话部分截图有意滚动；诊断 `desktop.png` 包含下载悬停提示，细 NProgress 线不表示控件仍未加载。设备/专线抽屉截图仅早于工具栏通用措辞修正，抽屉实现未再改变，最终列表与英文/模拟图已使用最终文案。所有截图仅为验证资产，没有 shipping raster。

## 设计记录与剩余范围

- 当前设备、专线、诊断页面规则分别记录在 `.impeccable/surfaces/src-views-network-{device,circuit,diagnostics}-index-vue.md`；不将页面局部变化提升为全站新规则。
- 本轮仅运行一次 detector，七项发现为保留诊断终端的两处颜色、既有日志等宽字体与四项既有 ProTable 颜色/圆角。未重跑或通过修改设计文档使其消失。此前设备 `[]` 结果与诊断旧扫描属于历史版本。
- `DESIGN.md` SHA-256：`3a3136ba3d4427a6273e12c231ca4cfbecd1431b435a3f9b13baf31a664cb493`；`.impeccable/design.json`：`7a9ac9537b347fdabb39914df7b43ff08a0b609c755acdb92a284e8b52613a39`。普通 Operate 扩展未修改两份文件。
- [首轮完整 finish review](../../.local/circuit-work/finish-review-initial.md) 保留原检查范围；[同一 reviewer 的最终 verdict](../../.local/circuit-work/finish-review.md) 确认唯一设备文档修正 resolved、remaining clear，disposition 为 `ship`。最终 pass 只重读了该 brief，并确认两份验证文档存在，不代表重审全表面或新增真实系统验证。
- 本地真实读取、离线 SDK、数据库隔离测试、模拟 UI 与截图分别限定证据范围；未执行真实业务专线验收、真实诊断任务、生产迁移/部署、远端 CI，未进行上游配置写入。本轮未重新执行 Netdisco 同步。
- 本地后端曾因 core WebSocket 日志监视器缺少 `go-admin/temp/logs/job/db-20200820.log` 而退出；主任务创建该被忽略的空开发日志文件并重启，服务恢复。没有修改 core 或任务配置；这是本地运行恢复证据，该既有日志监视问题未做源码修复。
- 未验证物理手机键盘或其他浏览器引擎；日期局部样式依赖当前 Arco DOM，升级需保留实际点击与几何回归。已有 `config-build-path-unset` 提示和无关 `AGENTS.md` 参考漂移仅记录，没有扩大修改范围。

## 复验入口

在仓库顶层使用既有 Docker 环境；无需在命令中写入令牌：

```sh
docker compose -f docker-compose.dev.yml -f docker-compose.account.yml exec -T backend sh -lc 'make test && make fmt-check && make checksilent UI_DIR=../go-admin-ui/src'
docker compose -f docker-compose.dev.yml -f docker-compose.account.yml exec -T frontend sh -lc 'pnpm test:unit && pnpm type-check && pnpm lint && node scripts/check-api-contract.mjs --require-models && pnpm check:i18n && pnpm build:prod && pnpm check:size'
```

在 `go-admin/` 运行 `python3 scripts/sync-zabbix-module.py --check` 验证快照；SDK race/vet 需在本地克隆的独立 Go 模块中运行，不能以根模块 `./...` 代替。浏览器 mock 回归在 `go-admin-ui/` 运行：

```sh
PW_REUSE_SERVER=1 pnpm exec playwright test --project=mocked --workers=1 tests/e2e/mocked/network-device.spec.ts tests/e2e/mocked/network-circuit.spec.ts tests/e2e/mocked/network-diagnostics.spec.ts tests/e2e/mocked/sys-logs.spec.ts tests/e2e/mocked/protable-layout.spec.ts
```

这些命令是复验入口；本文上表记录的是分批实际执行的结果，不声称曾运行这条合并浏览器命令。
