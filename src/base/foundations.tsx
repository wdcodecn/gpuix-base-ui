import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { useGpuix } from '@gpuix/react'
import {
  observeWindowInsets,
  observeWindowSize,
  readWindowInsets,
  readWindowSize,
  type NativeRenderer as HostNativeRenderer,
  type WindowInsets,
  type WindowSize,
} from '@gpuix/native/host'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'

export type Style = Record<string, unknown>
export type ElementRef = RefObject<Instance | null>
export type OpenReason =
  | 'trigger-press'
  | 'trigger-hover'
  | 'trigger-focus'
  | 'outside-press'
  | 'escape-key'
  | 'close-press'
  | 'item-press'
  | 'list-navigation'
  | 'focus-out'
  | 'sibling-open'
  | 'imperative-action'
  | 'input-change'
  | 'input-blur'
  | 'input-clear'
  | 'input-paste'
  | 'keyboard'
  | 'drag'
  | 'track-press'
  | 'scrub'
  | 'increment-press'
  | 'decrement-press'
  | 'wheel'
  | 'none'

export type ChangeDetails = {
  reason: OpenReason
  event?: EventPayload
  cancel: () => void
  isCanceled: boolean
}

export function createDetails(reason: OpenReason, event?: EventPayload): ChangeDetails {
  const details: ChangeDetails = { reason, event, cancel: () => { details.isCanceled = true }, isCanceled: false }
  return details
}

export function useControllableState<T>(options: {
  value?: T
  defaultValue: T
  onChange?: (value: T, details: ChangeDetails) => void
}) {
  const [internal, setInternal] = useState<T>(options.defaultValue)
  const controlled = options.value === undefined ? undefined : options.value
  const value = controlled === undefined ? internal : controlled
  const onChange = options.onChange
  const setValue = useCallback((next: T, reason: OpenReason = 'none', event?: EventPayload) => {
    const details = createDetails(reason, event)
    onChange?.(next, details)
    if (details.isCanceled) return
    if (controlled === undefined) setInternal(next)
  }, [controlled, onChange])
  return [value, setValue] as const
}

export function useOpenState(options: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
}) {
  return useControllableState<boolean>({
    value: options.open,
    defaultValue: options.defaultOpen ?? false,
    onChange: options.onOpenChange ? (open, details) => options.onOpenChange?.(open, details) : undefined,
  })
}

export function useBounds(ref: ElementRef) {
  const { renderer } = useGpuix()
  return useCallback(() => {
    const id = ref.current?.id
    if (id === undefined || id === null) return null
    return renderer?.getElementBounds?.(id) ?? null
  }, [ref, renderer])
}

export function useAnchoredPosition(
  ref: ElementRef,
  open: boolean,
  side: 'top' | 'right' | 'bottom' | 'left',
  align: 'start' | 'center' | 'end',
) {
  const getBounds = useBounds(ref)
  if (!open) return undefined
  const bounds = getBounds()
  if (!bounds) return undefined
  const horizontal = align === 'start' ? bounds.x : align === 'end' ? bounds.x + bounds.width : bounds.x + bounds.width / 2
  const vertical = align === 'start' ? bounds.y : align === 'end' ? bounds.y + bounds.height : bounds.y + bounds.height / 2
  if (side === 'top') return { x: horizontal, y: bounds.y }
  if (side === 'right') return { x: bounds.x + bounds.width, y: vertical }
  if (side === 'left') return { x: bounds.x, y: vertical }
  return { x: horizontal, y: bounds.y + bounds.height }
}

export function useFocusElement() {
  const { renderer } = useGpuix()
  return useCallback((ref: ElementRef | null | undefined) => {
    const id = ref?.current?.id
    if (id !== undefined && id !== null) renderer?.focusElement?.(id)
  }, [renderer])
}

export function useReturnFocus(open: boolean, ref: ElementRef) {
  const focusElement = useFocusElement()
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) focusElement(ref)
    wasOpen.current = open
  }, [open, focusElement, ref])
}

