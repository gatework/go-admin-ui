# Netdisco 设备台账验证

日期：2026-10-26。工作分支：前后端 `arco-design-vue`。运行环境：本地 Docker，Go/Gin、PostgreSQL 18、Redis 8、Vue/Arco；宿主机 Chrome/Playwright 连接 Docker 前端。

入口：[网络管理 → 设备管理](http://localhost:9527/#/network/device)。实现规格见 [Netdisco 设备台账](../../docs/superpowers/specs/2026-10-26-netdisco-device-inventory.md)，部署与私密配置见 [Docker 开发说明](../../README.docker.md#netdisco-设备台账)。

## 交付边界

- 使用 `github.com/orange-cloudfoundry/go-netdisco v0.2.2` 的认证传输与检索参数，适配当前 Netdisco 2.097003 的完整设备列表接口。仅登录和读取设备清单，不请求设备发现、轮询、队列或配置写入。
- 来源事实按管理 IP 保存本地快照；来源缺少序列号仍可导入。同步事务失败保留上次快照，不自动删除本次未返回的设备。
- 分组、台账状态、类型、角色、负责人、联系信息、标签、备注由本地维护，来源同步不覆盖。编辑使用版本校验；冲突保留草稿，由用户明确选择丢弃并重新加载。
- 筛选、详情、编辑、选项及完整 CSV 导出采用同一数据权限。首次同步账号是记录 `create_by` 归属；全局同步要求全量数据范围。编辑授权同时包含读取编辑表单所需的 GET 权限。
- 台账状态不表示设备在线状态；没有新增监控、基线检查、手工创建设备、删除设备或 CSV 导入功能。
- 来源时间缺少时区信息时保留来源本地时间并加以说明；本系统同步时间按现有时间偏好展示。

## 自动化与真实集成结果

| 验证 | 结果与证据范围 |
| --- | --- |
| Go 全仓 `go test -race -cover ./...` | 通过；网络 provider、service、router、API 均纳入。最后的编辑权限修正后再次通过迁移包 race 测试。 |
| `make checksilent UI_DIR=../go-admin-ui/src`、`make fmt-check` | 通过，checksilent 0 errors / 0 warnings。 |
| PostgreSQL 集成测试 | 独立 schema 验证同步租约、并发互斥、事务失败回滚、人工资料保留、编辑冲突；迁移序列修复单独在隔离事务/schema 中验证。 |
| 前端 lint、type-check、unit | 通过，57 个测试文件、406 个单元测试；最后的列表权限展示修正又通过定向 ESLint 和完整 type-check。 |
| 严格 API 契约、i18n、迁移菜单解析 | 通过；契约识别新网络模型及嵌入字段，菜单检查覆盖 Go 迁移的声明式菜单，解析器 2 个测试通过。 |
| 生产构建、首屏预算 | 界面修正后再次通过，首屏 gzip 457.81 kB，低于 500 kB 预算。 |
| 设备页面 Playwright | 11/11 通过：筛选重置、详情及返回焦点、人工资料编辑、HTTP 200/业务 409 冲突与重载、同步反馈与失败、已提交筛选导出、只读/列表权限、未配置、详情重试、手机英文暗色、迟到响应、重复保存。 |
| Compose | 配置校验通过，实际私密来源配置与原账户配置均加载，五个开发服务健康。 |
| 真实来源与本地 API | 978 台设备；重复同步新增 0、更新 978；其中 1 台缺少序列号仍保留。接口只暴露台账白名单，不包含来源响应中的 SNMP 凭据等字段。 |
| 真实人工资料与导出 | 临时修改分组/备注后同步仍保留，创建人不变；过期版本返回 409。筛选导出 1 行、完整导出 978 行，不受分页限制。临时资料已按最新版本恢复。 |

后端 PostgreSQL 测试使用隔离 schema，不清理开发台账。完整日志和聚合结果在本地忽略目录 `../../.local/inventory-work/`；`live-verification.json` 保存上述真实集成计数，实际连接配置与会话令牌不进入文档或版本控制。

验证结束后已清除测试浏览器的 Cookie/存储并关闭该隔离会话，删除本地私密会话文件；服务端退出记录采用项目现有 logout 行为，不将其扩写为令牌吊销证明。

常用复验命令（在工作区顶层执行）：

```sh
docker compose -f docker-compose.dev.yml -f docker-compose.account.yml exec -T backend sh -lc 'go test -race ./app/network/... ./cmd/migrate/migration/version && make checksilent UI_DIR=../go-admin-ui/src && make fmt-check'
docker compose -f docker-compose.dev.yml -f docker-compose.account.yml exec -T frontend sh -lc 'pnpm lint && pnpm type-check && pnpm test:unit && node scripts/check-api-contract.mjs --require-models && pnpm check:i18n && pnpm build:prod && pnpm check:size'
```

浏览器复验在 `go-admin-ui/` 执行：

```sh
PW_REUSE_SERVER=1 pnpm exec playwright test --project=mocked tests/e2e/mocked/network-device.spec.ts
```

## 界面证据

[界面约定](../.impeccable/surfaces/src-views-network-device-index-vue.md)记录当前 Operate 页面结构；[截图与检查范围](../.impeccable/review/network-device/review-packet.md)逐项标明真实数据与模拟异常状态。

- 桌面 1440 px：中文亮/暗、展开筛选、详情、人工资料编辑、无匹配结果、同步失败、未配置、保存冲突。
- 手机 390 px：中文亮色卡片、详情抽屉、编辑顶部/底部滚动；英文暗色卡片；补查 320 px 英文暗色。
- 模拟失败只拦截指定 API 响应；冲突截图未向真实数据库写入草稿。手机只保留 viewport 截图及抽屉滚动截图，避免完整文档截图的固定页脚拼接干扰；英文手机首屏另记录 scrollY 为 0。
- 一次 Impeccable detector 扫描三个 Vue 页面，结果 `[]`。未增加网站投放图片或外部字体。
- 独立界面复核指出文字对比度与手机抽屉控件尺寸问题后，采用模块内样式修正。亮色标签/辅助文字对比度分别为 5.68:1 / 7.10:1，明暗链接分别为 9.25:1 / 5.14:1；手机控件及操作按钮至少 44 px，输入文字至少 16 px。重新通过全部 11 个交互回归，并补充尺寸断言；原共享外壳和保存的主题偏好不变。
- [独立界面复核](../.impeccable/review/network-device/finish-review.md)最终为 **ship**：15 张必需截图有效，两个问题均为 resolved，无剩余修正项。独立代码复核亦为 PASS，两个权限组合问题已解决。
- [文档核验](../.impeccable/review/network-device/documentation-review.md)完成，PRODUCT 与设备界面约定已更新；既有 DESIGN.md 与 design.json 校验值不变。

## 验证限制

真实验证覆盖本地 Docker 与当前 Netdisco 来源，不代表远端部署、生产负载或所有 Netdisco 版本。数据库运行验证为 PostgreSQL 与 SQLite；MySQL 仅验证生成的 LIKE/ESCAPE 查询，SQL Server 未做运行验证。未进行上游设备操作。当前工作未自动提交或推送。

## 2026-10-26 补记：岗位管理布局对齐

上文记录初次设备功能交付及当时的截图、对比度、空 detector 和复核结论。随后用户指定 `/admin/sys-post` 作为网络列表的布局参照，当前页面已移除重复标题和登录衍生的设备局部色板，采用原生 Arco 筛选、工具栏、表格与手机页面操作菜单。设备仍显式执行“同步台账”，导出使用通用“导出”文案，没有新增手工创建设备 API。

当前模块为 `index.vue`、`detail.vue`、`editor.vue`、`form.ts`；共用输入标签与触控尺寸位于 `network/shared/input-label.ts`、`drawer.scss`、`list.scss`。旧 `device-appearance.ts` / `.scss` 已删除，旧对比度数值仅属历史外观，不作为当前色板验收值。详情/编辑的权限、版本冲突、人工资料及同步契约保持不变。

设备与专线最终 23 项模拟浏览器用例通过；当前设备亮暗桌面/手机、详情和编辑截图使用本地既有 Netdisco 快照。本轮没有重新同步 Netdisco，也未操作上游设备。共享筛选抽屉在 390px 与 320px 的边界回归通过；当前证据、前端门禁、一次 detector 的七项既有/保留发现和最终复核状态统一见 [专线与网络页面验证](NETWORK_CIRCUIT_VALIDATION.md)，页面规则见 [当前设备 brief](../.impeccable/surfaces/src-views-network-device-index-vue.md)。

## 2026-10-26 补记：区域分组与自动分类

设备页现增加分组层级维护、区域树与搜索交集、单台/批量分配，以及迁自 Motor 的名称规则。`groupSource` 与 `classificationSource` 独立控制自动/人工模式；保存与后续同步重算自动字段，保留人工覆盖及人工未分组。自动表单展示已保存值，不表示实时草稿预测。

本次只用现有快照回填 978 台设备至 7 个区域组，未重新同步 Netdisco。最新规则、临时 CRUD 清理、20 张截图、新一轮完整 `ship` review、门禁时间边界与设计哈希见 [设备分组与自动分类验证](DEVICE_GROUPS_VALIDATION.md)。文档交接后的[最终 readiness 回读](../../.local/device-tree-work/final-readiness.json)为 HTTP 200 / OK，数据库、缓存及 schema 均通过；此前无关 Fabric 待迁移的 503 保留为历史，本任务未执行该迁移。上文初次交付的服务健康、测试数量及旧视觉测量也保留为历史，各项结论按其验证时点解读。
