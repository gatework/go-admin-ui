---
version: 1
slug: "src-views-network-device-index-vue"
primary_target: "src/views/network/device/index.vue"
related_targets: ["src/views/network/device/detail.vue","src/views/network/device/editor.vue","src/views/network/device/form.ts","src/views/network/shared/group-panel.vue","src/views/network/device/groups/editor.vue","src/views/network/device/groups/assignment.vue","src/views/network/device/groups/tree.ts","src/api/network/device.ts","src/types/network.ts","src/views/network/shared/input-label.ts","src/views/network/shared/drawer.scss","src/views/network/shared/list.scss"]
---

# 设备台账

Mode: Operate. Primary target: src/views/network/device/index.vue.

用户：网络管理员。任务：从 Netdisco 同步设备资料，按区域分组与搜索定位设备，查看来源信息，维护分组和人工台账属性，导出筛选结果。首要成功信号是能快速定位准确设备、管理 IP 和角色；台账状态不代表在线状态。

范围：网络管理 → 设备管理。分组层级维护、单台/批量分配、检索、列表、详情、台账编辑、同步和 CSV 导出。来源事实只读；分组及类型/角色分别支持自动与人工来源，其他人工资料继续保留。无监控、基线、设备发现和配置下发。

## Direction contract

THESIS: 先选区域范围、再以搜索缩小设备清单，让管理员找到设备后维护台账；保留全部设备入口，不使用监控仪表盘式大数字和健康卡片。

OWN-WORLD: 延续现有 Motor/Arco 的中性背景、主题色动作、紧凑表格、原生树与抽屉，以及用户保存的明暗/字号/密度/圆角偏好。用设备名、IP、角色建立首层扫描顺序，不增加装饰图形或额外配色。

STORY: 管理员选中区域及其子组，再提交名称/IP/序列号等条件；工具栏同时说明当前范围、结果数、Netdisco 来源和上次同步时间。从设备名查看来源资料，再维护台账。分组与类型/角色的自动、人工模式相互独立，后续同步仅重算自动字段，保留人工覆盖。

FIRST VIEWPORT: 保留用户指定的岗位管理页（`/admin/sys-post`）筛选、工具栏和清单结构，桌面左侧增加 244px 分组卡片，右侧为原有 ProTable，间隔 16px。设备角色紧随 IP，便于区分核心、汇聚、接入及 PoE。宽度不超过 1023px 时以按钮打开同一分组树；手机继续使用现有筛选抽屉、卡片、页面操作菜单及全宽编辑抽屉。

FORM: Motor 约束台账和命名规则；`/admin/sys-post` 继续约束原生 Arco 外观。属于当前视觉世界的普通代码扩展，保留业务流程与偏好；不叠加网络模块独立色阶。没有新视觉概念种子、comp 或动效语法。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## States and finish evidence

2026-10-26 分组扩展的当前规则与验收见 [设备分组验证](../../docs/DEVICE_GROUPS_VALIDATION.md)，授权范围见 [设备分组规格](../../../docs/superpowers/specs/2026-10-26-device-groups-design.md)。[完整 finish packet](../../../.local/device-tree-work/finish-evidence.md)、[20 张截图清单](../../../.local/device-tree-work/capture-manifest.json)与[新一轮完整 finish review](../../../.local/device-tree-work/finish-review.md)对应本次实现；reviewer 逐张检查全部 20 张截图，结论为 `disposition: ship`、`material_fixes: None`。文档交接记录见 [documentation review](../../../.local/device-tree-work/documentation-review.md)。

当前截图位于 [device-groups](../review/device-groups/)，覆盖 1440/1280/768/390/320px、明暗模式、键盘选择区域后继续搜索、未分组空态、字段校验、父组选择、自动/人工设备编辑、批量分配及手机抽屉内部滚动。真实库存来自本地 Docker 已保存的 Netdisco 快照；表单截图为未保存草稿。`mock-hierarchy-long.png` 与 `mock-group-error.png` 仅拦截浏览器分组 GET，分别验证层级/长名称/禁用节点与局部失败重试，模拟路由已移除，重试已返回真实分组。

本次一次 detector 结果为 `[]`，没有新增 shipping raster。最终定向单测 11/11、模拟浏览器 21/21 通过；完整前端单测为 66 文件 / 449 项，门禁时间与环境限制以验证文档为准。此界面结论不表示全仓最终 CI、Docker readiness、上游同步或部署验收。

