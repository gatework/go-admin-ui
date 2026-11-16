---
version: 1
slug: "src-views-network-circuit-index-vue"
primary_target: "src/views/network/circuit/index.vue"
related_targets: ["src/views/network/circuit/editor.vue","src/views/network/circuit/detail.vue","src/views/network/circuit/binding.vue","src/views/network/circuit/endpoint-editor.vue","src/views/network/circuit/form.ts","src/views/network/circuit/traffic.vue","src/views/network/circuit/use-traffic.ts","src/views/network/circuit/traffic-chart.vue","src/views/network/circuit/traffic-chart.ts","src/views/network/circuit/style.scss"]
---

# 专线管理

Mode: Operate. 网络管理员在日常办公和夜间值守中维护线路合同与端点，并确认指定接口的流量。明暗、密度、字号与强调色由现有用户偏好决定。

用户指定 Motor 的专线实现为参考，确认仅绑定已有 Zabbix 监控项并读取流量。本次是现有网络管理的延伸，沿用设备管理布局和原生 Arco 表单、抽屉及菜单；不重做视觉身份。范围：检索/新增/编辑/详情/规划中删除/导出、A/Z 主机和入出站监控项绑定、四档历史流量。

## Direction contract

THESIS: 先定位线路，再核对两端和带宽；线路身份与端点关系是页面的主线，流量只在查看该线路时展开。

OWN-WORLD: 按用户最新指定的岗位管理页（`/admin/sys-post`）复用全局 Arco 中性色、用户强调色、PageContainer 与 ProTable；不使用网络模块独立色阶。状态使用 Arco 语义色，流量以端点分组及实线/虚线区分方向；保留文字图例而不靠色彩辨认。

STORY: 从编号/名称/运营商找到专线，核对 A/Z 位置和合同带宽；打开流量时可明确知道读的是哪台主机、哪条监控项及哪个时间段。维护台账不改变上游配置。

FIRST VIEWPORT: 与岗位管理一致，页面从标准筛选面板开始，下方为含“新增 / 导出”（Add / Export）的表格工具栏与清单；编号/名称为身份列、两端成对排列、状态与带宽可扫读。编辑抽屉仍使用“新增专线”等业务标题。流量宽抽屉顶部是线路和带宽、时间段与刷新，随后是入出方向摘要及折线图；手机沿用共享筛选抽屉、卡片和页面操作菜单，编辑为单列表单和全宽抽屉。

FORM: Motor 约束台账字段与业务流程；用户随后指定 `/admin/sys-post` 约束网络管理各页的筛选、工具栏与表格外观。采用代码实现，不生成新概念或替换 DESIGN.md。方向已由参考与现有界面固定，未使用随机种子。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Required states and evidence

台账加载/无记录/无筛选结果/失败、表单脏草稿/409冲突、上游未配置/未绑定/无数据/过期值/部分失败/截断历史。按 host+item 选择，异步搜索和时间切换不会让晚到响应覆盖当前内容。以数据单位、时间、方向标签说明证据，不将 unknown 写成 0 或 healthy。

最终布局参考为岗位管理的 [桌面](../review/network-circuit/reference-post-desktop.png) 与 [手机](../review/network-circuit/reference-post-mobile.png)；Motor 源码提供字段与业务流程参考。最终截图在 [network-aligned](../review/network-aligned/)，覆盖亮暗桌面与390px手机、英文长内容、键盘、编辑、绑定、详情、流量、错误和空状态。设备首轮截图仅保留为早期参考，不作为本轮最终布局依据。无 shipping raster。

## Implemented surface and evidence — 2026-10-26

- `editor.vue`、`detail.vue`、`binding.vue`、`endpoint-editor.vue`、`form.ts` 与流量文件按模块职责组织。设备与专线共用 `network/shared/input-label.ts`、`drawer.scss`、`list.scss`，不跨域借用设备 helper，也不定义独立配色。布局、字体及状态消费原生 Arco 与现有 Motor token；流量入站色读取 `--primary-6`，实线/虚线和文字同时区分方向。
- 重复编号返回业务 422，用户可保留草稿改正后重试；409 专用于版本冲突，保存锁定至明确重新加载。主机变更清空旧监控项，接口调用带取消和请求代次保护；监控相关请求采用 25 秒前端上限，覆盖后端 20 秒预算。
- 当前值取独立的最后采样，过期值保持空缺及采样时间；历史空洞、未配置、未绑定、部分失败和截断历史分别说明。7 天曲线来自小时趋势均值，观察峰值来自趋势最大值，不把缺失当零或把历史峰值当当前值。
- 完整前端代码门禁为 432 单测 / 62 文件，type/API/i18n 通过，lint 为 0 errors / 40 条既有 warnings；最终日期定位修正后定向测试、lint/type 与生产 build/size 通过，首屏 gzip 460.35 kB / 500 kB。设备/专线最终 23 项模拟浏览器用例通过。
- 本地 Docker 通过 Zabbix 7.0.25 的已有主机/监控项只读接入。截图中的“接入验证（临时）”绑定现有服务器接口，供四档时间流量与本地台账流程检查；该记录已删除并回读 404。这不等于真实业务专线验收。英文及 `mock-*` 状态使用隔离模拟响应。

结果、截图分类、代码复核、finish 复核状态及清理证据见 [专线与网络页面验证](../../docs/NETWORK_CIRCUIT_VALIDATION.md)。普通 Operate 扩展保留 `DESIGN.md` 与 `.impeccable/design.json` 原字节。
