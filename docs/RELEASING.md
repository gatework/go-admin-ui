# 前端发布

`master` 是 gatework/go-admin-ui 的发布主分支；`gatework` 中的定制代码合入主分支后发布。上游演示站部署只在 go-admin-team/go-admin-ui 运行，fork 的 push 不执行该部署。

## 验证与产物

发布提交必须同时通过 `Verify` 和 `build`。Verify 在 Node 24 运行 lint、类型、单测和模拟浏览器测试，并对 go-admin v2.4.1 的固定提交及其依赖的 go-admin-core 检查接口和多语言数据。build 在 Node 22/24 构建并检查首屏体积。

Node 24 的 master push 或手动触发构建上传 `go-admin-ui-dist-<完整提交 SHA>`，内含 `go-admin-ui-v<版本>-dist.tar.gz` 与 `SHA256SUMS`。归档中的 `dist/release.json` 记录版本和完整提交 SHA；`dist/LICENSE` 和 `dist/form-generator/` 随包交付。`package.json` 是版本号来源，发布标签必须是 `v<版本>`。

## 发布步骤

1. 更新版本和对应的 `docs/releases/` 说明；从干净工作区将审核后的提交合入 master。
2. 等待同一完整 SHA 的 Verify 和 build 均成功；fork 首次启用时若 push 未生成作业，手动运行这两个工作流并指定 master，下载该 build 的上述产物。不要为上传 Release 再做本地构建。
3. 执行 `sha256sum -c SHA256SUMS`（macOS 可用 `shasum -a 256 -c SHA256SUMS`），解包检查 index.html、静态资源、表单设计器、许可证，以及 release.json 的版本和提交。
4. 确认远端标签未占用，将注释标签推送到已验证提交；创建草稿 Release，上传归档和 SHA256SUMS。
5. 下载草稿附件，核对其字节与 CI 产物一致，再发布并回读标签、附件及发布状态。已有标签或草稿需要先核对身份，不覆盖不同提交的版本。

## 部署

解压归档，将 `dist/` 内容放在静态站点根目录，并将同源 `/api/` 请求反向代理到配套后端。页面使用 hash 路由。发布包不设置 Google Analytics ID，不依赖在线 CDN；菜单与权限仍由后端提供。

需要不同 API 地址或部署基路径时，应按 Vite 环境配置另行构建并独立验证，不将定制构建冒充本 Release 附件。正式发布不代表已经部署到运行环境。
