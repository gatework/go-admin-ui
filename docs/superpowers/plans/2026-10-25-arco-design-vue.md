# Arco Design Vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 用户已要求按模块连续执行；本会话直接执行，保持可运行中间态。

**Goal:** 在 feat/arco-design-vue 将 go-admin-ui 完整迁移为 Arco 原生组件与样式。

**Architecture:** 保留 API、Pinia、路由与 composables 的业务职责。按基础设施、应用壳、公共数据组件和业务页面依赖顺序迁移，最后删除 Element 依赖和样式。仅保留有业务语义的适配，不注册旧 el-* 别名。

**Tech Stack:** Vue 3、TypeScript、Arco Design Vue、Pinia、Vite、Vitest、Playwright。

**Spec:** docs/design/arco-design-vue-migration.md

## Global Constraints

- 保留既有未提交工作；src/apps 为生成目录；不提交、推送或部署。
- 文案走 zh-CN/en-US；路由名称、权限标识与后端 API 不变。
- 离线资源打包，无外部 CDN。迁移不写入业务数据。
- 每模块保持可构建；临时共存只用于迁移过程，最终清除 Element。

## Review Focus

- Arco validate 返回错误对象而不是 Element 的 true；非法字段不能提交。
- 表格 record/row、选中主键及分页事件转换不能导致错记录操作。
- Modal/Drawer 取消、Esc、焦点回归及提交等待要保持。
- 菜单受权限过滤、多级路径、缓存组件名与页签 query 行为不能丢失。
- 深浅、中文英文、375/768/1440、异步过期响应及权限隐藏均需验证。

## 模块 1：基础依赖、消息、语言与主题

Files: package.json, pnpm-lock.yaml, src/main.js, src/App.vue, src/lang/index.ts, src/utils/{message,modal}.ts, src/utils/request.ts, src/composables/{useRemove,useExport}.ts, src/styles/{tokens,arco}.css, src/composables/useColorScheme.ts。
Interfaces: message helpers 保持调用形状；confirmAction(options): Promise<void> 成功 resolve、取消 reject；Arco locale ref 与现有 locale 同步。
- [x] 安装并锁定 Arco，核对本地类型及官方 API。
- [x] 对确认、取消、语言和深色入口补回归，验证失败后迁移实现。
- [x] 注册 Arco；迁移消息服务与主题桥接；暂留未迁移页面的 Element。
- [x] 类型、相关单测、构建和登录浏览器冒烟。

## 模块 2：应用骨架与导航

Files: src/layout/**, src/components/{Breadcrumb,Hamburger,HeaderSearch,LangSelect,RightPanel,SettingsTrigger,TopNav,ThemePicker}/**, src/views/login/index.vue。
Interfaces: 现有 stores 与路由接口不变，组件使用 a-menu/a-tabs/a-drawer/a-dropdown。
- [x] 迁移登录、侧栏、header、页签、设置及 PageContainer/BasicLayout。
- [x] 校验菜单生成、登录表单、语言/主题切换、键盘和窄屏布局。
- [x] 更新按行为定位的对应浏览器测试，运行应用壳回归。

## 模块 3：表格、分页与表单公共契约

Files: src/components/{ProTable,Pagination}/**, src/composables/useForm.ts, src/types/ui.ts, src/views/demo/product/index.vue。
Interfaces: ProTable 使用 Arco table-column title/data-index/cell；actions 保持 row；useForm 显式按 Arco FormInstance.validate 的返回值判定。
- [x] 先写 Arco 列、选中/刷新/排序、表单非法值与异步失效回归。
- [x] 迁移公共列表、移动卡片、筛选 Drawer、分页及演示商品页。
- [x] 跑相关单测、商品完整 mock CRUD、窄屏及触摸回归。

## 模块 4：系统管理

Files: src/views/admin/**, src/components/{DictTag,TreeSelect,IconSelect}/**（以实际文件存在为准）。
- [x] 逐页迁移用户/部门/角色/岗位/菜单及树、权限、上传。
- [x] 迁移字典/配置/API/登录与操作日志。
- [x] 每组运行对应 mock CRUD、校验和选择状态测试。

## 模块 5：任务、开发工具、个人与仪表盘

Files: src/views/{schedule,dev-tools,profile,dashboard,sys-tools,log}/**, 其使用的公共组件。
- [x] 迁移任务与日志、代码生成与导入编辑、个人资料/密码/头像、监控及仪表盘。
- [x] 验证特殊输入、树选择、上传、嵌套表单、导出、Tab 和图表容器。

## 模块 6：移除旧框架与完整验收

Files: src/styles/**, src/main.js, vite.config.mjs, tests/**, AGENTS.md, README*.md, package.json, pnpm-lock.yaml。
- [x] 删除 Element 依赖、图标、注册、旧 CSS、主题字体资产及无引用兼容路径；扫描全部残留。
- [x] 更新开发约定与迁移记录；不把既有 polish 写成此次新功能。
- [x] lint、type-check、全量单测、API/i18n 门禁、生产构建与首屏预算。
- [x] 完整 mock E2E、桌面/窄屏/深色/英文渲染与键盘路径。
- [x] 独立整分支审查、修复重要发现、核对未提交差异后交付。
