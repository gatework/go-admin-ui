# 设备分组与自动分类验证

日期：2026-10-26。前后端分支：`arco-design-vue`。范围：本地 Docker 中的设备区域树、分组层级维护、单台/批量分配，以及由名称推断区域、类型和角色。沿用 `/admin/sys-post` 的原生 Arco 外观与已有偏好。

规格见 [设备分组设计](../../docs/superpowers/specs/2026-10-26-device-groups-design.md)，执行范围见 [实施计划](../../docs/superpowers/plans/2026-10-26-device-groups.md)，页面规则见 [设备 brief](../.impeccable/surfaces/src-views-network-device-index-vue.md)。本文件补充[初次设备台账验证](NETWORK_DEVICE_VALIDATION.md)，其中早期同步、服务健康和旧对比度结果不代表本次最终环境。

## 已实现规则

- 分组树含全部设备、未分组和层级节点；选中组包含后代，并与已提交设备条件取交集，重置分页与选择。重置清除分组及搜索。导出使用已提交条件，`groupId=0` 表示未分组，未知 ID 不扩大范围。树计数、列表和 CSV 共用设备数据权限；树计数不随列表搜索变化。
- 分组支持新建、子组、编辑和删除，编码创建后不可变；禁止成环及删除含子组或设备的组。禁用组保持可读，已有未变更成员关系可保存，但不接收新的人工分配。
- `groupSource` 与 `classificationSource` 独立使用 `auto` / `manual`。普通编辑保留来源；人工分组、人工未分组和人工分类在同步时保留。自动模式展示已保存值，保存时重算；后续同步只更新自动字段。前端不复制推断规则或预测草稿结果。
- 单台/批量分配使用版本校验，批量上限 200 台，任一过期或无权记录使整批失败。组变更、分配、同步及回填共用事务锁；自动成员关系或分类变化也推进版本。

区域规则迁自本地 Motor 的 `NetdiscoGroupResolver`，按表中顺序作不区分大小写的子串匹配。优先设备名；只有名称缺失或已归一为空串时才回退序列号，不从 hostname、location 或型号猜测。运行时只认稳定编码，同名自建组不会被自动采用；删除的标准组须以对应编码显式恢复，禁用目标不吸收新成员。

| 名称片段 | 稳定编码 | 区域 | 回填数量 |
| --- | --- | --- | ---: |
| `szx9` | `site.transsion-tower` | 传音大厦 | 139 |
| `szx10` | `site.shenzhen-yun-tech` | 深圳云科技 | 82 |
| `szx8` | `site.shenzhen-baiwangxin` | 深圳百旺信 | 54 |
| `szx11` | `site.shenzhen-chuanyiyuan` | 深圳传意园 | 16 |
| `sha` | `site.shanghai` | 上海职场 | 334 |
| `ckg` | `site.chongqing` | 重庆职场 | 345 |
| 未命中 | `site.other` | 其他区域 | 8 |

类型/角色迁自 Motor 的 `ROLE_PREFIXES` / `ROLE_DEVICE_TYPES`，沿用上述名称/序列号优先级，按表中顺序匹配完整连字符分段及可选数字后缀：`(?:^|-)PREFIX[0-9]*(?:$|-)`，忽略大小写。`ASW` 不会被识别成 `SW`，`LAPTOP` 不会被识别成 `AP`。

| 分段 | 角色 | 类型 | 本地库存数量 |
| --- | --- | --- | ---: |
| CSW | `core_switch` | `switch` | 13 |
| ASW | `aggregate_switch` | `switch` | 68 |
| PSW | `poe_switch` | `switch` | 41 |
| SW | `access_switch` | `switch` | 733 |
| LEF | `leaf_switch` | `switch` | 67 |
| BDR | `border_switch` | `switch` | 8 |
| SPN | `spine_switch` | `switch` | 8 |
| FW | `firewall` | `firewall` | 23 |
| LB | `load_balancer` | `load_balancer` | 8 |
| WLC | `wireless_controller` | `wireless_controller` | 1 |
| AP | `wireless_ap` | `wireless_ap` | 0 |
| 未命中 | `other` | `other` | 8 |

设备迁移 `1793010000000` 只用已保存快照回填 978 台设备、7 个区域组并保留其他元数据。历史非空分组先迁成保留标签的人工组，历史非空类型或角色保留为人工分类；未识别的 8 台保留 `other`，不推测其功能。当前没有真实 AP 样本，AP 只由单测覆盖。数量及校验范围见 [inventory-verification.json](../../.local/device-tree-work/inventory-verification.json)。

## 验证结果与时间边界

