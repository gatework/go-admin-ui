# 网络检查验证记录

日期：2026-10-26。范围：当前工作区 Go 后端、Vue/Arco 前端及本地 Docker Compose。保留已有设备台账、账户模块和外观设置修改；没有提交或推送代码。

入口：`http://localhost:9527/#/network/diagnostics`。功能组织参考 [DMIT Looking Glass](https://lg.dmit.sh/?server=lax-eb)，默认从后端执行五种工具；iPerf3 支持后端客户端与 120 秒临时服务端。运行说明见 [后端文档](../../go-admin/docs/network-diagnostics.md)。

## 自动化检查

下表记录初次全栈功能交付；后续布局调整的增量检查见下节。

| 检查 | 结果与覆盖 |
| --- | --- |
| 后端 `go test -race ./...` | 通过；包括参数校验、用户/租户归属、输出上限、容量、停止/保留周期、HTTP 输入、JWT/Casbin 路由及幂等菜单迁移 |
| `go run ./tools/checksilent -ui-dir ../go-admin-ui/src` | 0 error、0 warning；本仓库没有 core 目录，未扫描外部 core 源码 |
| 前端 Docker 中 `pnpm test:ci` | 通过：58 个单元测试文件、412 项测试；lint 0 error、40 个既有 warning；TypeScript、API 契约及 i18n 检查通过 |
| 生产构建 | `pnpm build:prod` 通过；最终局部样式调整后另执行 `pnpm exec vite build` 验证最终产物 |
| 诊断页面模拟接口浏览器测试 | 6 项通过；默认参数、开始/停止、结果下载、轮询中断保留/恢复、双 iPerf3 模式、权限不足、缺工具、键盘选择、IPv6 长输出、明暗及中英文、移动端 18px 字号偏好 |
| 真实后端浏览器/API 测试 | 1 项通过；无 API mock，覆盖所有工具、本机端口映射、自然过期与复用 |

本机 Node 26 的默认 Web Storage 与现有单元测试的 jsdom 环境冲突；Docker 的 Node 24.22.1 全量检查正常，本机使用 `NODE_OPTIONS=--no-experimental-webstorage` 也通过。没有为该环境差异改动产品代码。

## DMIT 布局调整

同日根据用户反馈，将左右栏改为约 35/65，普通工具的输入与运行/停止合并在一行；缩短服务器信息组并上移结果区。窄屏保持 DOM 顺序，服务器详情和空闲会话默认收起，活动会话自动展开。保留 Motor 外观、字号偏好及原有后端执行行为。

本轮仅修改两个页面组件和对应浏览器用例。定向 ESLint、`vue-tsc --noEmit`、`vite build` 均退出 0；Docker 中诊断单测 6 项通过，模拟接口浏览器测试由 6 项增加至 8 项并全部通过。新增验证覆盖 320/390/900/1024/1280px 的控件顺序、无页面横向溢出、桌面单行执行栏、窄屏详情展开和活动会话关闭。既有明暗主题、中英文、18px 字号偏好、双 iPerf3 模式及中断恢复用例继续通过。

独立布局评估在修正后回传 `ship`；布局专项扫描前后均为 `[]`。当前截图、七项布局结论和日志链接见[布局复核记录](../.impeccable/review/network-diagnostics-layout.md)。初次全量颜色扫描及真实后端证据保留，本轮没有改动后端，也没有重复执行真实网络测试。

## 终端回显与节点工具栏

同日按用户截图继续调整：节点与命令合并到全宽操作容器；去掉普通工具说明等常驻冗余信息；终端采用统一深色表面、紧凑等宽排版和原始字段分色。完整命令可展开，任务状态固定于终端底部，复制/下载保留纯文本。

12 项页面浏览器测试与 12 项诊断单测通过；随后补充字号、手机触控及保真断言的 3 项测试通过。TypeScript、定向 ESLint、i18n 和生产构建退出码均为 0。实际浏览器验证文字对比度、原始文本转义、节点键盘操作、命令展开及滚动跟随；排版/布局专项扫描均无 findings。独立复核返回 `ship`。当前截图和完整证据见[终端及工具栏复核](../.impeccable/review/network-diagnostics-terminal.md)。

本轮为前端改动，后端探测参数和数据源保持原样；以下真实执行结果仍属于初次功能交付的证据。

## 默认全宽终端与过期提示

按后续反馈移除常驻服务器栏，主机/IP 改为节点旁的点击详情浮层；只有活动或尚未确认的 iPerf3 会话占侧栏，结束后终端恢复全宽且不重建实例。过期、中断、截断及结束说明并入终端底部状态区，保留原始输出与恢复入口；过期/中断不再显示旧运行状态和递增时长。

最终 14 项页面浏览器回归通过，TypeScript、定向 ESLint、i18n、生产构建退出码均为 0，布局扫描无 findings；独立视觉复核返回 `ship`。测试新增节点详情焦点/关闭、320px IPv6、过期恢复及同宽布局断言。本轮没有修改后端或重复运行真实网络测试。截图、日志及范围见[全宽终端与状态记录](../.impeccable/review/network-diagnostics-focus.md)。

## 真实执行证据

开发镜像成功构建并重启后端，保留账户扩展 Compose 的环境配置。新增菜单迁移 `1792995000000` 已存在于本地迁移记录，重复执行没有新增待应用迁移。API 返回全部五种工具可用，真实菜单包含 `NetworkDiagnostics`。

| 场景 | 结果 |
| --- | --- |
| ping `127.0.0.1`，IPv4 | succeeded；5 发 5 收 |
| mtr `127.0.0.1` | succeeded；10 轮报告 |
| NextTrace `127.0.0.1` | succeeded；第 1 跳到达目标，地理查询关闭 |
| traceroute `127.0.0.1` | succeeded；第 1 跳到达目标 |
| ping `::1`，IPv6 | succeeded；5 发 5 收 |
| 后端 iPerf3 → 临时服务端 | 正向、反向均完成，返回 sender/receiver 汇总 |
| 宿主机 iPerf3 → `127.0.0.1:5201` | 正向、反向均完成，验证 Compose 发布端口可用 |
| 实际网页默认 ping | 从页面提交真实后端任务，显示输出并到达“已完成” |
| 运行中停止 mtr | cancelled；保留已有输出 |
| 临时 iPerf3 自然到期 | 120 秒后 expired；新会话复用 5201 并可正常停止 |
| 进程清理 | 完成后无 ping/mtr/nexttrace/traceroute/iperf3 进程；Compose 启用 init 回收工具产生的子进程 |

工具版本：iputils 20221126、mtr 0.95、traceroute 2.1.2、iperf3 3.12、NextTrace v1.7.4 Tiny。NextTrace 从固定 Go 模块构建，`go version -m` 确认模块版本及校验值；链接参数写入同一版本号，启动输出为 v1.7.4。

上述目标均为本机回环；吞吐值不能解释为外网线路带宽。未验证生产公网防火墙、远程客户端可达性或生产 Alpine 镜像。多实例部署需让这组 API 保持到同一执行实例；任务不跨重启保存。

## 界面与独立复核

页面沿用当前 DESIGN.md 和 design.json。桌面 1440×1100、手机 390×844；覆盖浅色中文、深色中文、深色英文、空态、运行、停止、更新中断和临时会话。原始长输出只在终端内部横向滚动，页面无横向溢出。所有截图位于 `.impeccable/review/network-diagnostics/`。

模拟截图使用文档保留地址 `192.0.2.1`、`2001:db8`，不能作为真实测量结果。`live-backend.png` 来自真实后端回环测试。截图和日志是本地验证证据，不作为随产品发布的图片资产。

独立代码复核发现初次恢复失败时丢失任务标识的问题；已将标识与已读取快照分开保存，并添加失败恢复回归测试，避免任务仍运行时再次提交。英文菜单键和保留时间文案也已修正。

初次全量 Impeccable detector 运行一次：0 个主问题、6 个终端局部颜色 advisory；后续移除空态图标时删除其中一个局部颜色，其余用途保留在页面说明中。初次独立视觉复核要求提高目标占位文字对比度，局部修正后测得 6.40:1，并返回 `ship`，该结论限于已复核的修正。文档核对保留共享设计文件；移动输入使用至少 16px 且继承较大字号偏好的规则。

## 复现

```sh
# 工作区根目录
docker compose -f docker-compose.dev.yml exec -T backend go test -race ./...
docker compose -f docker-compose.dev.yml exec -T frontend pnpm test:ci

# go-admin-ui 中，使用已运行且对应当前源码的开发服务
PW_REUSE_SERVER=1 pnpm exec playwright test --project=mocked tests/e2e/mocked/network-diagnostics.spec.ts
```

真实测试为显式启用。先通过当前开发环境正常登录，将 JWT 写入权限 0600 的临时文件，然后运行：

```sh
PW_REUSE_SERVER=1 \
DIAGNOSTICS_LIVE_TOKEN_FILE=/absolute/path/to/private-token-file \
DIAGNOSTICS_HOST_IPERF3=/absolute/path/to/iperf3 \
pnpm exec playwright test --project=live tests/e2e/network-diagnostics.spec.ts
```

`DIAGNOSTICS_HOST_IPERF3` 可省略，此时只验证容器内客户端；要验证宿主机发布端口应提供它。真实测试关闭 trace/video，结束时停止自己的任务并清理浏览器 cookie；测试凭据文件使用后删除。不要将 JWT 写入日志或提交仓库。

本地日志：根目录 `.local/diagnostics-{go-tests,docker-frontend-checks,checksilent,build-final,migration}.log`、`.local/diagnostics-live-results.json`；前端 `.impeccable/review/network-diagnostics-{e2e,live,build-final}.log`。

## 2026-10-26 — DMIT 回显与紧凑操作栏 polish

按用户本轮 shape 后调用 polish 的指令，恢复局部深灰回显、紧凑单行主操作栏；运行/停止原位切换，iPerf3 会话改为输出上方横向展开，任务失效说明收进底部状态行。节点详情、五种工具、双 iPerf3 模式、原始输出及 API 行为保留。

最终 14 项模拟浏览器回归、12 项诊断单测、类型检查、定向 ESLint、i18n 和生产构建通过。浏览器检查覆盖 320–1920px、明暗、中英文、18px 字号偏好、连续工具切换保留目标、IPv6、轮询恢复与节点浮层键盘操作。未重新执行真实后端探测。截图及日志见[本轮 polish 记录](../.impeccable/review/network-diagnostics-polish.md)。
