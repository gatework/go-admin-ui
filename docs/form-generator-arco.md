# 表单构建工具的 Arco 接入

源码维护在 [gatework/form-generator](https://github.com/gatework/form-generator)
的 `feat/arco-design-vue` 分支，构建入口为 `arco/`。该仓库是
[JakHuang/form-generator](https://github.com/JakHuang/form-generator) 的 fork。

前端的 `dev-tools/build` 页面加载随包发布的 `/form-generator/index.html`。
内嵌页面随主界面切换语言、亮暗模式和主题色，保留设计内容和富文本 HTML。
常规前端构建无需访问 GitHub 或拥有源码目录。

## 当前功能

组件面板提供 21 类组件：单行文本、多行文本、密码、数字、富文本、下拉选择、
级联选择、单选、多选、开关、滑块、时间、时间范围、日期、日期范围、评分、
颜色、上传、行容器、按钮和表格。

- 点击或拖入组件；支持嵌套行、跨容器移动、拖拽/按钮排序、子树复制和删除。
  右侧分组件与表单属性，配置默认值、栅格、标签、布局、间距及各控件参数。
  窄屏下可切换面板，保留画布操作空间。
- 预览使用真实 Arco 控件，支持必填与自定义正则校验、提交/重置，以及表单和
  行容器的禁用继承。按钮可提交、重置或触发业务动作；表格可配置列、数据与操作列。
  操作列通过 `actions` 定义按钮的 `name`、`label` 和可选 Arco `type`，继承禁用状态。
- 选项控件和表格支持远程 JSON：GET/POST、响应路径、选项字段映射及 JSON 请求体。
  提供加载、错误和重试状态，配置变化或组件卸载时取消旧请求。请求不携带凭证；
  鉴权接口需在业务应用中接入，跨域接口需允许 CORS。
- JSON 与 Vue 代码使用 CodeMirror 编辑，支持语法高亮、行号和快捷编辑。
  合法 JSON 经确认后可应用到画布；代码窗口的修改可复制、下载，不反向修改画布。
  支持 JSON 导入导出、Vue 3 单文件组件导出和浏览器草稿，错误导入不会覆盖当前设计。
- 上传控件在预览中仅选择文件，不自动发送。远程数据源和用户填写的外部媒体地址
  会请求对应服务；设计器自身及编辑器资源不依赖 CDN。

富文本使用本地打包的 `tinymce@6.8.6`，包含格式、列表、链接、图片、表格、源码、
预览、全屏和撤销重做功能。中文、皮肤和表情资源随包提供，无需 Tiny Cloud API key；
本地图片以 data URL 嵌入 HTML。

TinyMCE 6.8.6 安装包采用 MIT 许可证，但该主版本已停止支持。
官方[支持政策](https://www.tiny.cloud/docs/tinymce/latest/support/)明确，TinyMCE 6
的商业安全支持也已于 2025 年 6 月 6 日结束；本项目不提供其持续安全更新。
升级到新主版本需重新核对许可证和集成方式。

## 导出和兼容边界

导出的 Vue 3 `<script setup lang="ts">` 组件可独立使用，需要消费项目安装 Vue 3
和 `@arco-design/web-vue`。包含富文本时还需 `tinymce@6.8.6` 与支持 `?raw` CSS
导入的 Vite 构建配置；富文本组件代码和所需远程数据加载逻辑已嵌入导出文件。
CodeMirror 仅用于设计器，导出组件不依赖它。

导出保留嵌套、默认值、控件属性、校验和禁用继承，通过 `submit`、`action`、
`table-action`、`upload-error` 事件接入业务。表格操作通过 `@table-action` 接收
`{ field, action, record }`，分别为字段名、配置的操作名与点击行对象。上传服务及业务保存逻辑由消费应用配置。
语言与深浅主题取生成时的值；消费应用需要运行时切换时，可将它们改为响应式绑定。

按本次需求，新旧 JSON 不兼容，也不自动转换；旧配置不会被覆盖。
这是独立的 Arco schema，恢复设计器功能不表示接受全部 Element 属性或上游插件。
完整说明见 fork 的 `arco/README.md`。

## 更新随包产物

```sh
# 在 fork 中
pnpm --dir arco install --frozen-lockfile
pnpm --dir arco test
pnpm --dir arco build
pnpm --dir arco test:e2e

# 在 go-admin-ui 中
node scripts/sync-form-generator.mjs ../form-generator/arco/dist
pnpm build:prod
```

同步脚本校验 `SOURCE.json` 的来源与文件 SHA-256。构建保留原项目 `LICENSE`，并将
TinyMCE、CodeMirror 及其运行时依赖的原始许可证/声明收录在 `third-party/`，索引为
`THIRD_PARTY_NOTICES.md`；这些文件也纳入产物校验和并随前端一起发布。
`SOURCE.json` 的 `dirty: true` 表示本地未提交源码快照，不代表已发布的远端版本。
不要直接编辑 `public/form-generator/` 中的产物。首次加入目录后，运行中的 Vite
开发服务器需要重启以重新索引静态文件。