| 验证层次 | 结果与证据 |
| --- | --- |
| 后端 | 早期完整 `go test -race -cover ./...` 通过；最后稳定编码修正后，network 与 migration 包 race 再次通过。完整 gate 早于该修正，不称为最终全仓 CI。[完整日志](../../.local/device-tree-work/backend-full-tests.log)、[最终定向日志](../../.local/device-tree-work/backend-final-network-tests.log)。 |
| 并发与权限 | 后端实现者报告隔离 PostgreSQL schema 的对向父组移动、删除/分配、竞争批次、同步/人工保存交错检查通过。技术 reviewer 核对实现与测试，未独立重跑数据库；文档核对也不重放写入。[技术 review](../../.local/device-tree-work/code-review.md)。 |
| 前端 | 完整单测 66 文件 / 449 项、type-check 通过；当次 lint 为 0 errors / 41 条既有 warnings。最后修正后定向 lint 0 warnings、单测 11/11、模拟浏览器 21/21 通过。[完整日志](../../.local/device-tree-work/frontend-ci.log)、[交接包](../../.local/device-tree-work/finish-evidence.md)。 |
| API / i18n / 构建 | 最新 API 通过：8 fixtures、21 migrated pages、3 Options-API pages；最新 i18n 由前端实现者报告通过。生产构建通过。旧日志中并发 Fabric 修改的暂时失败已被最新结果取代；先前两份 Fabric 测试文件也已 gofmt clean。[最终 API](../../.local/device-tree-work/frontend-api-final.log)、[构建](../../.local/device-tree-work/frontend-build.log)、[环境记录](../../.local/device-tree-work/final-environment.json)。 |
| 真实本地 API | 回填保留元数据；树/子树/未分组计数、各角色及组合筛选与 CSV 一致。临时父子组、成环/非空删除拒绝、两台原子分配、过期整批回滚、重命名、禁用目标、人工切回自动、显式未分组均通过。[CRUD 记录](../../.local/device-tree-work/live-crud-verification.json)。 |
| 清理 | 临时组已删除；编辑设备的元数据与两种来源均按版本守卫恢复。真实操作推进的版本和审计时间不伪造回滚；978 台库存的预期回填保留。 |
| 复核 | 三项 P2（稳定编码解析、重复编码创建恢复、冲突重载失败保留草稿）已修正并复核，无剩余重要发现。20 张截图的新一轮完整 finish review 为 `ship`，`material_fixes: None`。[技术 review](../../.local/device-tree-work/code-review.md)、[界面 review](../../.local/device-tree-work/finish-review.md)、[文档核对](../../.local/device-tree-work/documentation-review.md)。 |

## 界面证据

截图目录：[device-groups](../.impeccable/review/device-groups/)。[清单](../../.local/device-tree-work/capture-manifest.json)记录全部 20 张的尺寸、来源与 SHA-256；主任务与 reviewer 均逐张打开，文档交接另核对 20/20 文件哈希和 PNG 尺寸。

| 范围 | 文件与来源 |
| --- | --- |
| 列表与响应式 | `desktop-light.png`、`desktop-dark.png`、`desktop-1280.png`、`tablet-768.png`、`mobile-light.png`、`mobile-dark.png`、`mobile-320.png`；真实已保存库存，1440/1280/768/390/320px 均无文档横向溢出。 |
| 导航与空态 | `tree-filtered-keyboard.png`、`ungrouped-empty.png`；键盘选区域后 CSW 搜索命中真实单行，未分组真实数量为 0。 |
| 桌面表单 | `group-validation.png`、`group-editor-desktop.png`、`device-editor-auto.png`、`device-editor-manual.png`、`assignment-desktop.png`；真实读取与未保存草稿。 |
| 手机抽屉 | `group-drawer-mobile.png`、`group-editor-mobile.png`、`device-editor-mobile-top.png`、`device-editor-mobile-bottom.png`；390×844 viewport，内部滚动可到备注和保存。 |
| 隔离模拟 | `mock-hierarchy-long.png`、`mock-group-error.png`；只模拟分组 GET 的层级/长名称/禁用节点及 500 重试，不是生产库存结构或真实故障。路由随后移除，重试返回真实组。 |

截图脚本没有 API 写入，草稿均取消。手机全页列表图在原 viewport 边界含既有固定页脚/FAB；抽屉使用 viewport 截图。一次 detector 结果为 `[]`，未增加投放图片或新设计 token；不把截图复核扩写为全部主题对比度或完整无障碍认证。

## 当前限制

- 设备 API/UI 可用。文档交接后的[最终回读](../../.local/device-tree-work/final-readiness.json)为 **HTTP 200 / OK**，数据库、缓存及 schema 均通过，Compose 服务均为 healthy。此前 [final-environment.json](../../.local/device-tree-work/final-environment.json) 的 503 来自无关 Fabric 待迁移，现仅作为当时记录；本任务没有执行该迁移，不将环境恢复归为本次操作，也不据此宣称最终全仓 CI 通过。
- 本次没有重新同步 Netdisco、上游设备动作、远端 CI、部署、提交或推送。同步自动更新与人工保留由后端测试覆盖；本地写入验证仅限上述临时 CRUD。
- 并发运行证据以 PostgreSQL 为准，不扩写到 MySQL/SQL Server、极大层级规模或跨请求快照一致性。列表、树和导出共用权限与谓词，不承诺多个独立读取请求的同一时间快照。
- 既有 Impeccable build-path 配置漂移只报告。`DESIGN.md` SHA-256 为 `3a3136ba3d4427a6273e12c231ca4cfbecd1431b435a3f9b13baf31a664cb493`；`.impeccable/design.json` 为 `7a9ac9537b347fdabb39914df7b43ff08a0b609c755acdb92a284e8b52613a39`，均保持原字节。
