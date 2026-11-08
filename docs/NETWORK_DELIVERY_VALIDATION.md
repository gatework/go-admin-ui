# 网络设备配置批量下发验证

日期：2026-10-26。入口：`/network/delivery`（菜单 `NetworkDeliveryManage`）。

## 交付范围

参考 Ruby Motor 的工单流程，接入当前 Go API、PostgreSQL、设备台账与 Arco 页面：

- 设备清单 / 任务清单两个 Tab。先从设备分组树定位区域，再按角色、厂商、型号过滤，跨区域和跨页勾选目标。按设备角色与 CLI 平台分组写配置，单台差异单独保留，核对实际脚本后提交。
- 提交后进入 10 分钟缓冲期，支持修改、取消和立即执行；按目标展示状态、已确认命令数、脚本与输出。
- 从厂商、OS、型号和设备分类自动识别驱动，默认 SSH/22，无需逐台创建连接配置。未知平台或特殊连接才调整；凭据由服务器统一维护。默认每个进程、每个租户库并发 5 台。
- 数据权限、八项操作权限、版本冲突和幂等提交；失败重试生成关联工单。重试原工单使用稳定请求标识，回包丢失后重新打开仍恢复同一张关联工单。
- 持久化调度、逐命令回执及跨进程设备锁；取消不回滚已发送命令，结果待核对的目标不自动重发。

单批最多 100 台，单台脚本最多 64 KiB，整批脚本最多 4 MiB。脚本按实际 CLI 顺序执行，进入配置模式和保存配置均由脚本明确指定。

## 自动验证

使用项目 Docker 环境（Go 1.27.2、Node 24.22.1）。宿主机 Node 26 的实验性 localStorage 行为导致旧存储测试失败，切换项目运行时后通过；未为此修改共享存储逻辑。

| 检查 | 结果与范围 |
| --- | --- |
| `go test -race -cover ./...` | 通过；包括应用、公共模块、迁移与工具 |
| `go test -race -cover ./app/delivery/... ./common/middleware ./cmd/migrate/migration/version` | 最终模块回归通过；模拟连接器与 `net.Pipe`，无真实设备连接 |
| `make checksilent UI_DIR=../go-admin-ui/src` | 通过，包含前端菜单名检查 |
| `pnpm test:ci` | 通过；lint 无错误（40 条既有警告）、类型检查、68 个文件 / 466 项单测、API 与语言契约 |
| `node scripts/check-api-contract.mjs --require-models` | 通过，读取当前后端源码和锁定核心模型 |
| `pnpm build:prod` | 通过 |
| 依赖快照校验、Compose 配置与后端镜像构建 | 通过；SSH、Telnet 客户端均在运行容器内可用 |

独立审查修复了整段脚本执行状态丢失、取消时已确认回执漏存、重试回包丢失导致重复关联工单、错误码翻译不一致。全量并发测试发现的超时夹具已改为进入模拟发送后触发超时，连续 100 次 race/coverage 验证通过。

语言检查器补充识别先声明、再传入 `seed.SeedMenus` 的字面量菜单切片；回归测试先失败后通过，避免新菜单被误报为孤立翻译。

## 浏览器与本地 API

真实 Chrome 中验证 1440×1000 明暗桌面、390×844 窄屏、中英文，以及已有用户主题偏好。浏览器 API 夹具覆盖：

- 未就绪设备禁选、批量选择、逐台编辑和切换后脚本保留。
- 创建请求已落库但回包丢失：冻结草稿，用相同标识恢复一个工单。
- 版本冲突保留草稿；取消和立即执行均需针对当前工单确认。
- 重试请求回包丢失后关闭、重新打开：两次请求使用同一标识，只产生一个关联工单。
- 逐台脚本和输出、运行状态、进程中断提示、不确定结果无重试操作。
- 登录元数据保存不包含密码；服务关闭、空列表、只读权限及窄屏编辑。
- 单元测试覆盖详情请求切换、关闭后的迟到响应隔离。

截图与界面验收证据位于 [network-delivery](../.impeccable/review/network-delivery/packet.md)。截图中的 `TEST-ACCESS-*` 和 `192.0.2.*` 为合成数据。窄屏选择器的悬浮按钮遮挡和长状态标签截断已修正。[独立界面评审](../.impeccable/review/network-delivery/finish-review.md) 结论为 `ship`，无待修复项；评审明确接受脚本输入与回显使用本地等宽字体这一局部技术用途。[文档核对](../.impeccable/review/network-delivery/documentation-check.md) 已完成，保留现有用户偏好，`DESIGN.md` 与 `.impeccable/design.json` 未改动。

另以真实本地 API 和浏览器登录验证：菜单可达、工单与设备读取成功、登录配置列表可用。接口当时可见 978 台库存设备；工单数保持 0。下发仍为关闭状态，创建返回 `422 / delivery.disabled`；匿名请求按宿主契约返回 HTTP 200 与业务码 401。在该次验证时，后端与前端容器已更新且健康运行；该记录不代表当前环境状态，最后复拍与收尾状态见下文。