## Feature-scoped accessibility and mobile rules

- 页面、树、详情和编辑抽屉消费原生 Arco 颜色；按钮、链接、页码及标签不覆盖为设备私有色阶。页面与树的独立说明使用 `--color-text-2`，原生表单 help 沿用 Arco 状态色；标签保留状态文字。明暗、强调色、字号、密度和圆角继续取自已有偏好。
- 分组搜索只筛选导航节点；选中分组后包含其后代，与已提交设备条件取交集，重置分页和批量选择。树计数表示全部有权设备，不随列表搜索变化；全部设备与未分组（包括 0 台）始终有明确入口。CSV 使用已提交范围，包括数值 `groupId=0`。
- 树保留层级、展开状态、所选状态及键盘焦点，支持方向键、Home/End、Enter/空格。长组名截断并保留 title，计数独立对齐；禁用节点保持可读，不能接收新人工分配。分组请求失败时在树内提供重试，不遮断设备清单。
- 新建、子组、编辑和删除入口按权限显示；含子组或设备的组不能删除。重复编码创建失败保留可修改草稿；编辑版本冲突需明确重新加载，加载失败继续保留草稿。批量分配最多 200 台，过期版本整批回滚并要求刷新选择。
- 分组和分类分别使用 `groupSource`、`classificationSource`。自动字段只读，显示服务器已保存值，并说明保存/后续同步才重算；切换为人工后才可编辑，不在前端伪造实时推断。人工未分组也属于保留的覆盖。
- 手机保留 ProTable 原生卡片，IP 与角色位于首层次要信息。分组树节点在不超过 767px 时至少 44px 高；分组、单台与批量编辑采用 AppDrawer，内容内部滚动，footer 可达。桌面保持既有紧凑尺寸。
- [共享输入标签](../../src/views/network/shared/input-label.ts)将本地化名称写到原生输入，语言更新时同步；[共享列表样式](../../src/views/network/shared/list.scss)限制手机操作菜单宽度并保证按钮至少 44px 高。[共享抽屉样式](../../src/views/network/shared/drawer.scss)在不超过 767px 或粗指针环境保持控件至少 44px、关闭按钮至少 44×44px、可编辑文字至少 16px。共享文件不定义配色。

## Historical evidence boundary

此前 [设备首轮 review packet](../review/network-device/review-packet.md)、15 张截图、空 detector 结果及 `ship` 结论记录初次功能交付。该版本曾使用 `useDeviceAppearance`、`device-appearance.ts` / `.scss` 和 `device-detail.vue` / `device-editor.vue`；这些名称与局部色板已从当前模块移除。首轮 [对比度测量](../review/network-device/accessibility-metrics.json)只描述当时的局部外观，不是当前原生色板或所有自定义主题的对比度结论。本次没有扩大全站对比度或完整无障碍符合性声明。

随后岗位管理布局对齐的证据见 [专线与网络页面验证](../../docs/NETWORK_CIRCUIT_VALIDATION.md)：设备/专线模拟浏览器 23 项通过，[network-aligned](../review/network-aligned/)的设备亮暗桌面/手机、详情和编辑来自真实本地快照，`shared-device-filter-390.png` 为隔离 mock。当轮 [finish packet](../../../.local/circuit-work/finish-evidence.md)列出 50 张最终截图；[首轮完整 review](../../../.local/circuit-work/finish-review-initial.md)要求纠正旧 brief，[最终 verdict](../../../.local/circuit-work/finish-review.md)仅确认该文档修正 resolved、remaining clear，不能扩写为当轮整页重审。当轮 detector 的七项既有/保留发现也只属于当时范围，不与本次分组扩展的 `[]` 混用。

当前源码依据为 [列表](../../src/views/network/device/index.vue)、[详情](../../src/views/network/device/detail.vue)、[编辑](../../src/views/network/device/editor.vue)、[表单映射](../../src/views/network/device/form.ts)、[分组树](../../src/views/network/shared/group-panel.vue)、[分组编辑](../../src/views/network/device/groups/editor.vue)、[分配抽屉](../../src/views/network/device/groups/assignment.vue)与上述共享文件。历史功能验证见 [设备台账验证](../../docs/NETWORK_DEVICE_VALIDATION.md)。本次 `DESIGN.md` 与 `.impeccable/design.json` 保持原字节；页面规则不提升为全站新 token、断点或组件规格。
