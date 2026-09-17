import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { EventPayload } from '@gpuix/native'
import { useTheme, type ThemeTokens } from '../theme-context'
import {
  isArrowKey, keyName, mergeStyle, nextEnabledIndex, useDismiss, useTypeahead,
  type ElementRef, type OpenReason, type Style,
} from './foundations'

export type CollectionItem = {
  value: string
  label?: string
  disabled?: boolean
  onActivate?: (event?: EventPayload) => void
}
export type ItemHandle = { current: CollectionItem }
export type ItemCollection = {
  items: { current: ItemHandle[] }
  register: (item: ItemHandle) => () => void
  version: number
}

export function useItemCollection(): ItemCollection {
  const items = useRef<ItemHandle[]>([])
  const [version, setVersion] = useState(0)
  const register = useCallback((item: ItemHandle) => {
    items.current = [...items.current, item]
    setVersion((value) => value + 1)
    return () => {
      items.current = items.current.filter((entry) => entry !== item)
      setVersion((value) => value + 1)
    }
  }, [])
  return { items, register, version }
}

export function useItemRegistration(collection: ItemCollection, item: CollectionItem): ItemHandle {
  const handle = useRef(item)
  handle.current = item
  useEffect(() => collection.register(handle), [collection])
  return handle
}

export function useListNavigation(options: {
  collection: ItemCollection
  orientation?: 'horizontal' | 'vertical'
  loop?: boolean
  onSelect?: (item: CollectionItem, event?: EventPayload) => void
  enabled?: boolean
}) {
  const [index, setIndex] = useState(-1)
  const typeahead = useTypeahead()
  const orientation = options.orientation ?? 'vertical'
  const loop = options.loop ?? true

  const move = useCallback((direction: 1 | -1) => {
    const list = options.collection.items.current
    setIndex((current) => nextEnabledIndex(current, direction, list.length, (i) => Boolean(list[i]?.current.disabled), loop))
  }, [options.collection, loop])

  const onKeyDown = useCallback((event: EventPayload) => {
    if (options.enabled === false) return
    const list = options.collection.items.current
    if (list.length === 0) return
    if (isArrowKey(event, orientation)) {
      move(keyName(event) === 'down' || keyName(event) === 'right' ? 1 : -1)
      return
    }
    const key = keyName(event)
    if (key === 'home') { setIndex(list.findIndex((item) => !item.current.disabled)); return }
    if (key === 'end') {
      for (let i = list.length - 1; i >= 0; i -= 1) { if (!list[i].current.disabled) { setIndex(i); return } }
      return
    }
    if (key === 'enter' || key === 'space') {
      const item = list[index]
      if (item) options.onSelect?.(item.current, event)
      item?.current.onActivate?.(event)
      return
    }
    const char = event.keyChar ?? event.key
    if (char && char.length === 1 && !event.modifiers?.cmd && !event.modifiers?.ctrl && !event.modifiers?.alt && char !== ' ') {
      const search = typeahead(char)
      const match = list.findIndex((item) => !item.current.disabled && (item.current.label ?? item.current.value).toLowerCase().startsWith(search))
      if (match >= 0) setIndex(match)
    }
  }, [index, move, options, orientation, typeahead])

  return { index, setIndex, move, onKeyDown }
}

export function AnchoredPopup(props: {
  open: boolean
  onEscape?: () => void
  dismissable?: boolean
  onDismiss?: (event: EventPayload) => void
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  gap?: number
  fit?: 'switch' | 'snap'
  snapMargin?: number
  priority?: number
  pointerEvents?: 'auto' | 'none'
  role?: string
  ariaLabel?: string
  testId?: string
  autoFocus?: boolean
  onKeyDown?: (event: EventPayload) => void
  style?: Style
  children: ReactNode
}) {
  const { tokens: C } = useTheme()
  const dismissProps = useDismiss({
    enabled: props.open && props.dismissable !== false,
    onDismiss: (event) => props.onDismiss?.(event),
  })
  if (!props.open) return null
  const anchoredProps: Record<string, unknown> = {
    side: props.side ?? 'bottom',
    align: props.align ?? 'center',
    gap: props.gap ?? 6,
    deferred: true,
    priority: props.priority ?? 2,
    occlude: true,
    ...dismissProps,
    onKeyDown: (event: EventPayload) => {
      if (keyName(event) === 'escape') props.onEscape?.()
      props.onKeyDown?.(event)
    },
  }
  if (props.fit) anchoredProps.fit = props.fit
  if (props.snapMargin !== undefined) anchoredProps.snapMargin = props.snapMargin
  if (props.pointerEvents) anchoredProps.style = { pointerEvents: props.pointerEvents }
  return <anchored {...(anchoredProps as Record<string, never>)}>
    <div
      role={props.role ?? 'presentation'}
      aria-label={props.ariaLabel}
      testId={props.testId}
      tabIndex={0}
      autoFocus={props.autoFocus !== false}
      style={mergeStyle({
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.panelRaised,
        borderWidth: 1,
        borderColor: C.borderStrong,
        borderRadius: 10,
        padding: 6,
        gap: 4,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
        userSelect: 'none',
      }, props.style)}
    >
      {props.children}
    </div>
  </anchored>
}

export function usePopupClose(options: {
  setOpen: (open: boolean, reason: OpenReason, event?: EventPayload) => void
  dismissable?: boolean
}) {
  return useCallback((reason: OpenReason, event?: EventPayload) => {
    options.setOpen(false, reason, event)
  }, [options])
}

export function menuItemStyle(C: ThemeTokens, state: { highlighted?: boolean; selected?: boolean; disabled?: boolean; danger?: boolean }): Style {
  const background = state.highlighted ? C.selected : state.selected ? C.row : undefined
  return {
    minHeight: 36,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 7,
    backgroundColor: background,
    opacity: state.disabled ? 0.4 : 1,
    cursor: state.disabled ? 'default' : 'pointer',
    hover: state.disabled ? undefined : { backgroundColor: state.highlighted ? C.selected : C.panelRaised },
  }
}

export function popupListStyle(C: ThemeTokens): Style {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 200,
    maxHeight: 340,
    overflowY: 'scroll',
    pointerEvents: 'auto',
  }
}
