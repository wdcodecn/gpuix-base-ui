# `gpuix-base-ui` 性能与交互优化说明

为配合 `gpuix-android` 的零拷贝二进制突变管线与低功耗高刷调度，组件库在事件订阅、布局锚定与长列表虚拟化上实施了以下架构精简与性能规范：

## 1. 零浪费交互状态（`usePress` 与 `Button`）

- **`usePress` 精简**（`src/base/foundations.tsx`）：移除高频触发 JS 桥接的 `onMouseMove` 事件监听，并默认关闭无谓的悬停/焦点 JS 状态追踪，仅在明确启用交互态反馈时才挂载对应处理器，消除触控滑屏期间不必要的 React 重渲染与跨语言消息开销。
- **`Button` 原生交互态**（`src/base/button.tsx`、`src/base/controls.tsx`）：按钮的悬停与按压视觉反馈直接下沉为 GPUI 原生样式规则（`hover` / `active`），无需经由 JS 状态切换驱动动画与重绘。

## 2. 原生全屏锚定与 Push 视口订阅

- **全屏浮层原生锚定**（`src/base/overlay.tsx`）：`Dialog`、`Drawer`、`Toast` 等浮层容器采用 `<anchored fill="window" ...>`，直接依赖 GPUI 原生全屏锚定排版，不再依赖 JS 读取窗口像素尺寸来回拼装全屏约束，从根本上避免布局抖动与首帧错位。
- **Push 驱动视口 Hook**（`src/base/foundations.tsx`、`src/base/display.tsx`）：提供共享的 `useViewportSize` 与 `useViewportInsets` 订阅机制，底层接收原生主动推送的 `windowResize` / `windowInsets` 事件并同步至 `__gpuixViewport`，取代任何定时器或渲染期轮询查询。

## 3. 长列表虚拟化（`<List.Virtual>`）

- 在 `src/list-impl.tsx`、`src/list.ts` 与 `playground.tsx` 中新增并接入 `<List.Virtual>` 虚拟列表组件，仅挂载可视视口及其缓冲区内的行节点，配合原生 `GPX1` 增量二进制协议与驻留样式表，限制列表首屏和滚动窗口更新的规模。

## 4. 验证记录

- **类型与静态检查**：在 `/Users/luke/Projects/home_vps/gpuix-base-ui` 执行 `bun run check` 通过（0 errors，0 warnings）。
- **真机联合验证**：已打包为 Hermes `.hbc` 并构建 `gpuix-base-ui-release.apk`（`16,571,169 B` / 15.80 MiB），在 `OPPO PKC110`（120Hz Vulkan）冷启动实测 `665 ms`（首次）/ `425 ms`（二次），静默期保持 1Hz 低功耗待机。

## 5. 2026-11-24 Demo 滚动与诊断回归

OPPO PKC110、Android 17、1080 × 2376、显示模式 120 Hz。测试 Release Hermes 字节码，安装后用 SHA-256 确认 APK。原包、第一轮 Demo 包和设置页完成包使用相同的 Android DEX 与三个 arm64 动态库。

| 页面 | 采样安排 | 优化前 7–9 ms 档 | 优化后 7–9 ms 档 | 出帧间隔 P99 档 |
| --- | --- | ---: | ---: | ---: |
| 设置 | 3 次上下往返，每次拖动 480 ms | 338/358（94.4%） | 372/373（99.7%），复跑 366/367（99.7%） | 16 → 8 ms |
| 组件工作台 · 表单 | 4 次向上拖动，每次 650 ms | 405/480（84.4%） | 464/508（91.3%） | 16 → 16 ms |
| 代理 · 5,000 行 | 同上，热态 | 571/573（99.7%） | 547/550（99.5%） | 8 → 8 ms |
| 原生能力 | 同上 | 551/552（99.8%） | 551/552（99.8%） | 8 → 8 ms |

设置页 `--latency` 最近约 60 个有效间隔的 P99 为 16.715 → 8.401 / 8.427 ms。实际呈现更均匀。该页缓冲区提交到呈现的 P50 为 17 → 23 ms，P99 为 24 → 25 ms，管线延迟仍需独立观察。代理页在第一次覆盖安装后的采样出现 33 ms P50，同包热态复跑恢复到 8 ms，强制停止后重新冷启动采样得到 552/554 个 7–9 ms 间隔。冷态波动原因未定位。

设置页实机检查覆盖滚动到底、深浅主题、选择 60 Hz 后离开再进入保留选择、切回 120 Hz。代理快速连续滑动触发窗口从 1–48 更新到 13–60，行内容正常显示。组件表单滚动后分类入口仍可用。桌面、横屏、真实手指到像素的延迟和长时温控未测。

