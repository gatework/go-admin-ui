---
name: motor
description: 既有 Arco 主题系统与已确认的 Motor 认证页面规范
colors:
  primary-default: "#1677ff"
  surface-light: "#ffffff"
  surface-dark: "#191c20"
  surface-soft-light: "#f7f8fa"
  surface-soft-dark: "#1f2227"
  text-primary-light: "#1f2329"
  text-primary-dark: "#f1f3f5"
  text-secondary-light: "#4b5563"
  text-secondary-dark: "#c9cdd4"
  border-light: "#e4e7ec"
  border-dark: "#30343a"
typography:
  body:
    fontFamily: "Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif"
    fontSize: "var(--motor-base-font-size)"
  auth-title:
    fontSize: "var(--motor-font-size-24)"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  auth-description:
    fontSize: "var(--motor-font-size-14)"
    lineHeight: 1.65
  auth-support:
    fontSize: "var(--motor-font-size-12)"
    lineHeight: 1.5
  auth-story:
    fontSize: "clamp(32px, 3.2vw, 50px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
components:
  auth-button-primary:
    backgroundColor: "var(--login-button-bg)"
    textColor: "#ffffff"
    rounded: "{rounded.xs}"
    height: "36px"
  auth-button-primary-hover:
    backgroundColor: "var(--login-button-hover-bg)"
  auth-button-primary-active:
    backgroundColor: "var(--login-button-active-bg)"
  auth-button-secondary:
    backgroundColor: "var(--color-secondary)"
    textColor: "var(--color-text-2)"
    rounded: "{rounded.xs}"
    height: "36px"
  auth-button-text:
    textColor: "var(--login-link-color)"
  auth-button-text-hover:
    backgroundColor: "var(--color-fill-1)"
    textColor: "var(--login-link-color)"
  auth-button-text-active:
    backgroundColor: "var(--color-fill-2)"
    textColor: "var(--color-text-1)"
  auth-link:
    textColor: "var(--login-link-color)"
  auth-input:
    backgroundColor: "var(--color-fill-2)"
    textColor: "var(--color-text-1)"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  auth-form:
    width: "420px"
  auth-registration-form:
    width: "460px"
  auth-toolbar-button:
    rounded: "{rounded.sm}"
    width: "36px"
    height: "36px"
  native-tag:
    textColor: "var(--color-text-1)"
    rounded: "{rounded.xs}"
    height: "24px"
    padding: "0 8px"
  native-card:
    backgroundColor: "var(--color-bg-2)"
    rounded: "{rounded.sm}"
---

# Design System: motor

## Overview

**Creative North Star: "沿用现有 Motor 认证外观"**

这是从当前代码提取的既有系统记录。已确认的视觉方向来自用户指定的本地 Ruby Motor 认证页面：小写 motor、M 标记、原生 Arco 控件、克制的工具栏和连续页面表面。没有引入新的视觉隐喻、品牌资产或图片方案。

全站颜色、间距、圆角和字号继续由现有主题与偏好系统控制；本次确认的页面构图仅适用于登录、注册、找回与重置密码。其他业务页面的视觉方向与能力边界仍以 [PRODUCT.md](PRODUCT.md) 为准，本文件不代表全站已完成设计验收。

**Key Characteristics:**

- 原生 Arco 语义色与组件状态，保留已有偏好。
- 认证页以任务标题、可见标签、单一主操作和明确反馈组织表单。
- 桌面故事栏支持表单，窄屏优先保证输入、提交和工具栏可达。
- 认证局部色阶保障文字可读性，不改写全局主题色板。

来源：`src/styles/motor.scss`、`src/styles/arco.css`、`src/styles/index.scss`、`src/config/theme-presets.ts`、`src/config/preferences.json`、`src/stores/preferences.ts` 及认证页面组件。页面范围、参考文件与验证证据见 [Account access](.impeccable/surfaces/src-views-account-access-index-vue.md)。

## Colors

以可选主色配合亮暗中性表面；前置 token 记录默认主题种子和 Motor 中性色，不覆盖运行时 Arco 色阶。

### Primary

