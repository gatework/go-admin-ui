# 账户访问扩展设计核对

核对日期：2026-10-26。范围为注册、邮件找回与重置密码、登录 MFA、个人中心 MFA 设置和管理员注册策略。本次按 `.impeccable/surfaces/src-views-account-access-index-vue.md` 的 Operate 方向核对，是现有界面的普通扩展，不建立新的视觉系统。

## 与现有界面的对应

| 项目 | 现有依据 | 本次扩展 |
| --- | --- | --- |
| 颜色与主题 | `src/styles/motor.scss`、`src/styles/arco.css` 的表面、文本、边框、主色与 Arco 语义色 | 公共表单和设置分区沿用这些变量；提示、按钮、开关与标签使用 Arco 状态色；深色截图保持一致 |
| 控件与层级 | 登录页的纵向 Arco 表单、主按钮、品牌、语言与主题控制 | 注册及重置沿用有标签的纵向表单；MFA 挑战替换登录表单区域，保留登录页外壳 |
| 页面结构 | 登录页的故事区与表单区；个人中心的现有设置面板 | 公共账户页使用简化的双栏及最大 420px 表单；MFA 位于密码面板的分隔线后，注册策略位于系统设置分区，不额外嵌套卡片 |
| 字体 | 全局字体与 Arco 控件排版，个人中心现有标题层级 | 未引入字体资源或替换全局字体；局部标题服务于任务层级，不成为新的全局排版规范 |
| 功能图像 | 既有品牌组件和功能图标 | MFA 二维码用于绑定认证器，手动密钥与恢复码可读；没有新增装饰性栅格图片 |
| 窄屏 | 既有响应式表单与设置面板 | 公共页低于 768px 收起故事区；恢复码改为单列，长密钥允许换行，操作区允许折行 |

检查源码：`src/views/account-access/index.vue`、`src/views/login/index.vue`、`src/views/login/components/login-form.vue`、`src/views/login/components/mfa-challenge.vue`、`src/views/profile/index.vue`、`src/views/profile/components/mfa-settings.vue`、`src/views/admin/sys-config/registration-policy.vue`。

## 渲染证据

已逐张打开 `.impeccable/review/account-access/` 下以下命名截图；哈希命名的历史文件不作为本次依据。

| 截图 | 可支持的结论 |
| --- | --- |
| `desktop.png`、`mobile.png` | 中文亮色注册在桌面与 375px 单列中保留字段顺序、验证码发送反馈、密码说明、主操作和返回入口 |
| `registration-tablet-dark-en.png` | 768px 英文深色双栏中，标题和说明换行，验证码行及主操作留在表单内 |
| `password-reset.png`、`password-reset-success.png` | 重置表单与完成提示使用同一公共外壳；完成态提供返回登录入口 |
| `mfa-login.png` | 恢复码挑战置于既有登录外壳中，保留验证、切换认证器及返回密码登录入口 |
| `mfa-enrollment.png`、`mfa-recovery.png` | 个人中心的分隔式安全区域呈现二维码、手动密钥、确认绑定，以及一次性恢复码和下载操作 |
| `mfa-mobile-dark-en.png` | 英文深色 MFA 恢复码组件在窄容器中保持单列，提示和操作可换行；这是组件裁图，不是完整移动端页面证据 |
| `registration-policy.png` | 注册策略组件中说明、开关和保存操作有明确层级；这是组件裁图，不覆盖完整系统设置页面 |

截图证明所示状态的视觉结果，不能代替真实邮件投递、二维码扫描、后端授权、凭证失效或生产环境的端到端验证。完整交互及最终修复结论以对应测试和独立完成评审为准。

## 文档与范围边界

- 本次读取了本仓及上层 `PRODUCT.md`，沿用小写 motor、内网与离线部署约束。上层记录仍写 Element Plus，而当前前端 `AGENTS.md` 与实现使用 Arco；这是既有文档漂移，本次未修复。
- 本仓 `DESIGN.md` 与 `.impeccable/design.json` 在核对时均不存在。现有源码已经提供视觉依据；普通扩展不以缺少这些文件为由创建或替换全局设计系统。
- surface brief 的通用 FINISH 句子要求 `DESIGN.md`，与本次普通扩展适用的文档规则不一致；按 impeccable `new-work.md` 的普通扩展规则记录证据与既有漂移，保留原文件。
- 本文只记录账户访问扩展与现有系统的一致性，不重新定义品牌、字体或其他页面。后续若修改这些目标页面，应重新核对相关截图与本文记录。