- 原包 SHA-256 `f31315734f2ef346db4d7ade3251250772327a96909a341d6d7c644d3a32005e`
- 第一轮 Demo 包 SHA-256 `c15cf24098a8456aaf31a3976a3bb96866a7a419a4975b62c4c326a230228555`
- 设置页完成包 SHA-256 `28a5c9996dd05549dbd819236a4740957c4d3f86caafd88a92db9366e82ff7b7`，21,399,061 B

### 实现要点

- **设置页**。竖屏四张可变高卡片交给一个原生 `virtual-list`。保留 React 子树和控件状态，由原生列表按可见范围绘制。宿主提供有界高度，外层关闭滚动。刷新率选项和其他卡片独立，偏好在页面离开后保留。横屏和桌面继续使用双列。
- **长列表**。代理列表保留 48 个 React 子项，窗口左右留缓冲，跨边界按 12 行移动。可视范围和用户数据范围分别检查。区域用文本短码渲染，解决 PKC110 上国旗字形为空的问题。数值与单位用同一文本节点，防止窄屏把延迟拆为两行。
- **组件工作台**。固定分类按钮，内容区拥有独立滚动容器；切换分类时更换滚动容器的 key。页面内容区也随页面 key 重建，避免复用上一页滚动位置。每次只挂载当前分类。
- **诊断面板**。诊断状态只更新浮窗和页头读数。停止采样时清除定时器。新版浮窗与首页滚动复测见第 6 节。
- **实时事件**。原生 Demo 把传感器事件订阅及读数交给读数子组件，监听时只更新读数。离开后解绑并停止传感器。保持 WebView、IME 等示例的现有行为。

### 复测流程

用相同设备、分辨率、刷新率上限和构建类型。先记录面板模式，关掉诊断和原生叠加层，再执行固定手势。每个场景独立采样，记录 APK 哈希、冷热状态及重复测试间的温控差异。设置页上下往返能避免在边界长时间做无效手势。以下坐标适用于这台设备的设置页。

```sh
adb shell dumpsys display | grep -m 1 'renderFrameRate'
adb shell dumpsys SurfaceFlinger --timestats -enable
adb shell dumpsys SurfaceFlinger --timestats -clear
adb shell 'for i in 1 2 3; do input swipe 550 1890 550 1160 480; input swipe 550 1160 550 1890 480; done'
adb shell dumpsys SurfaceFlinger --timestats -dump > settings-timestats.txt
adb shell dumpsys SurfaceFlinger --list
adb shell "dumpsys SurfaceFlinger --latency '<VRI-dev.gpuix.baseui 图层全名>'" > settings-present.txt
adb shell dumpsys SurfaceFlinger --timestats -disable
```