export function useRovingFocus(options: { orientation?: 'horizontal' | 'vertical'; loop?: boolean } = {}) {
  const { renderer } = useGpuix()
  const refs = useRef<ElementRef[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const register = useCallback((ref: ElementRef) => {
    refs.current = [...refs.current, ref]
    return refs.current.length - 1
  }, [])
  const keyDownFor = useCallback((index: number) => (event: EventPayload) => {
    const list = refs.current
    if (list.length === 0) return
    const orientation = options.orientation ?? 'horizontal'
    const loop = options.loop ?? true
    const key = keyName(event)
    const forward = orientation === 'horizontal' ? key === 'right' : key === 'down'
    const backward = orientation === 'horizontal' ? key === 'left' : key === 'up'
    let next = index
    if (forward) next = index + 1
    else if (backward) next = index - 1
    else if (key === 'home') next = 0
    else if (key === 'end') next = list.length - 1
    else return
    if (next < 0) next = loop ? list.length - 1 : 0
    if (next >= list.length) next = loop ? 0 : list.length - 1
    const id = list[next]?.current?.id
    if (id !== undefined && id !== null) renderer?.focusElement?.(id)
    setActiveIndex(next)
  }, [options.orientation, options.loop, renderer])
  return { register, activeIndex, setActiveIndex, keyDownFor }
}

export function keyName(event: EventPayload) {
  const key = (event.key ?? '').toLowerCase()
  if (key === ' ' || key === 'spacebar') return 'space'
  return key
}

export function isActivationKey(event: EventPayload) {
  const key = keyName(event)
  return key === 'enter' || key === 'space'
}

export function isArrowKey(event: EventPayload, orientation: 'horizontal' | 'vertical' = 'vertical') {
  const key = keyName(event)
  if (orientation === 'vertical') return key === 'up' || key === 'down'
  return key === 'left' || key === 'right'
}

export function isModKey(event: EventPayload) {
  return Boolean(event.modifiers?.cmd || event.modifiers?.ctrl)
}

export function useHoverState(enabled = true) {
  const [hovered, setHovered] = useState(false)
  return {
    hovered: enabled ? hovered : false,
    hoverProps: enabled ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } : {},
  }
}

export function useFocusState(enabled = true) {
  const [focused, setFocused] = useState(false)
  return {
    focused: enabled ? focused : false,
    focusProps: enabled ? { onFocus: () => setFocused(true), onBlur: () => setFocused(false) } : {},
  }
}

type ViewportPushHub = {
  subscribeSize?: (listener: (size: WindowSize) => void) => () => void
  subscribeInsets?: (listener: (insets: WindowInsets) => void) => () => void
}

function createSharedViewportStore<T>(
  read: (renderer: HostNativeRenderer | null) => T,
  observe: (renderer: HostNativeRenderer | null, cb: (next: T) => void, opts: { intervalMs?: number | false }) => () => void,
  subscribePush: (hub: ViewportPushHub | undefined, cb: (next: T) => void) => (() => void) | undefined,
  defaultIntervalMs: number,
) {
  let current = read(null)
  let currentRenderer: HostNativeRenderer | null = null
  let stopObserve: (() => void) | null = null
  let stopPush: (() => void) | null = null
  const listeners = new Set<() => void>()

  const notify = (next: T) => {
    current = next
    for (const listener of listeners) listener()
  }

  const start = (renderer: HostNativeRenderer | null, intervalMs: number) => {
    stopObserve?.()
    stopObserve = null
    stopPush?.()
    stopPush = null
    currentRenderer = renderer
    const hub = Reflect.get(globalThis, '__gpuixViewport') as ViewportPushHub | undefined
    const pushUnsub = subscribePush(hub, notify)
    if (pushUnsub) {
      stopPush = pushUnsub
      current = read(renderer)
      return
    }
    stopObserve = observe(renderer, notify, { intervalMs })
  }

  return {
    use(renderer: HostNativeRenderer | null, intervalMs = defaultIntervalMs): T {
      const subscribe = useCallback((listener: () => void) => {
        const shouldStart = listeners.size === 0 || currentRenderer !== renderer
        listeners.add(listener)
        if (shouldStart) start(renderer, intervalMs)
        return () => {
          listeners.delete(listener)
          if (listeners.size === 0) {
            stopObserve?.()
            stopObserve = null
            stopPush?.()
            stopPush = null
            currentRenderer = null
          }
        }
      }, [renderer, intervalMs])
      useEffect(() => {
        if (listeners.size > 0 && currentRenderer !== renderer) {
          start(renderer, intervalMs)
        }
      }, [renderer, intervalMs])
      return useSyncExternalStore(subscribe, () => current)
    },
  }
}

const sharedSizeStore = createSharedViewportStore<WindowSize>(
  (renderer) => readWindowSize(renderer),
  (renderer, cb, opts) => observeWindowSize(renderer, cb, opts),
  (hub, cb) => hub?.subscribeSize?.(cb),
  250,
)

const sharedInsetsStore = createSharedViewportStore<WindowInsets>(
  (renderer) => readWindowInsets(renderer),
  (renderer, cb, opts) => observeWindowInsets(renderer, cb, opts),
  (hub, cb) => hub?.subscribeInsets?.(cb),
  250,
)

/**
 * Shared viewport size hook. Uses push notifications with zero timer polling
 * when provided by the native host, and shares a single observer otherwise.
 */
export function useViewportSize(options: { intervalMs?: number } = {}): WindowSize {
  const { renderer } = useGpuix()
  return sharedSizeStore.use(renderer as unknown as HostNativeRenderer | null, options.intervalMs)
}

/**
 * Shared safe-area and IME insets hook. Uses push notifications with zero timer
 * polling when provided by the native host, and shares a single observer otherwise.
 */
export function useViewportInsets(options: { intervalMs?: number } = {}): WindowInsets {
  const { renderer } = useGpuix()
  return sharedInsetsStore.use(renderer as unknown as HostNativeRenderer | null, options.intervalMs)
}

