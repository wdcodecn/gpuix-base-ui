# `gpuix-base-ui` 性能与交互优化说明

为配合 `gpuix-android` 的零拷贝二进制突变管线与低功耗高刷调度，组件库在事件订阅、布局锚定与长列表虚拟化上实施了以下架构精简与性能规范：

## 1. 零浪费交互状态（`usePress` 与 `Button`）

- **`usePress` 精简**（`src/base/foundations.tsx`）：移除高频触发 JS 桥接的 `onMouseMove` 事件监听，并默认关闭无谓的悬停/焦点 JS 状态追踪，仅在明确启用交互态反馈时才挂载对应处理器，消除触控滑屏期间不必要的 React 重渲染与跨语言消息开销。
- **`Button` 原生交互态**（`src/base/button.tsx`、`src/base/controls.tsx`）：按钮的悬停与按压视觉反馈直接下沉为 GPUI 原生样式规则（`hover` / `active`），无需经由 JS 状态切换驱动动画与重绘。

## 2. 原生全屏锚定与 Push 视口订阅

- **全屏浮层原生锚定**（`src/base/overlay.tsx`）：`Dialog`、`Drawer`、`Toast` 等浮层容器采用 `<anchored fill="window" ...>`，直接依赖 GPUI 原生全屏锚定排版，不再依赖 JS 读取窗口像素尺寸来回拼装全屏约束，从根本上避免布局抖动与首帧错位。
- **Push 驱动视口 Hook**（`src/base/foundations.tsx`、`src/base/display.tsx`）：提供共享的 `useViewportSize` 与 `useViewportInsets` 订阅机制，底层接收原生主动推送的 `windowResize` / `windowInsets` 事件并同步至 `__gpuixViewport`，取代任何定时器或渲染期轮询查询。

## 3. 长列表虚拟化（`<List.Virtual>`）

- 在 `src/list-impl.tsx`、`src/list.ts` 与 `playground.tsx` 中新增并接入 `<List.Virtual>` 虚拟列表组件，仅挂载可视视口及其缓冲区内的行节点，配合原生 `GPX1` 增量二进制协议与驻留样式表实现万级列表流畅滚动。

## 4. 验证记录

- **类型与静态检查**：在 `/Users/luke/Projects/home_vps/gpuix-base-ui` 执行 `bun run check` 通过（0 errors，0 warnings）。
- **真机联合验证**：已打包为 Hermes `.hbc` 并构建 `gpuix-base-ui-release.apk`（`16,571,169 B` / 15.80 MiB），在 `OPPO PKC110`（120Hz Vulkan）冷启动实测 `665 ms`（首次）/ `425 ms`（二次），静默期保持 1Hz 低功耗待机。
