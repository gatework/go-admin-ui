# Motor UI Alignment Implementation Plan

> 使用 executing-plans，逐模块直接执行，最终进行一次独立审查。用户已指定参考与目标，实施中的普通选择不另设审批关卡。

**Goal:** 按 Motor 源码补齐偏好、用户中心、header 与登录页。
**Architecture:** 复用参考界面结构，建立类型化 preferences、共享 header/identity 控件，适配现有 Pinia/Go API，应用层绑定每一项设置。
**Tech Stack:** Vue 3、Arco、TypeScript、Pinia、SCSS、Vitest、Playwright。
**Spec:** docs/design/motor-ui-alignment.md

## 全局约束

保留所有 WIP；src/apps 和 Motor 参考仓库只读；离线资源；双语；不提交/推送；不将缺失的 Rails API 伪装成可用功能。

## 审查重点

偏好开关必须影响界面；隐藏导航后可恢复；锁屏不是服务端鉴权；原始登录/验证码与重定向契约不变；资料成功更新必须同步 header；持久化损坏/受限存储不会阻止启动。

## 模块 1：偏好状态与共享视觉组件
- [x] 补充偏好验证、存储恢复/重置及主题副作用的失败测试。
- [x] 迁入参考色板、HeaderIconButton、UserIdentity、偏好分组控件及本地锁屏。
- [x] 建立持久化偏好 store、原生色阶与样式 token，验证单测/类型。

## 模块 2：偏好面板与应用骨架
- [x] 对齐五组面板、全部前端设置、复制/重置/固定。
- [x] 实现布局/侧栏/页签/header/footer/水印/时区/快捷键等消费者。
- [x] 测试每组设置的可观察作用、刷新持久化与恢复入口。

## 模块 3：Header 与导航交互
- [x] 统一图标按钮、搜索/历史、主题/全屏/锁屏与账户菜单。
- [x] 连接真实权限、身份、站内导航；验证手机和键盘路径。

## 模块 4：登录与用户中心
- [x] 对齐登录双栏、主题配色、布局切换，同时保留验证码和登录安全契约。
- [x] 对齐账户身份侧栏与资料/安全/偏好主区域，连接资料/头像/密码接口。
- [x] 依据用户对后端范围的答复处理缺失能力，记录逐项差异。

## 模块 5：最终验收
- [x] 全量 lint/types/unit/API/i18n/build/size、mock E2E。
- [x] 1440/768/375 深浅色中英文渲染与关键交互，独立参考对齐审查，修复重要发现。
- [x] 功能清单逐项核实，记录实际证据及保留差异。