- **默认主色**：`primary-default` 是主题种子。运行时的 `--motor-primary`、`--ga-brand` 和普通 Arco 主操作消费 `--primary-6`；`--link-*` 与主色一起由现有 `applyThemeColor` 更新。
- **可选主题**：完整预设以 `theme-presets.ts` 为准。认证工具栏只呈现其前七项：default、violet、pink、yellow、sky、mint、zinc；不删减其他已存预设或自定义色。
- **认证动作色**：`loginAccentColors` 从所选种子的 Arco 浅色序列中，取索引至少为 5 且对白色对比度至少为 5:1 的首个色阶；hover、active 依次取更深一阶并在序列末端截断。故事栏基色使用对白色至少为 6:1 的色阶。亮色链接取 hover 色阶；暗色链接从暗色序列中选对 `#2c2c2c` 至少为 4.5:1 的色阶。实际背景仍须以截图和渲染测量确认。

### Neutral

- **Motor 表面与文字**：前置 `surface-*`、`text-*`、`border-*` 是 `motor.scss` 的亮暗默认值；应用代码应继续消费对应的 `--motor-*` 变量。
- **Arco 内容层**：输入、标签、警告与原生浮层继续消费 `--color-bg-*`、`--color-fill-*`、`--color-text-*` 及状态色。`--ga-*` 只是现有映射，不是第二套色板。
- **认证辅助文字**：外壳局部将 `--color-text-3` 与 `--motor-text-3` 映射到 `--color-text-2`，使说明、占位文字和页脚保持可读。该映射不传播到其他页面或全局偏好。

**The Saved Palette Rule.** 保留用户所选主题及原生 Arco 色板；认证可读色阶只挂在认证外壳上。

## Typography

**Body Font:** 前置 `body` 保留应用已有的本地系统字体栈，不增加外部字体请求。

默认基准字号为 `--motor-base-font-size`（14px），由现有偏好在 12–18px 范围设置。`--motor-font-size-*` 是相对基准的加减值，不能把它们重写为固定像素后丢失字号偏好。认证任务标题、说明和辅助文字分别使用前置 `auth-title`、`auth-description`、`auth-support`。

认证故事标题的尺寸记录在 `auth-story`；1120px 以上至 1360px 的区间改为 30px。桌面居中布局的任务标题在常规标题上增加 2px。这些是认证页的局部层级，不是其他业务页面的标题规格。

**The Inherited Scale Rule.** 输入与表单文字继续跟随现有字号 token；移动或粗指针输入采用至少 16px 字号。

未提升为系统规则：现有故事标题仍继承系统无衬线字体。本轮按指定参考保留，不把它作为新页面的展示字体方案。

## Layout

全站默认间距与圆角见前置 token。紧凑密度将 `space-4/5/6` 改为 12/18/24px；已有全站 header、tabs 默认高度为 54/38px，紧凑时为 52/36px。它们与认证页尺寸分开维护。

认证外壳占满 `100dvh`。默认桌面网格为 `minmax(420px, 0.9fr) minmax(520px, 1.1fr)`，即空间足够时故事与表单约占 45/55；居左布局交换两栏，居中布局隐藏故事内容并铺开原有背景。认证 header 独立为 72px。表单宽度使用前置组件 token，并受可用宽度限制。

认证 panel 保持 header、可滚动 workspace、footer 三行；长注册表单在 workspace 内滚动，不挤掉工具栏或页脚。普通标签与控件间隔为 6px，注册为 4px；每个字段预留一行反馈高度（辅助字号 × 1.5），较长错误自然扩展。

在宽度不超过 1120px 时，故事栏与布局切换器隐藏并回到单列；不超过 520px 时品牌只保留 M，注册姓名/用户名从两列变为一列。控件和工具栏在窄屏或粗指针下增至至少 44px。邮箱验证码与发送按钮在不超过 360px 时上下排列。具体 breakpoint 和 motion 扩展见 `.impeccable/design.json`。

**The Reachable Form Rule.** 短屏和长错误使用表单区内部滚动；不能通过压缩点击区域或裁掉提交按钮来维持首屏构图。

## Elevation & Depth