export function usePress(options: {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  role?: string
  trackHover?: boolean
  trackFocus?: boolean
  onPress?: (event: EventPayload) => void
  onKeyDown?: (event: EventPayload) => void
}) {
  const disabled = options.disabled ?? false
  const { hovered, hoverProps } = useHoverState(options.trackHover ?? false)
  const { focused, focusProps } = useFocusState(options.trackFocus ?? false)
  // Keep a start-coordinate slop check between mouseDown and mouseUp/click so a
  // touch swipe never becomes an accidental click without paying per-frame mouseMove IPC.
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const canFocus = !(disabled && !options.focusableWhenDisabled)
  const exceededSlop = (active: { x: number; y: number }, event: EventPayload) => {
    const dx = (event.x ?? active.x) - active.x
    const dy = (event.y ?? active.y) - active.y
    return dx * dx + dy * dy > 64
  }
  const pressProps = {
    role: options.role ?? 'button',
    tabIndex: canFocus ? 0 : -1,
    'aria-disabled': disabled || undefined,
    onClick: (event: EventPayload) => {
      if (disabled) return
      const active = gesture.current
      const moved = Boolean(active?.moved || (active && exceededSlop(active, event)))
      gesture.current = null
      if (!moved) options.onPress?.(event)
    },
    onMouseDown: (event: EventPayload) => {
      if (disabled || (event.button !== undefined && event.button !== 0)) return
      gesture.current = { x: event.x ?? 0, y: event.y ?? 0, moved: false }
    },
    onMouseUp: (event: EventPayload) => {
      const active = gesture.current
      if (!active) return
      if (exceededSlop(active, event)) active.moved = true
    },
    onKeyDown: (event: EventPayload) => {
      if (disabled) return
      options.onKeyDown?.(event)
      if (isActivationKey(event) && !event.isHeld) options.onPress?.(event)
    },
    ...hoverProps,
    ...focusProps,
  }
  return { pressProps, hovered, focused }
}

export function useDismiss(options: { enabled: boolean; onDismiss: (event: EventPayload) => void }) {
  return {
    onMouseDownOutside: (event: EventPayload) => { if (options.enabled) options.onDismiss(event) },
  }
}

export function escapeHandler(options: { enabled: boolean; onEscape: (event: EventPayload) => void }) {
  return (event: EventPayload) => { if (options.enabled && keyName(event) === 'escape') options.onEscape(event) }
}

export function useTypeahead() {
  const buffer = useRef({ text: '', at: 0 })
  return useCallback((char: string) => {
    const now = Date.now()
    const next = now - buffer.current.at > 700 ? char : buffer.current.text + char
    buffer.current = { text: next, at: now }
    return next.toLowerCase()
  }, [])
}

export function useDrag(options: {
  onStart: (event: EventPayload) => void
  onMove: (event: EventPayload) => void
  onEnd: (event: EventPayload) => void
}) {
  const dragging = useRef(false)
  const [isDragging, setDragging] = useState(false)
  return {
    isDragging,
    dragProps: {
      onMouseDown: (event: EventPayload) => {
        if (event.button !== undefined && event.button !== 0) return
        dragging.current = true
        setDragging(true)
        options.onStart(event)
      },
      onMouseMove: (event: EventPayload) => {
        if (!dragging.current) {
          if (event.pressedButton !== 0) return
          dragging.current = true
          setDragging(true)
          options.onStart(event)
        }
        options.onMove(event)
      },
      onMouseUp: (event: EventPayload) => {
        if (!dragging.current) return
        dragging.current = false
        setDragging(false)
        options.onEnd(event)
      },
    },
  }
}

export function mergeStyle(...styles: (Style | undefined | null | false)[]): Style {
  const result: Style = {}
  for (const style of styles) {
    if (!style) continue
    Object.assign(result, style)
  }
  return result
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ratioOf(value: number, min: number, max: number) {
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: Intl.LocalesArgument) {
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return String(value)
  }
}

export function nextEnabledIndex(current: number, direction: 1 | -1, count: number, isDisabled: (index: number) => boolean, loop = true) {
  if (count === 0) return -1
  let index = current
  for (let step = 0; step < count; step += 1) {
    index += direction
    if (index < 0) { if (!loop) return current; index = count - 1 }
    if (index >= count) { if (!loop) return current; index = 0 }
    if (!isDisabled(index)) return index
  }
  return current
}

type GpuixBackHost = {
  onBackPressed?: (handler: () => boolean | void) => () => void
}

/**
 * Subscribe to the platform hardware/predictive back event on Android (no-op on desktop).
 * Return `true` to consume the event; returning `false`/`undefined` lets earlier handlers
 * or default backgrounding run.
 */
export function useBackHandler(enabled: boolean, onBack: () => boolean | void) {
  const latest = useRef(onBack)
  latest.current = onBack
  useEffect(() => {
    if (!enabled) return
    const host = Reflect.get(globalThis, 'gpuix') as GpuixBackHost | undefined
    if (typeof host?.onBackPressed !== 'function') return
    return host.onBackPressed(() => latest.current())
  }, [enabled])
}
