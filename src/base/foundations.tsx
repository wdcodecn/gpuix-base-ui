import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useGpuix } from '@gpuix/react'
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

export function useHoverState() {
  const [hovered, setHovered] = useState(false)
  return { hovered, hoverProps: { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } }
}

export function useFocusState() {
  const [focused, setFocused] = useState(false)
  return { focused, focusProps: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) } }
}

export function usePress(options: {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  role?: string
  onPress?: (event: EventPayload) => void
  onKeyDown?: (event: EventPayload) => void
}) {
  const disabled = options.disabled ?? false
  const { hovered, hoverProps } = useHoverState()
  const { focused, focusProps } = useFocusState()
  // GPUIX maps a short Android touch tap to the same mouse events used by
  // desktop. Keep a tiny movement gate so a swipe that starts on a trigger
  // cannot become an accidental click when the finger is released.
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const canFocus = !(disabled && !options.focusableWhenDisabled)
  const pressProps = {
    role: options.role ?? 'button',
    tabIndex: canFocus ? 0 : -1,
    'aria-disabled': disabled || undefined,
    onClick: (event: EventPayload) => {
      if (disabled) return
      const moved = gesture.current?.moved ?? false
      gesture.current = null
      if (!moved) options.onPress?.(event)
    },
    onMouseDown: (event: EventPayload) => {
      if (disabled || (event.button !== undefined && event.button !== 0)) return
      gesture.current = { x: event.x ?? 0, y: event.y ?? 0, moved: false }
    },
    onMouseMove: (event: EventPayload) => {
      const active = gesture.current
      if (!active || event.pressedButton !== 0) return
      const dx = (event.x ?? active.x) - active.x
      const dy = (event.y ?? active.y) - active.y
      if (dx * dx + dy * dy > 64) active.moved = true
    },
    onMouseUp: (event: EventPayload) => {
      const active = gesture.current
      if (!active) return
      const dx = (event.x ?? active.x) - active.x
      const dy = (event.y ?? active.y) - active.y
      if (dx * dx + dy * dy > 64) active.moved = true
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