既有系统提供轻量的 `--motor-shadow-sm` 与 `--motor-shadow-md`，亮暗值保留在 sidecar。认证表单直接落在连续表面上，没有额外卡片边框或投影；品牌 M 在认证页取消原全站头像式底色与阴影。

故事栏保留参考实现的主题渐变、细网格和低强度光场；这是认证背景的既有材料，不推广为业务页面装饰规则。居中布局压低中心背景对比以承载表单。背景不接收指针事件，也不承载业务信息。

表单只有短淡入；背景运动仅在宽屏、精确指针、允许运动且窗口可见和聚焦时启用。减少动态效果偏好停用对应动画。完整时长、曲线与暂停条件由实际组件及 sidecar 记录。

## Shapes

默认圆角使用前置 `xs` 至 `xl`。现有偏好用倍率生成圆角：xs/sm/md/lg/xl 分别是 `radius × 8/16/24/32/40px`，默认 `radius` 为 0.5；保留这一行为。

Arco small/medium/large 分别映射到 Motor xs/sm/md。大号原生按钮因此使用 xs，输入外壳和卡片使用 sm；不要为了“统一”把按钮和输入都改成相同圆角。认证工具按钮是方形点击区，调色板显示圆形色点。

## Components

### Buttons

主操作使用原生 Arco primary、完整文字和提交/loading/disabled 状态，认证外壳只替换启用状态的可读背景色。发送验证码保留原生 secondary；禁用态继续由 Arco 负责。认证文字按钮在 normal/hover 使用局部链接色，hover 配原生 fill-1；active 使用原生 text-1 与 fill-2。表单底部操作可换行，宽度填满表单。认证链接采用局部可读链接色，hover 下划线；键盘焦点有可见描边。

### Inputs / Fields

可见标签与输入的 accessible name 同时保留。底色为 Arco fill，hover 与 focus 继续沿用原生状态；focus 使用原生主色色边框。错误信息、密码规则、加载状态和自动填充文字保持可读。前置输入 height 表示常规最小目标，实际文本和多行反馈允许增高。

### Navigation

认证顶栏放置 motor/M 品牌和紧凑的主题色、布局、语言、明暗工具。图标操作有名称、状态与键盘焦点。调色板支持方向键、Home/End、Escape 及关闭后的焦点恢复；窄屏色板可横向滚动。表单跳转链接将焦点送到任务标题，保留当前 hash 路由。

### Cards / Containers

常规业务卡片沿用 Arco 与既有 Motor 圆角映射；`PageContainer`、`ProTable` 的组合规则以 `AGENTS.md` 为准。认证表单不是悬浮卡片，不从组件名推导新的阴影或容器。sidecar 的 card 仅记录原生基础外观，不表示其他业务页面经过本轮视觉审查。

### Chips / Tags

保留原生 Arco tag 的语义色、状态和尺寸。sidecar 只提供既有原生标签样例；认证页面不新增状态徽章或装饰标签。

### Feedback

错误与策略不可用使用原生 alert，并保留重试入口。注册、找回与重置的成功状态使用状态图标、标题、说明和明确下一步；状态区为 live region，成功后焦点进入标题。视觉反馈不能代替真实接口成功或更改账户安全语义。

## Do's and Don'ts

### Do:

- **Do** 保留小写 motor、M 标记和原生 Arco 控件。
- **Do** 通过既有偏好 store 修改主题，复用现有登录布局存储。
- **Do** 将认证几何、可读色阶和背景材料限制在认证范围。
- **Do** 同时检查明暗、主题色、窄屏、英文和正常/hover/active 状态。
- **Do** 以真实表单状态呈现错误、加载与成功，保留标签和键盘焦点。

### Don't:

- **Don't** 为认证页面另建主题状态，或重置用户已有偏好。
- **Don't** 把认证故事栏、背景网格或标题尺寸推广为其他业务页面的统一构图。
- **Don't** 为追求表单紧凑裁掉错误、密码规则、操作区域或页脚。
- **Don't** 将本地 Mailpit、截图或前端回归扩写为生产邮件、设备业务或全站交付证据。
