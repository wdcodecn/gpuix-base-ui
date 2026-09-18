# gpuix-base-ui

[English](README.md)

`gpuix-base-ui` 是一套面向 React + GPUIX 0.9 的开源组件源码:按 Base UI
(v1.8.0)公开的组件家族与 anatomy 完整移植,只组合 GPUIX 的原生节点和事件,
不修改 `@gpuix/*` 的底层源码。

## 组件家族

37 个组件家族与官方命名一致:

`Accordion` · `AlertDialog` · `Autocomplete` · `Avatar` · `Button` · `Checkbox` ·
`CheckboxGroup` · `Collapsible` · `Combobox` · `ContextMenu` · `Dialog` · `Drawer` ·
`Field` · `Fieldset` · `Form` · `Input` · `Menu` · `Menubar` · `Meter` ·
`NavigationMenu` · `NumberField` · `OTPField` · `Popover` · `PreviewCard` · `Progress` ·
`RadioGroup` · `ScrollArea` · `Select` · `Separator` · `Slider` · `Switch` ·
`Tabs` · `Toast` · `Toggle` · `ToggleGroup` · `Toolbar` · `Tooltip`。

工具与 Provider:`mergeProps`、`mergePropsN`、`useRender`、`CSPProvider`、
`DirectionProvider`、`useDirection`、`useToastManager`、`createToastManager`。

`Radio` 与 `RadioGroup.Item` 等价,`Tabs.Trigger/Content` 是 `Tabs.Tab/Panel` 的
别名;其余部件名与官方文档逐项对应。仓库另外提供 `List` 组合层
(`List.Root/Header/Toolbar/Item/ItemLeading/ItemContent/ItemTitle/ItemDescription/ItemMeta/ItemActions/Section/Separator/Empty/Loading`)
和 `Card`、`Badge`、`Glyph`、`IconButton` 等应用级预设。

## 目录结构

```text
src/base/foundations.tsx   可控状态、按压、键盘、hover/focus、拖拽、bounds、roving focus
src/base/surface.tsx       浮层公共层(anchored popup、item collection、列表导航)
src/base/button.tsx        Button 语义与主题预设
src/base/controls.tsx      Toggle / ToggleGroup / Toolbar
src/base/overlay.tsx       Dialog / AlertDialog / Drawer / Popover / PreviewCard / Tooltip / Menu / ContextMenu / Menubar
src/base/chooser.tsx       Select / Autocomplete / Combobox / NavigationMenu
src/base/form.tsx          Field / Fieldset / Form / Input / NumberField / OTPField / Checkbox / CheckboxGroup / RadioGroup / Switch / Slider
src/base/display.tsx       Accordion / Collapsible / Avatar / Meter / Progress / ScrollArea / Separator / Tabs / Toast
src/base/providers.tsx     DirectionProvider / CSPProvider
src/base-components.tsx    聚合入口
src/merge-props.ts         mergeProps 实现
src/use-render.ts          useRender 实现
src/<name>.ts              单组件子路径入口,与官方命名一一对应
```

应用可以直接复制这些源码,替换 `ThemeTokens` 建立自己的视觉系统。

## GPUIX 0.9 映射边界

- 没有 DOM 与 Portal:`Portal` 部件为透传,Dialog/Drawer 使用窗口坐标层,
  菜单、下拉与浮层使用 GPUIX 的 `<anchored>` 原生定位。
- 原生样式不接受百分比尺寸与偏移:指示条、滑块 Thumb、滚动条 Thumb 的位置
  通过 `renderer.getElementBounds()` 实测像素计算。
- 无 CSS transition:弹层即时开合;需要动画时使用 GPUIX 的 `motion` 能力。
- ARIA 为 GPUIX 子集:`role`、`aria-label`、`aria-description`、`aria-id`、
  `aria-expanded`、`aria-selected`、`aria-valuetext`、`aria-level`。
- 键盘事件需要元素焦点:交互部件自带 `tabIndex`,方向键、Enter、Space、
  Escape、typeahead 均按 GPUIX 的 key payload 处理。
- 焦点回归:浮层关闭后焦点返回 trigger;Dialog 打开时聚焦 Popup 容器。

## Playground

```bash
bun install
bun run typecheck
bun run dev
```

`playground.tsx` 是 9 页 Clash Verge 风格工作台:首页、代理、订阅、连接、规则、
日志、测试、组件、设置。启动窗口 1280×860,最小 1024×768,窄窗口收缩侧栏。

- 代理页是真实 5,000 条节点列表:业务层切片当前 100 行,GPUIX 原生
  `<virtual-list>` 负责高度估算、可见范围和滚轮惯性。
- 组件页(`gallery.tsx`)把全部组件家族挂成可交互样例:菜单、右键菜单、子菜单、
  Dialog/AlertDialog/Drawer/Popover/Tooltip、Select/Combobox/Autocomplete、
  表单校验、Slider 拖动、OTP 跳格、Toast、ScrollArea、Tabs、Accordion 等。

## Android 配套

Android native host、Hermes、GPUI/wgpu 运行时与 APK/AAB CLI 已拆分到独立框架
[`wdcodecn/gpuix-android`](https://github.com/wdcodecn/gpuix-android)。可运行示例位于
[`wdcodecn/gpuix-app-starter`](https://github.com/wdcodecn/gpuix-app-starter)。本仓库只维护
组件源码、主题与交互语义，不再携带平台构建工具链。

## 发布

仓库以源码分发:`files` 只包含组件源码、README 与许可证；`exports` 提供根入口、`./merge-props`、
`./use-render` 以及每个组件的子路径入口。本地 `dist/`、Android 构建缓存、下载
依赖与生成的原生库不会进入发布内容。