- 以实际更新的 GPUIX VRI 图层为准，系统导航栏也会独立出帧。120 Hz 单周期约 8.33 ms，整数直方图会落入 8 ms 档，`averageFPS` 可能因为取整显示 124。使用 `--latency` 的第二列相邻有效呈现时间戳恢复纳秒间隔。剔除未呈现占位值与零值。[Android Slow Sessions](https://developer.android.com/games/optimize/vitals/slow-session)
- 区分面板 Hz、呈现间隔、原生绘制耗时和触摸到呈现。当前 GPUIX VRI 样本的 TimeStats `totalTimelineFrames` 为零，掉帧结论使用该层呈现间隔。触摸链路定位可采集输入、线程调度、SurfaceFlinger 和应用时序，先检查跟踪中是否有有效的应用层帧 token。[Perfetto FrameTimeline](https://perfetto.dev/docs/data-sources/frametimeline)
- 长列表检查首次挂载、连续跨窗口、反向滚动、筛选、选中和焦点。可变高卡片检查顶部、底部、键盘、浮层与横竖屏。页面静止时以无业务重绘为目标。带诊断面板的采样留作定位数据。

### 与 Android 原生、Flutter 的比较

GPUIX 已具备独立 Hermes、React 保留树、GPX1 增量提交、Rust/GPUI 渲染、VSync 调度和原生列表。当前证据达到**单机代表性 Demo 可在 120 Hz 周期呈现**的水平。复杂表单长尾、冷态波动、触摸到像素、嵌入视图、多设备和温控仍是独立性能场景。

- Android Views / Jetpack Compose 的系统交互、输入法与无障碍集成路径成熟，能直接使用 Macrobenchmark 量化首屏、CPU 帧耗时和帧超期。GPUIX 的差异是 React 组件跨平台复用和自有绘制管线，平台适配与测量需要逐项验证。[Android Macrobenchmark](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-metrics)
- Flutter 的 Dart UI 与 raster 线程可在 DevTools 中分别分析，官方把支持 120 Hz 的设备纳入 120 fps 目标。GPUIX 可复用 React/TypeScript 组件，原生滚动和弹簧绕过 React 逐帧更新。比较两者速度应使用同设备、等价页面和相同呈现/输入延迟口径，本轮没有做横向跑分。[Flutter DevTools Performance](https://docs.flutter.dev/tools/devtools/performance)

## 6. 首页 120 Hz 与帧率浮窗

首页竖屏的六张卡片由独立原生 `virtual-list` 管理。滚动时按可见范围绘制，卡片保留稳定 key，节点选择和开关只重渲染各自卡片。移除流量图中写死的 `FPS: 60`，节点延迟随示例选择变化。桌面和横屏保留双列。

同一 PKC110 在 120 Hz 下关闭诊断，连续做三轮往返拖动。每段手势从 `(550,2040)` 到 `(550,1140)` 或反向，持续 480 ms。前后 APK 的 DEX 与 arm64 动态库哈希相同。

| 首页现象 | 优化前两轮 | 优化后两轮 |
| --- | --- | --- |
| 7–9 ms 出帧间隔 | 15/125、15/121 | 370/370、369/369 |
| `--latency` 呈现间隔 P50 | 33.270 / 33.150 ms | 8.332 / 8.332 ms |
| `--latency` 呈现间隔 P99 | 41.671 / 33.514 ms | 8.400 / 8.591 ms |
| 缓冲区提交到呈现 P50 档 | 16 / 14 ms | 16 / 16 ms |

帧率诊断复用应用主题。手机竖屏浮窗在导航下方靠右展开，收起为页头读数。诊断显示 GPUI 原生绘制次数和绘制耗时，实际呈现间隔使用 SurfaceFlinger 测量。按秒读取统计，少量孤立绘制保留「待滑动」，避免统计自身引起持续重绘。面板打开并静止后，4 秒 TimeStats 窗口内没有记录到 GPUIX 图层的新帧。

期间两次覆盖安装后快速重新拉起出现原生断言 `must construct App on main thread`。该断言来自 Android 原生宿主，当前宿主按进程缓存 GPUI 平台及其所有线程身份。最终包完成冷启动、滚动复测和同进程退后台再返回。Activity 重建的原生生命周期路径仍需单独修复与验证。

完成包 SHA-256 `29810731347db5b2fb9dcfb4f050981ad1979afe38ea287737e2324f119a0c47`，21,400,593 B。

## 7. 后续改动的验收要点

| 容易出问题的路径 | 代码做法与验收 |
| --- | --- |
| 页面滚动带着整棵树重排 | 竖屏长页面由单个有界原生列表负责；给可变高卡片和数据行稳定的 key。真机滚到两端、连续跨窗口和反向滚动，确认无空行跳动、选中与焦点仍有效。 |
| 一条高频事件刷新整个页面 | 把状态放到最小消费组件。传感器读数、帧率浮窗、刷新率控件分别更新；离开页面解绑事件，停止采样清除定时器。 |
| 诊断本身影响读数和帧率 | 使用原生累计绘制统计，按需低频采样。用静置与持续滚动两个场景确认读数能停、能更新，再关闭诊断采 SurfaceFlinger 的应用图层。 |
| 把不同阶段的数字混成「120 FPS」 | 记录面板模式、实际呈现间隔 P50/P99 和提交到呈现耗时。触摸到像素单独测。以相同 Release、设备状态和手势复跑，保留异常首轮。 |
| 装错版本或自动输入打到别的 App | 对照本地 APK 与设备已装 APK 的 SHA-256。发手势前确认 `topResumedActivity` 是目标 App，采样后再核对目标图层与进程。覆盖安装后先等进程状态稳定，再决定是否显式拉起。 |
| 把正常回前台当成 Activity 重建通过 | 分别验证冷启动、同进程后台恢复、Activity 销毁重建。Android 宿主改生命周期时，用实际重建场景回归 `must construct App on main thread` 断言，核对 native 平台、线程身份与 Hermes 实例的生命周期。 |

发布记录同时写明 APK 哈希、构建配置、实测设备、已验收场景及仍开放的问题。当前首页的成绩仅覆盖 PKC110 竖屏短时固定手势。Activity 重建、长时温控、横屏和多机型仍需各自的验收数据。
