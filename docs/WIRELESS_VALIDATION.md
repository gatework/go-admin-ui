# Wireless 实现与验证记录

日期：2026-10-28。Go Admin CLI 优先范围，参照 Ruby Motor 无线模块。保留两个 `arco-design-vue` 工作区的既有 WIP；未提交或推送。

## 入口与本轮范围

本地入口 [无线管理](http://localhost:9527/#/network/wireless)，菜单 **网络管理 → 无线管理**。后端 API 为 `/api/v1/network-wireless`，契约见 [network-wireless.md](../../go-admin/docs/network-wireless.md)。

已实现控制器分组导航、概览和问题对照、AP/射频/BSS/客户端台账、IP/MAC 跨控制器定位、AP 管理字段、邻居证据与库存关联、显式采集任务、管理 CSV 导入导出。问题可下钻到 AP/客户端，再返回同类问题；URL 保留业务上下文与筛选。

采集建议限制维度和明确 AP 范围；默认不采集 AP LLDP。完整性、时效与健康分别展示。无完整证据不能当作健康，真实零记录与失败分开处理。

## 最终验证

| 检查 | 结果 | 日志/证据 |
| --- | --- | --- |
| 后端 `go test -race -p 2 ./...` | 通过，45 个有测试的包 | `/tmp/wireless-delivery-race.log` |
| 后端 `go vet ./...` | 通过 | `/tmp/wireless-delivery-vet.log` |
| `make checksilent UI_DIR=../go-admin-ui/src` | 0 错误、0 警告 | `/tmp/wireless-delivery-checksilent.log` |
| 依赖来源校验 | connector 75、expect 18、vxlan 25、wireless 37 项通过 | `scripts/verify-delivery-dependencies.py` |
| 前端 `pnpm test:ci` | 73 文件、524 测试通过；类型/API/i18n 检查通过 | `/tmp/wireless-delivery-ui-ci.log` |
| `pnpm exec vite build` | 通过 | `/tmp/wireless-ui-build.log` |
| Wireless Playwright | 9/9 通过 | `/tmp/wireless-browser-final.log` |
| Fabric Playwright 回归 | 30/30 通过 | `/tmp/wireless-fabric-regression.log` |
| PostgreSQL 发布并发测试（race） | 设备编辑、已有连接编辑、首次连接创建三个子场景通过 | `/tmp/wireless-delivery-postgres.log` |
| PostgreSQL 新库迁移及重复迁移 | 通过，5 张无线表、20 条 API、正确菜单、0 任务 | `/tmp/wireless-fresh-migration{,-repeat}.log` |
| 两仓 `git diff --check` | 通过 | 当前工作区 |

前端 CI 使用 `NODE_OPTIONS=--no-experimental-webstorage GOMODCACHE=/Users/wenwu.yan/go/pkg/mod`，适配当前 Node 26 的已有测试环境。Lint 有 40 条既有命名等警告、0 错误；Wireless 新代码定向 lint 无警告。浏览器动态菜单注册有既有路由提示，Fabric 原有 Select 指令提示仍在。没有运行会覆盖生成目录的 `sync-apps`。

PostgreSQL 测试通过显式 `WIRELESS_TEST_POSTGRES` 指向本轮创建的隔离验收库，每个测试创建独立 schema 并清理；普通全仓测试默认跳过这一外部数据库用例，单独的 PostgreSQL race 命令实际执行了它。没有在开发业务表中插入模拟 AP 或采集任务。

## 自查与独立复核修复

刷新/页面缓存/账号切换单测中，三个缺陷先失败后通过；两条浏览器回归先复现问题再通过：同页签历史导航恢复筛选、后台失败保留同一查询的已有表格结果。请求按实例和账号归属处理，缓存页不会被可见性事件误唤醒。

独立只读代码复核提出 8 个 Important 问题，全部作为本轮修复项；无 Critical、无延后 Minor。新增回归逐项观察失败，再修复通过：

1. LLDP 缺少逐 AP 回执时，为明确选择的 AP 记录失败并保留历史事实；不改未选择 AP 的邻居状态。
2. 邻居状态绑定稳定 AP 资源 ID，同名替换不能继承旧硬件的有效证据。
3. 对无权查看的交换机，列表、详情、管理更新响应隐藏既有人工关联；数据库关联保留。
4. 采集只更新观测字段，不能覆盖已成功保存的人工字段、关联或管理版本。
5. 子对象绑定稳定 AP 身份和来源；AP 退役、替换、来源变化后，旧子对象不能保持健康结论。
6. 传输失败、取消、关闭不确定写入安全失败观测，保留 last-complete，防止旧结果继续显示健康。
7. 查询可执行控制器任务，避免前 20 个受阻任务永久饿死后续控制器。
8. 发布事务锁定设备和连接；连接写入锁同一设备行，覆盖尚无连接记录的场景。真实 PostgreSQL 并发回归先验证三种竞态失败，再验证修复。

对应测试：`tests/unit/network/wireless-session.spec.ts`、`tests/e2e/mocked/network-wireless.spec.ts`、后端 `app/wireless/service/{review,postgres}_test.go`。新库迁移包含稳定 AP/父对象身份字段；上线过的迁移未被改写。

## 页面证据

截图目录：`../output/wireless-ui/`（相对双仓父目录的 `output/wireless-ui`）。

- `overview.png`：中文亮色桌面概览、分组与控制器导航。
- `ap-details.png`：问题下钻 AP、管理字段和返回同类问题入口。
- `edit-conflict.png`：草稿保留、版本冲突和读取最新记录。
- `dark.png`：英文深色概览。
- `mobile.png`：390px 手机台账、无文档横向溢出。
- `local-login.png`：真实 9527 入口的正常登录页面。

截图在抽屉进入视口后采集；已人工查看亮色、深色、AP 抽屉及窄屏布局。全页截图中共享固定页脚位于原始视口边界，是拼接截图表现；未隐藏或修改全局页脚。浏览器测试还验证键盘切换页签、设备树抽屉和 Escape。

## 本地开发集成

先创建私有 PostgreSQL 备份，再次检查 Fabric 采集/变更、delivery 目标、设备租约和启用调度均为 0，应用迁移 `1793160000000` 并重启已有后端容器。无线表、`NetworkWirelessManage` 菜单和 API 已注册。`/api/v1/ready` 数据库、缓存、Schema 全通过，无线任务/设备租约仍为 0。

前端继续使用已有直接 Vite 服务及挂载源码，没有调用其会同步生成应用的普通启动脚本。真实入口需要正常登录；本轮未借用或伪造真实登录会话。接口匿名请求必须返回 401，交互验收采用隔离的 API 模拟浏览器。

## 实现取舍与验证边界

- 继续现有非主分支脏工作区，用原始快照隔离和复核本轮改动；没有提交，所以保留本轮 ledger/快照供后续审核。
- 使用 Go Admin CSV 惯例实现管理导入导出；Ruby XLSX 工作簿不直接兼容。
- 真正接入无线 adapter 需要 connector 两个操作 API 扩展；仅应用并记录精确兼容补丁，独立库没有改动，交付/Fabric 已回归。
- 版本锁会短暂串行同一设备的连接编辑与观测发布，网络 IO 不在该事务中。
- Netdisco 无线同步、配置下发、邻居修正脚本、重启 AP 不在本轮；其余库维度保留采集状态，未扩大为专用业务页面。
- 初始交付以上证据证明离线代码、模拟界面、真实本地数据库与服务入口；本轮后续实机情况见下节。策略下发、远端 CI 或生产发布仍未验证。

## 2026-10-28 控制器树与指定实机补充

无线分组 API 原先直接调用全部设备分组树，导致计数和无关目录混入。现按授权范围内的无线控制器聚合、裁剪空分支并保留祖先，前端桌面/手机统一使用控制器专用标题、总节点、搜索提示和计数说明。共享设备树默认语义保持不变。

- 后端混合设备类型、多层祖先、不可见控制器、未分组、空权限回归先失败再通过；network/wireless race 测试和 vet 通过。
- Wireless 浏览器 10/10、共享设备树浏览器 8/8、定向前端单测 9/9 通过；类型检查、定向 lint、i18n 检查和直接 Vite 构建通过。
- 真实 API 核验分组数量为 3 台控制器，仅保留传音大厦、深圳云科技、重庆职场三个有控制器的分支。
- 原生采集适配器修复 H3C 提示符的 NUL 填充，独立 go-wireless 全模块 race 检查通过，后端冻结依赖哈希检查通过。

用户指定的两台实机已返回完整 AP/射频/BSS：SZX9 为 197/589/2308，SZX10 为 128/384/1515。客户端和部分配置维度仍未完成；真实结果为部分成功，不代表网络健康。后续 SSH 重采在 banner 前断开，本地容器引擎/API 又失去响应。证据导入在脚本拷贝阶段停止，未执行导入程序；已终止挂起的本地 Docker 客户端，结果入库和真实页面数据验收仍待服务恢复。CLI 私有证据、325 条 AP CSV 及操作脚本保留在双仓根 `.local/wireless-live-20261028/`；此前模拟截图不能作为本次真实数据截图。
