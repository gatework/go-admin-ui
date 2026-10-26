# motor

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

motor 是网络运维管理平台。用户已明确的三个核心工作是：

- 查看告警。
- 管理设备。
- 执行自动化任务。

这些是产品目标，不代表当前仓库已经实现对应能力。

## Brand Commitments

- 产品名称：motor（统一使用小写，不附加 Admin）。
- 产品定位：网络运维管理。
- 账户页面已确认沿用本地 Ruby Motor 的认证外观：小写 motor、M 标记、原生 Arco 控件与已有主题偏好。其他业务表面的品牌资产仍待确认。

## First Iteration

- 用户已确认先做品牌与交互原型。
- 原型使用明确标注的演示数据，不连接设备，不执行真实自动化任务。
- 首版围绕告警、设备和自动化任务组织体验；这些业务页面的具体视觉方向待选择。

## Confirmed Account Access

- 2026-10-26：用户指定 `/Users/wenwu.yan/Works/ruby/motor` 为登录、注册和密码找回的外观参照，采用共享的故事栏与表单外壳；保留亮暗主题、主题色、布局与语言偏好。
- 该账户范围已完整接入 Go 后端，包含管理员控制的公开注册、邮箱验证码、一次性密码重置和原有 MFA 流程。它属于实际接口功能，不是演示表单。
- 开发环境采用 Docker；邮件进入本地 Mailpit。注册默认关闭，新注册账户获得无管理权限的普通角色。生产 SMTP 不在本次验证范围。
- 当前前后端工作分支为 `arco-design-vue`；该约定仅记录本次交付，不替代既有上游合并策略。

## Capabilities and Constraints

- 基于现有 go-admin-ui 项目，使用 Vue 3、TypeScript 和 Arco Design Vue。
- `master` 保留上游基线，`gatework` 承载定制；通过保留共同历史的合并接收上游更新。
- 页面、列表、权限、多语言与响应式行为遵循本仓库 `AGENTS.md`。
- 业务菜单由后端配置生成，导航变更需要与菜单配置配套。
- 保持内网和离线部署能力，品牌资源随应用提供。

## Evidence on Hand

- 当前 `src/views/dashboard/admin/index.vue` 展示销售额、访问量等演示指标，不是网络运维业务数据。
- 告警、设备和自动化任务的接口、数据来源及现有实现尚未确认。

## Open Decisions

- 三个核心模块的后端就绪程度及后续真实接口接入方式。
- 使用人群的具体职责与权限边界。
- 告警到设备、设备到任务的关联方式，以及自动化任务的类型和执行流程。
- 账户页面以外的品牌视觉方向与首版改造范围。
