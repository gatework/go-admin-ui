# 防火墙工作台验证记录

最新验证与本地启用日期：2026-10-30。范围：设备只读登录/配置采集、离线导入、结构化对象、保护范围、批量策略查询与设计草稿。代码位于现有 `arco-design-vue` 工作区；保留此前未提交修改，未提交或推送。当前开发环境已应用在线采集迁移并重启后端。

## 已接通的功能

- 前端三个页面：`/network/firewall`、`/network/firewall/query`、`/network/firewall/design`，复用台账分组、数据权限、Arco 壳及外观偏好。
- 后端 `app/firewall` 分为 API、service、engine、storage、models、types；39 个路由共用权限声明，32 张业务表；新增采集批次/目标表，复用已有连接参数及物理设备租约表。
- Firemon core/adapter 固定为 `v0.0.0-20261029132834-19d1fb999feb`；net-connector 为 `v0.0.0-20261026235641-c68c42b4bbcf`；go-expect 为 `v0.1.1-0.20261026150421-505caf867ed3`。原生不可变快照与 SQL 投影、人工设置和业务任务分工明确。
- 设备分组/筛选 → 测试登录 → 采集任务 → 本次快照/对象/引用 → 从配置填入并确认保护范围 → 混合输入解析 → 后台分析 → 结构化设计草稿已贯通。支持单台/批量、刷新恢复进度、取消及失败重试；原来的离线导入仍保留。
- 待确认/在用设备可只读接入，配置下发仍仅允许在用设备且保留原有开关。七个原生厂商适配器、服务端 `NC_*` 凭据、Fortinet 显式 VDOM、每租户并发 2、最多 100 个目标均已落实。

## 最终验证

| 检查 | 结果与边界 |
| --- | --- |
| `go test ./...` | 最终后端全仓通过，包括引擎、存储、迁移、真实 JWT/Casbin 路由和服务回归 |
| `go test -race ./app/firewall/... ./app/network/connection ./app/delivery/service` 及 native connector/adapter/snapshot 包 | 通过；包含旧 v9 快照读取、采集取消/恢复与不完整当前版本回归 |
| `go vet ./...` | 后端全仓通过 |
| `make checksilent UI_DIR=../go-admin-ui/src` | 0 errors / 0 warnings |
| `go build -o /tmp/go-admin-firewall-final .` | 后端构建通过 |
| PostgreSQL 18 服务测试 | 使用本地 PostgreSQL，服务测试逐条创建/删除独立随机 schema，未迁移或改写业务表；完整 service/storage 命令通过，storage 包自身使用 SQLite |
| `pnpm lint`、`pnpm type-check` | 全仓通过；lint 为 0 errors / 40 条既有 warnings |
| `NODE_OPTIONS=--no-experimental-webstorage pnpm test:ci` | 76 个文件、536 条单元测试通过；类型、API、i18n 检查通过 |
| `pnpm check:api --require-models` | 实际加载 Go 与 core 模型后通过；防火墙多表页面按各自 DTO 校验，避免错误合并字段 |
| `pnpm check:i18n` | 菜单与字典检查通过，包含三个新菜单 |
| `pnpm build:prod` | 生产构建通过 |
| 模拟浏览器回归 | 11 条通过，覆盖同实例重新采集后的元数据刷新、对象/引用、版本、粘贴纠正、异步归属、取消、过期、NAT、ICMP、只读权限；手机暗色英文覆盖设备/任务/对象/查询/设计五个工作区 |
| 真实 Go HTTP / SQLite 浏览器回归 | 1 条登录、采集、对象、保护范围、策略分析及设计完整流程通过；防火墙 API 直接访问真实 Go 服务，设备 Reader 为明确的合成实现 |
| 原生依赖与旧消费者 | 四份来源清单校验通过；delivery/fabric/wireless、26 条原生无线 transcript 及七厂商原生适配器回归通过 |
| Compose、格式与差异检查 | Compose 配置校验及各仓 `git diff --check` 通过 |

