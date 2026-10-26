# Motor 账户页面对齐验收

验证日期：2026-10-26。目标为本地 Docker 开发环境，未推送或部署。

## 工作区与分支

- 完整工作区从 `gz.inecloud.com:/Works/go/go-admin/` 同步到 `/Users/wenwu.yan/Works/go/go-admin/`；同步完成后执行 rsync 校验和比较，差异输出为空。
- 后端：`go-admin/`，分支 `arco-design-vue`，起点 `35b0d6c`。
- 前端：`go-admin-ui/`，分支 `arco-design-vue`，起点 `576dfc9`。
- 原本地两个仓库完整备份至 `/Users/wenwu.yan/Works/go/.backups/20261026-before-cloud-sync/`；`manifest.json` 保存原分支、HEAD 与工作区状态。远端带来的未提交修改均保留。
- `go-admin-hardening` 的 Git worktree 元数据已修复为本地路径。

## 实现范围

以 `/Users/wenwu.yan/Works/ruby/motor/frontend` 的当前认证外壳为视觉参照。登录、注册、找回和重置页面使用同一 `AccessShell`，保留已有主题、布局与语言偏好。保留目标产品文案及 native Arco 组件。

复用同步工作区已存在的 Go 账户接口与 MFA 实现：注册策略、邮箱验证、普通注册角色、一次性密码重置及旧 JWT 校验。前端移除默认管理凭据预填，补齐请求防重、邮箱挑战绑定、旧响应隔离、成功与错误焦点。公开账户路由不再把邮箱或重置凭据通过页面统计上报。

## 检查结果

| 检查 | 环境与结果 |
| --- | --- |
| 前端 lint、类型与单元测试 | Docker；0 lint errors、40 warnings；56 文件、400 测试通过 |
| API 契约 | Docker，`--require-models` 实际执行；8 fixtures、15 迁移页、3 Options API 页通过 |
| 种子多语言 | Docker；24 菜单、11 字典类型、33 字典值全部匹配 |
| 生产构建与首屏体积 | Docker；构建通过，首屏 gzip 452.81 kB / 500 kB 预算 |
| Go 完整测试 | Docker，`make test`，race + coverage；29 个有测试的包通过 |
| Go 静默错误检查 | Docker，`make checksilent`；0 errors、0 warnings；跨目录菜单名检查未启用，core 源码不在该命令扫描范围 |
| PostgreSQL 账户集成测试 | Docker，显式配置 `ACCOUNT_TEST_DSN`；MFA 并发消费等测试实际执行，无环境缺失跳过 |
| 浏览器回归 | 本机 Chromium 驱动 Docker Vite；login、account-access、i18n 三组 51/51 通过 |

构建与测试日志保存在 [验收日志](../.impeccable/review/account-alignment/logs/)。Docker 启动与检查命令见工作区根目录 `README.docker.md`。

提交前从 Git 暂存区导出独立快照，排除同步时已有的共享组件和样式修改。该快照在 Docker 中通过 lint、类型检查与 400 项单元测试，并由本机 Chromium 通过上述 51 项浏览器测试。登录工具栏同时覆盖仓库已有语言按钮的尺寸样式，不依赖未提交的共享组件重构。

另外通过临时 Go overlay 在独立 PostgreSQL schema 中检查重复注册、并发重置、配额竞争、拒绝提权角色、邮箱变更后的重置拒绝以及日志脱敏；schema 已清理。这些补充检查没有作为持久化测试文件加入仓库。

## 真实账户链路

使用独立的 `example.test` 验收账户，邮件仅进入 Mailpit：

1. 本地管理员启用注册；注册页发送验证码，读取 Mailpit 后提交，创建普通账户。
2. 使用新账户及真实图形验证码登录，进入工作台。
3. 找回页发送重置邮件，从邮件链接进入重置页，输入邮件验证码并更新密码。
4. 旧 JWT 调用 `/api/v1/getinfo` 返回业务码 403；已使用的重置凭据重复提交被拒绝。
5. 新密码配合新的图形验证码登录成功，`getinfo` 返回业务码 200。

验证后恢复公开注册关闭，并清理验收账户、邮件与本次浏览器凭据。

## 视觉与交互证据

截图位于 [账户对齐截图](../.impeccable/review/account-alignment/)。覆盖：

- 登录、注册、找回：1440 × 900 与 375 × 812，亮色和暗色。
- 注册：320 × 740 暗色英文，含滚动至提交按钮和键盘主题面板状态。
- 找回：768 × 1024 暗色英文。
- 登录：居左、居中、居右布局与刷新后偏好保留。
- 真实注册、邮件发送、密码重置的成功状态，以及重置表单。

截图等待字体、验证码和页面进度完成；逐页验证无横向页面溢出。键盘验证包含跳转表单后保持 hash 路由、主题色方向键操作、Escape 关闭与焦点恢复。窄屏注册表单使用内部滚动，页脚与工具栏保持可访问。

`impeccable detect` 仅执行一次，只有背景网格的 advisory；该网格直接继承用户指定的 Motor 参照。最终独立视觉复核记录见同目录 `finish-review.md`。

最终 disposition 为 `ship`：复核所列的账户文字对比度与 PRODUCT 持久化两项修正均为 resolved。该结论覆盖修正清单，不扩大为整个产品的全面审计结论。

独立复核要求提高账户范围内的文字对比度。现使用所选 Arco 色板的可读色阶，不修改全局偏好；提示、占位文字、链接、故事说明及按钮状态均已调整。浏览器实测 7 种可选主题色 × 2 种明暗模式，包含默认、hover、active，记录在 `contrast-check.json`，最低实测对比度为 5.39:1。另对全部预设及 3 个自定义色的 34 个明暗组合进行色值检查，按钮最低为 5.25:1。禁用控件不计入该阈值。

文字按钮另以真实找回成功页检查同样的 14 个组合，默认、hover 与 active 均达到 4.5:1，结果见 `text-button-contrast.json`；“更换邮箱重新申请”操作与输入框焦点回归通过。最后这组纯 CSS 修正通过范围 lint、生产构建和上述浏览器验证，没有重复运行未受影响的 Go 测试。

## 验证边界

- 邮件投递验证限于本地 Mailpit，未验证生产 SMTP。
- 继承的找回接口同步发送 SMTP，响应时序仍可能透露账户是否存在，详见后端 `docs/account-access.md`。
- 浏览器使用宿主机运行，应用、构建、单元检查、Go 与 PostgreSQL 测试使用 Docker；未交付容器化浏览器 runner。
- Docker 保留数据库与缓存卷；未操作其他项目的容器或数据卷。未运行远端 CI、生产迁移或部署。