原始日志位于父工作区 `.local/delivery-work/`：`backend-full.log`、`backend-final-scoped.log`、`backend-checksilent-full.log`、`frontend-ci.log`、`frontend-api.log`、`frontend-build.log`、`http-smoke.json`、`browser-real.log` 及 `browser-*.log`。迁移已记录 `1793005000000`，重复迁移无待执行项；保留原数据库和并行设备分组工作。

## 区域选择与角色配置改进

最新交互证据见 [本轮评审包](../.impeccable/review/delivery-roles/packet.md)。桌面 1440×1000、中间宽度 900×950、手机 390×844，中英文与明暗模式均已检查。主链路、权限、上限、冲突与丢失响应验证日志为父目录 `.local/delivery-work/roles-{flow,responsive,edges,real}.log`。

- 设备区域树复用台账分组，包含下级区域；角色、厂商、型号独立过滤，清单直接勾选，跨筛选和跨区域保持已选。超过单批上限时整批选择被拒绝，已有选择不变。
- 配置按角色 + 已解析的平台归组，未设角色才回退类型。组配置仅更新继承它的目标。个别设备可单独调整或恢复组配置；已保存的不同脚本不会被合并覆盖。
- 角色/平台刷新变化时保留原脚本并标记待核对，核对前不能提交。新界面发送已知的角色、类型、平台期望值，后端在提交与每次发送前检查快照；重试沿用原身份。
- 自动推导不创建数据库连接行。人工覆盖可恢复自动模式。查看历史与维护连接的权限独立于创建任务；历史只读用户直接进入任务清单，且不请求设备清单。
- 手机使用当前步骤提示和垂直脚本预览；修正了隐藏任务 Tab 的悬浮按钮透出、步骤文字截断和选择器标签指令挂在非元素根节点的问题。

最新真实本地 API 读取：978 台可见设备、7 个根分组、84 个分类/厂商/型号统计项，首屏连接均来自自动推导；工单数仍为 0，下发关闭。后端已重启加载当前源码，设备写入为 0。

本轮最终日志：`frontend-role-final.log`（完整前端门禁与生产构建），`backend-full-test.log`（全仓无缓存 race/coverage），`backend-focused-test.log`，`backend-checks.log`，`backend-role-menu-check.log`。后端依赖快照 74 + 18 + 25 项校验通过。无新增数据库迁移。原有其他模块的并行修改保留。

### 最后修正与复拍证据

本轮最后调整了两处：390×844 筛选区将区域/角色、厂商/型号各占一行，选中摘要、查看与有名称的清除操作保持一行；相关控件保留 44px 触控高度，首目标的复选框、名称和 IP 在页脚上方。英文设备、角色/平台组、单台例外及组说明使用既有 i18n 复数机制，0/1/2 均经实际运行时编译器核对。

[最终界面 verdict](../.impeccable/review/delivery-roles/finish-review.md) 判定这两项原 material fix 均为 `resolved`，`disposition: ship`；本次 Verdict Pass 只对这两项评分，不代表重新全面审查整个表面。五张手机截图和一张 900×950 截图已替换；`roles-responsive-polish.log`、`roles-polish-bounds.log`、`role-count-copy.log` 保留交互、几何与数量文案证据。[本轮文档核对](../.impeccable/review/delivery-roles/documentation-check.md)另直接抽样五张截图及组件/token 源码，确认现有 Arco 系统和偏好通路保持，`DESIGN.md`、`.impeccable/design.json` 未改动。检测器唯一的本地等宽字体提示仍限 CLI 输入/输出，沿用原评审接受结论；没有重新运行检测器或引入产品位图。

复拍期间 OrbStack `_ping`、`docker ps` 与 `:9527` 请求超时。没有重启共享服务；最终复拍使用同一源码、同一合成 API 夹具的临时 host Vite `:9528`。上文容器健康和真实 API 读取描述属于此前的验证时点，本次复拍不建立共享容器恢复或真实 API 再次可用的证据。主线程收尾已关闭本轮 recapture 浏览器、停止临时 Vite 并确认 `:9528` 无监听；最终 Docker `_ping` 仍超时。

最后界面修正后，宿主 Node 26.9.0 的 type-check、lint、i18n 检查和生产构建均退出 0；lint 保留 40 条既有 warning、无 error。完整 68 文件 / 466 测试在 `NODE_OPTIONS=--no-experimental-webstorage` 下通过，避免 Node 26 原生 storage 遮蔽 jsdom；未修改共享存储逻辑或测试源码。未加该选项时的 storage 失败保存在 `frontend-role-polish-unit.log`，通过的重跑保存在 `frontend-role-polish-unit-jsdom.log`，汇总为 `frontend-role-polish-summary.md`。此前完整容器门禁与后端检查仍单独保留，不将宿主夹具证据扩写为硬件执行验证。

## 启用与证据边界

按父工作区 [Docker 使用说明](../../README.docker.md#网络设备配置批量下发) 配置 `.local/network-delivery.env`，填入服务器端凭据、核验 SSH 主机密钥，再显式启用下发并重建后端容器。主机密钥文件使用独立持久卷。模块参数与异常恢复见 [后端说明](../../go-admin/app/delivery/README.md)。

本轮没有连接、登录或向真实网络设备发送命令。浏览器执行状态来自夹具，协议测试来自本地模拟；这些证据不代表真实厂商设备验收、生产部署或发布完成。现有工作区改动保留，未提交或推送代码。