前端使用 Node 26.9.0 时，直接运行单元测试会受到实验性全局 WebStorage 的影响，出现已有的 20 个存储相关失败。上述最终通过命令禁用了该实验特性，使用项目 jsdom 存储；没有改动已有存储实现来绕过问题。

独立 PostgreSQL 复现入口：设置 `FIREWALL_TEST_POSTGRES_DSN` 后在后端执行 `go test -count=1 ./app/firewall/service`。测试仅在该连接中新建随机 `firewall_test_*` schema，并清理自己创建的 schema；应使用测试数据库。MySQL 验证限于迁移方言/字段类型回归，没有连接 MySQL 服务器。

API 契约检查可设置 `GOMODCACHE`，或将 `GO_ADMIN_CORE_PATH` 指向 `go.mod` 对应的 core 模块缓存。必须带 `--require-models`，避免缺少模型时检查被跳过。

## 真实浏览器验证边界

`FIREWALL_CAPTURE=1 pnpm exec playwright test --config=playwright.firewall-integration.config.ts` 启动独立 Vite 9539 和 Go 18039。Go fixture 强制回环地址、随机 JWT 密钥、私有临时 SQLite/快照目录，使用生产路由、worker 和 request-scoped GORM 克隆。

浏览器选择待确认状态的 Hillstone 合成台账设备，测试登录，刷新恢复任务，然后采集配置并查看本次快照、解析器来源和结构化对象；从配置填入 inside/outside 安全域，确认只保护 inside；粘贴 TSV 并通过服务器解析，保存需求并分析，再生成设计草稿。数据库证据为 import 0 条，snapshot、request、request_row、analysis、draft 各 1 条；当前 revision 为 64 字符摘要，设置版本为 2。合成 Reader 计数严格为 opens=2、reads=1、closes=2，无真实 SSH/Telnet 连接。

该 Hillstone 样例的原始报文语义无法由当前原生引擎证明，因此草稿正确显示待确认。浏览器测试不把策略允许冒充为已验证转发。可证明的 PAN 场景及 ASA ACL/NAT 地址视图由引擎回归覆盖。

在线任务和五个手机暗色英文页面截图位于工作区 `output/playwright/`；既有对象/查询/设计及 `real-http-sqlite-draft.png` 位于 `output/firewall-ui/`。实际 localhost 设备页截图为 `output/playwright/firewall-local-devices.png`。桌面 1280px 下核对设备表与容器宽度一致，IP 不拆行，长凭据提示在手机卡片中换行；截图中的固定页脚沿用应用壳。未修改用户外观偏好。

## 审查修复与回归

存储审查修复了 PostgreSQL TEXT / MySQL LONGTEXT 差异、通配策略筛选遗漏和原生对象同 ID 时诊断错归属。投影故障回放、历史归档不改当前版本、CAS、NAT 分类、区间索引与引用均有回归。

引擎独立审查的五项问题均已修复：空格分隔端口误作数字协议、未导入实例中断整批任务、混合地址族丢失残余、跨设备对象名解析遗漏未知结果、表头启发式吞掉合法输入。38 条引擎测试、独立复现程序和最终复查通过。ASA 出入双 ACL、NAT 原始/策略视图及累积草稿最终证明也有回归。

集成回归覆盖了台账权限撤销后的历史输入隐藏、请求和设置版本冲突、新设备加入后旧分析过期、网络域继承、原生发布后崩溃重试保持同一 revision、过期 worker 不能覆盖重领任务、取消后的任务不再运行、过期草稿同键重试返回原记录、保护范围超预算不提交设置，以及真实 middleware 的 GORM 克隆保持正确租户快照根目录。配置正文和查询输入不进入操作日志。

在线采集额外覆盖：共享设备租约、租户并发上限、关闭失败隔离、取消保留部分证据、采集期间来源变化、重复提交、重启恢复不重复登录、不完整在线快照替换当前版本并使分析/草稿过期、过期 worker 发布围栏。离线部分导入仍只归档。

