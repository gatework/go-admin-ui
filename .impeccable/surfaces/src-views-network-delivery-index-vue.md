---
version: 1
slug: "src-views-network-delivery-index-vue"
primary_target: "src/views/network/delivery/index.vue"
related_targets: ["src/views/network/delivery/editor.vue", "src/views/network/delivery/picker.vue", "src/views/network/delivery/scripts.vue", "src/views/network/delivery/detail.vue", "src/views/network/delivery/connection.vue"]
---

# 配置下发

Mode: Operate. 网络管理员选择准确目标、检查逐台脚本，跟踪工单状态与设备回显。用户确认完整工单接入，细节由实现者判断。

## Direction contract

THESIS: 已有网络管理的工单扩展，以可追踪的逐台配置为核心；保留同一清单、筛选和抽屉操作习惯。

OWN-WORLD: 现有 Motor/Arco 原生控件与保存的明暗、密度、字号偏好；执行状态使用语义色，代码才使用等宽字体。

STORY: 设备清单与任务清单两个 Tab。设备清单先从台账分组树选择区域，再按角色、厂商、型号过滤并勾选目标。平台自动识别，按角色与 CLI 平台分组写配置，单台差异明确保留；核对逐台实际脚本后提交，并切到任务清单查看状态和输出。

FIRST VIEWPORT: 默认设备清单，左侧区域树与右侧角色/厂商/型号筛选、复选清单并置。任务清单保留标准工单筛选与状态表。编辑宽抽屉有选择、按角色配置、核对提交三步，直接由已选设备进入配置步。窄屏区域和脚本组导航改为原生选择器，勾选直接可见。查看历史权限的用户默认任务清单；连接维护能力独立于创建任务。

FORM: 用户指定参考 Motor 流程并保留当前 Arco 的已有视觉世界；无需新的概念种子。seed: none (user-pinned extension).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

约束：中文/英文、390px 窄屏、版本冲突保留草稿、迟到响应隔离、执行未知不自动重放。现有视觉证据为 network-aligned/device-desktop-light.png，与当前网络 PageContainer/ProTable、共享样式和 DESIGN.md 核对。

## Initial delivery evidence — 2026-10-26

- [最终界面评审](../review/network-delivery/finish-review.md)：`disposition: ship`，无待修复项；确认目标身份、逐台脚本和回执、提交不确定/版本冲突处理、执行未知提示、权限和窄屏操作边界。
- [评审包与截图](../review/network-delivery/packet.md)：23 张截图，15 张 1440×1000 与 8 张 390×844，覆盖明暗、中英文、编辑/详情、未启用和只读状态。窄屏悬浮操作遮挡与状态标签收缩已在重新截图前修正。
- [文档核对](../review/network-delivery/documentation-check.md)：已比对现有系统、源码和代表性截图。`DESIGN.md` 与 `.impeccable/design.json` 保持原样，保留用户已有主题、明暗、密度、字号及圆角偏好。
- 检测器唯一的 `design-system-font` 提示由评审明确接受：本地等宽字体仅用于脚本输入和回显，不成为全局展示字体或新品牌规范。没有新增产品位图，截图是验收证据。
- [验证边界](../../docs/NETWORK_DELIVERY_VALIDATION.md)：自动化与浏览器夹具验证、本地真实 API 读取和下发关闭状态已记录。没有真实设备连接或命令发送；不将本地证据扩写为真实硬件、生产部署或发布完成。

## Area and role configuration evidence — 2026-10-26

- [本轮评审包](../review/delivery-roles/packet.md)记录设备/任务双 Tab、区域后角色/厂商/型号筛选、跨区域选择、角色与 CLI 平台配置及单台例外。主链路、权限、选择上限、冲突和提交不确定性证据保留在父工作区 `.local/delivery-work/roles-{flow,responsive,edges,real}.log`。
- [最终 verdict](../review/delivery-roles/finish-review.md)为 `ship`，仅确认原两项 material fix 已解决：390×844 首目标复选框、名称与 IP 保持在页脚上方；英文数量采用现有 i18n 复数机制。该 Verdict Pass 不是新一轮全表面审查。
- [文档核对](../review/delivery-roles/documentation-check.md)直接抽样五张当前截图及页面源码，确认继续使用 Arco 语义色、既有字号/圆角 token 和共享组件。`DESIGN.md` 与 `.impeccable/design.json` 的既有 hash 保持不变；没有产品位图或全局字体变化。
- 最后五张手机与一张 900×950 截图在 OrbStack / `:9527` 无响应后，经同一源码与夹具的临时 host Vite `:9528` 复拍；没有重启共享服务，不代表容器恢复。主线程收尾已关闭本轮浏览器并停止临时 Vite，最终 Docker `_ping` 仍超时。最终 host 检查与 68 文件 / 466 测试通过，测试使用 `NODE_OPTIONS=--no-experimental-webstorage`；详见[本轮验证记录](../../docs/NETWORK_DELIVERY_VALIDATION.md#区域选择与角色配置改进)。
- 真实 API 的先前读取为 978 台设备、7 根分组、84 项统计、自动推导连接、0 工单、下发关闭及 0 设备写入；本轮不作真实硬件验收或生产发布声明。