最终独立审查发现的三项问题均以 RED → GREEN 回归修复：真实 COMMIT 已完成但返回确认错误时，终态前按 publication ID 找回已发布快照；队首 100 个目标都被设备租约占用时，后面的空闲设备仍可执行；同一实例的新采集结果重新进入对象页时，重新获取当前版本和诊断信息。最终 API 契约检查另补齐设备/连接/采集类型映射，删除前端多声明的连接 `deviceId`，没有放宽校验。

## 实施裁定

- 保留现有未提交功能并原地实施，未创建只含已提交文件的新 worktree：运行中 Compose 挂载的正是这些源码，隔离迁移会遗漏已有实现。代价是无法仅凭本次 Git 差异区分所有历史工作；实施前以 `.local/firewall-online/before.tar.gz` 保存相关源码，未清理、覆盖或提交历史改动。
- 保留新连接器 `Close` 中断活动 I/O 的原生语义，移植无线所需的有范围借用/退出围栏，而不恢复旧测试中 Close 必须返回 busy 的假设。代价是旧消费者若依赖该假设会改变行为；已有无线 transcript 和 host 消费者回归已通过，真实设备仍待验证。补丁和来源清单可追溯。

没有进行真实防火墙访问、设备变更、生产部署、远程 CI 或发布验证。启用步骤、数据表和能力边界见后端 `docs/network-firewall.md` 及工作区 `README.docker.md`。

## 2026-10-30 在线采集启用

迁移 dry-run 确认仅 `1793347200000` 待执行后，已应用采集批次/目标表及 collect/connection 权限，并重启绑定当前源码的后端。保留原容器环境和持久卷，未改服务器凭据或台账状态。最终 SQL 读回 32 张防火墙表，容器 healthy；`/api/v1/ready` 的 database/cache/schema 均为 OK。

使用已有本地登录会话，在独立 Playwright 浏览器实际打开设备、策略查询和策略设计三个页面，核对防火墙菜单及设备接入入口。真实后端返回 23 台防火墙（20 台 Hillstone、3 台 Palo Alto），均为待确认，驱动推断成功；当前服务器没有相应凭据，因此页面逐台显示凭据缺失，不允许发起登录。最终实例/采集批次均为 0，未向业务库创建合成实例、采集批次或策略需求。

真实设备联调仍需在服务器配置对应厂商 `NC_*` 凭据并确认目标。当前证据证明应用链路和本地运行入口已接通，不能视为真实防火墙登录或配置采集成功。

## 2026-10-30 当前开发环境启用

用户报告 `http://localhost:9527/#/dashboard` 没有防火墙入口。现场核对发现：最新已执行迁移为 `1793160000000`；没有 `sys_firewall_*` 表或 `NetworkFirewall*` 菜单；运行中的旧后端对 `/api/v1/network-firewall/options` 返回 HTTP 404。代码已实现但当前环境未启用是此次原因。

先将现有 PostgreSQL 数据库备份到私有 `.local/` 目录。新二进制的迁移 dry-run 确认只剩 `1793268000000` 一项待执行，然后通过现有 Compose migrate 服务执行。数据库读回确认新增 30 张防火墙表和三个菜单：`NetworkFirewallObjects`、`NetworkFirewallQuery`、`NetworkFirewallDesign`，分别对应防火墙对象、策略查询和策略设计。

使用 `up -d --no-deps --force-recreate backend` 重建后端，加载新二进制与 `go-admin-dev_firewall_snapshots` 持久卷。就绪接口返回 HTTP 200，database/cache/schema 全部通过，容器为 healthy。

随后在用户现有 Safari 登录会话中刷新页面，实际打开并核对三个页面。左侧「网络管理」已包含防火墙对象、策略查询、策略设计；对象页显示默认网络域及关联库存设备入口；查询页显示源/目的/服务输入及最多 1000 行；设计页显示已保存设计草稿区域。页面最终停留在 `/network/firewall`。未创建测试业务数据或连接真实防火墙。
