import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
  type ReactNode, type RefObject,
} from 'react'
import { useGpuix } from '@gpuix/react'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'
import { useTheme, type ThemeTokens } from '../theme-context'
import {
  clamp, formatNumber, mergeStyle, ratioOf, useBounds, useControllableState, usePress, useRovingFocus,
  type ChangeDetails, type Style,
} from './foundations'

type Roving = ReturnType<typeof useRovingFocus>

function Chevron({ open }: { open: boolean }) {
  const { tokens: C } = useTheme()
  return <text style={{ fontFamily: 'Helvetica', fontSize: 15, color: C.muted }}>{open ? '⌃' : '⌄'}</text>
}

type AccordionContextValue = {
  open: string[]
  toggle: (value: string) => void
  disabled: boolean
  keepMounted: boolean
}

const AccordionContext = createContext<AccordionContextValue | null>(null)
const AccordionItemContext = createContext<{ value: string; open: boolean; disabled: boolean } | null>(null)

function AccordionRoot(props: {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[], details: ChangeDetails) => void
  openMultiple?: boolean
  disabled?: boolean
  keepMounted?: boolean
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [open, setOpen] = useControllableState<string[]>({
    value: props.value,
    defaultValue: props.defaultValue ?? [],
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const context = useMemo<AccordionContextValue>(() => ({
    open,
    toggle: (item) => {
      if (props.disabled) return
      if (open.includes(item)) setOpen(open.filter((entry) => entry !== item), 'trigger-press')
      else setOpen(props.openMultiple === false ? [item] : [...open, item], 'trigger-press')
    },
    disabled: props.disabled ?? false,
    keepMounted: props.keepMounted ?? false,
  }), [open, props.disabled, props.openMultiple, props.keepMounted, setOpen])
  return <AccordionContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }, props.style)}>{props.children}</div>
  </AccordionContext.Provider>
}

function AccordionItem(props: { value: string; disabled?: boolean; children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const root = useContext(AccordionContext)
  if (!root) throw new Error('Accordion.Item must be used inside Accordion.Root')
  const disabled = props.disabled ?? root.disabled
  const item = useMemo(() => ({ value: props.value, open: root.open.includes(props.value), disabled }), [props.value, root.open, disabled])
  return <AccordionItemContext.Provider value={item}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden', opacity: disabled ? 0.5 : 1 }, props.style)}>{props.children}</div>
  </AccordionItemContext.Provider>
}

function AccordionHeader(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'row' }, props.style)}>{props.children}</div>
}

function AccordionTrigger(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const root = useContext(AccordionContext)
  const item = useContext(AccordionItemContext)
  if (!root || !item) throw new Error('Accordion.Trigger must be used inside Accordion.Item')
  const { pressProps, hovered, focused } = usePress({
    disabled: item.disabled,
    focusableWhenDisabled: true,
    onPress: () => root.toggle(item.value),
  })
  const ariaProps = { 'aria-expanded': item.open }
  return <div
    {...pressProps}
    {...ariaProps}
    testId={props.testId}
    style={mergeStyle({
      minHeight: 42,
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 13,
      paddingRight: 13,
      backgroundColor: hovered ? C.panelRaised : C.control,
      borderWidth: focused ? 1 : 0,
      borderColor: C.primary,
      cursor: item.disabled ? 'default' : 'pointer',
    }, props.style)}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 700, color: C.text }}>{props.children}</text>
    <Chevron open={item.open} />
  </div>
}

function AccordionPanel(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const item = useContext(AccordionItemContext)
  const root = useContext(AccordionContext)
  if (!item || !root) return null
  if (!item.open && !root.keepMounted) return null
  return <div
    role="region"
    testId={props.testId}
    style={mergeStyle({ padding: 13, backgroundColor: C.panel, display: item.open ? 'flex' : 'none', flexDirection: 'column', gap: 6 }, props.style)}
  >{props.children}</div>
}

export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
})

type CollapsibleContextValue = {
  open: boolean
  setOpen: (open: boolean, reason: 'trigger-press' | 'none') => void
  disabled: boolean
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

function CollapsibleRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  disabled?: boolean
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const context = useMemo(() => ({ open, setOpen, disabled: props.disabled ?? false }), [open, setOpen, props.disabled])
  return <CollapsibleContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6 }, props.style)}>{props.children}</div>
  </CollapsibleContext.Provider>
}

function CollapsibleTrigger(props: { children: ReactNode; style?: Style; testId?: string }) {
  const collapsible = useContext(CollapsibleContext)
  if (!collapsible) throw new Error('Collapsible.Trigger must be used inside Collapsible.Root')
  const { pressProps } = usePress({
    disabled: collapsible.disabled,
    focusableWhenDisabled: true,
    onPress: () => collapsible.setOpen(!collapsible.open, 'trigger-press'),
  })
  const ariaProps = { 'aria-expanded': collapsible.open }
  return <div {...pressProps} {...ariaProps} testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }, props.style)}>{props.children}</div>
}

function CollapsiblePanel(props: { children: ReactNode; keepMounted?: boolean; style?: Style; testId?: string }) {
  const collapsible = useContext(CollapsibleContext)
  if (!collapsible) throw new Error('Collapsible.Panel must be used inside Collapsible.Root')
  if (!collapsible.open && !props.keepMounted) return null
  return <div testId={props.testId} style={mergeStyle({ display: collapsible.open ? 'flex' : 'none', flexDirection: 'column', gap: 6 }, props.style)}>{props.children}</div>
}

export const Collapsible = Object.assign(CollapsibleRoot, { Root: CollapsibleRoot, Trigger: CollapsibleTrigger, Panel: CollapsiblePanel })

export function AvatarRoot(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  return <div aria-label={props.ariaLabel} testId={props.testId} style={mergeStyle({ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20, overflow: 'hidden', backgroundColor: C.iconBg, flexShrink: 0 }, props.style)}>{props.children}</div>
}

export function AvatarImage(props: { src: string; alt?: string; style?: Style }) {
  return <img src={props.src} alt={props.alt ?? ''} objectFit="cover" style={mergeStyle({ width: '100%', height: '100%' }, props.style)} />
}

export function AvatarFallback(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 700, color: C.violet }, props.style)}>{props.children}</text>
}

export const Avatar = Object.assign(AvatarRoot, { Root: AvatarRoot, Image: AvatarImage, Fallback: AvatarFallback })

type ValueContextValue = {
  value: number | null
  min: number
  max: number
  ratio: number
  format: Intl.NumberFormatOptions | undefined
  locale: Intl.LocalesArgument | undefined
  getAriaValueText: ((formatted: string, value: number | null) => string) | undefined
  trackRef: RefObject<Instance | null>
}

const MeterContext = createContext<ValueContextValue | null>(null)
const ProgressContext = createContext<ValueContextValue | null>(null)

function useValueContext(context: typeof MeterContext | typeof ProgressContext, name: string) {
  const value = useContext(context)
  if (!value) throw new Error(`${name} must be used inside its Root`)
  return value
}

function MeterRoot(props: {
  value: number
  min?: number
  max?: number
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  getAriaValueText?: (formatted: string, value: number) => string
  children?: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const min = props.min ?? 0
  const max = props.max ?? 100
  const clamped = clamp(props.value, min, max)
  const formatted = formatNumber(clamped, props.format, props.locale)
  const getAriaValueText = props.getAriaValueText
  const trackRef = useRef<Instance | null>(null)
  const context = useMemo<ValueContextValue>(() => ({
    value: clamped,
    min,
    max,
    ratio: ratioOf(clamped, min, max),
    format: props.format,
    locale: props.locale,
    getAriaValueText: getAriaValueText as ValueContextValue['getAriaValueText'],
    trackRef,
  }), [clamped, min, max, props.format, props.locale, getAriaValueText])
  const ariaValueText = getAriaValueText ? getAriaValueText(formatted, clamped) : `${clamped}%`
  return <MeterContext.Provider value={context}>
    <div role="meter" aria-label={props.ariaLabel} aria-valuetext={ariaValueText} testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }, props.style)}>{props.children}</div>
  </MeterContext.Provider>
}

function MeterLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 700, color: C.text }, props.style)}>{props.children}</text>
}

function MeterTrack(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useValueContext(MeterContext, 'Meter.Track')
  return <div ref={context.trackRef as never} style={mergeStyle({ position: 'relative', height: 8, borderRadius: 4, backgroundColor: C.track, overflow: 'hidden' }, props.style)}>{props.children}</div>
}

function MeterIndicator(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useValueContext(MeterContext, 'Meter.Indicator')
  const getBounds = useBounds(context.trackRef)
  const width = Math.round(context.ratio * (getBounds()?.width ?? 0))
  return <div style={mergeStyle({ position: 'absolute', top: 0, left: 0, bottom: 0, width, borderRadius: 4, backgroundColor: C.violet }, props.style)}>{props.children}</div>
}

function MeterValue(props: { children?: ReactNode | ((formatted: string, value: number) => ReactNode); style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useValueContext(MeterContext, 'Meter.Value')
  const formatted = formatNumber(context.value ?? 0, context.format, context.locale)
  const content = typeof props.children === 'function' ? props.children(formatted, context.value ?? 0) : props.children ?? formatted
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, color: C.muted }, props.style)}>{content}</text>
}

export const Meter = Object.assign(MeterRoot, { Root: MeterRoot, Label: MeterLabel, Track: MeterTrack, Indicator: MeterIndicator, Value: MeterValue })

function ProgressRoot(props: {
  value: number | null
  min?: number
  max?: number
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  getAriaValueText?: (formatted: string | null, value: number | null) => string
  children?: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const min = props.min ?? 0
  const max = props.max ?? 100
  const clamped = props.value === null ? null : clamp(props.value, min, max)
  const formatted = clamped === null ? null : formatNumber(clamped, props.format, props.locale)
  const getAriaValueText = props.getAriaValueText
  const trackRef = useRef<Instance | null>(null)
  const context = useMemo<ValueContextValue>(() => ({
    value: clamped,
    min,
    max,
    ratio: clamped === null ? 0 : ratioOf(clamped, min, max),
    format: props.format,
    locale: props.locale,
    getAriaValueText: getAriaValueText as ValueContextValue['getAriaValueText'],
    trackRef,
  }), [clamped, min, max, props.format, props.locale, getAriaValueText])
  const status = clamped === null ? 'indeterminate' : clamped >= max ? 'complete' : 'progressing'
  const ariaValueText = getAriaValueText ? getAriaValueText(formatted, clamped) : formatted ?? undefined
  const statusProps = { 'data-status': status }
  return <ProgressContext.Provider value={context}>
    <div {...statusProps} role="progressbar" aria-label={props.ariaLabel} aria-valuetext={ariaValueText} testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }, props.style)}>{props.children}</div>
  </ProgressContext.Provider>
}

function ProgressLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 700, color: C.text }, props.style)}>{props.children}</text>
}

function ProgressTrack(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useValueContext(ProgressContext, 'Progress.Track')
  return <div ref={context.trackRef as never} style={mergeStyle({ position: 'relative', height: 8, borderRadius: 4, backgroundColor: C.track, overflow: 'hidden', opacity: context.value === null ? 0.6 : 1 }, props.style)}>{props.children}</div>
}

function ProgressIndicator(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useValueContext(ProgressContext, 'Progress.Indicator')
  const getBounds = useBounds(context.trackRef)
  const indeterminate = context.value === null
  const width = indeterminate ? Math.round((getBounds()?.width ?? 0) * 0.35) : Math.round(context.ratio * (getBounds()?.width ?? 0))
  return <div style={mergeStyle({ position: 'absolute', top: 0, left: 0, bottom: 0, width, borderRadius: 4, backgroundColor: C.violet, opacity: indeterminate ? 0.7 : 1 }, props.style)}>{props.children}</div>
}

function ProgressValue(props: { children?: ReactNode | ((formatted: string | null, value: number | null) => ReactNode); style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useValueContext(ProgressContext, 'Progress.Value')
  const formatted = context.value === null ? null : formatNumber(context.value, context.format, context.locale)
  const content = typeof props.children === 'function' ? props.children(formatted, context.value) : props.children ?? formatted
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, color: C.muted }, props.style)}>{content}</text>
}

export const Progress = Object.assign(ProgressRoot, { Root: ProgressRoot, Label: ProgressLabel, Track: ProgressTrack, Indicator: ProgressIndicator, Value: ProgressValue })

type TabsContextValue = {
  value: string | number | null
  setValue: (value: string | number, reason: 'none' | 'trigger-press' | 'list-navigation') => void
  orientation: 'horizontal' | 'vertical'
  roving: Roving
  refs: RefObject<Map<string | number, RefObject<Instance | null>>>
  setRef: (value: string | number, ref: RefObject<Instance | null>) => void
  listRef: RefObject<Instance | null>
}

const TabsContext = createContext<TabsContextValue | null>(null)
const TabsListContext = createContext<{ activateOnFocus: boolean } | null>(null)

function TabsRoot(props: {
  value?: string | number | null
  defaultValue?: string | number
  onValueChange?: (value: string | number, details: ChangeDetails) => void
  orientation?: 'horizontal' | 'vertical'
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const orientation = props.orientation ?? 'horizontal'
  const [value, setValue] = useControllableState<string | number | null>({
    value: props.value === undefined ? undefined : (props.value as string | number | null),
    defaultValue: props.defaultValue ?? 0,
    onChange: (next, details) => { if (next !== null) props.onValueChange?.(next, details) },
  })
  const roving = useRovingFocus({ orientation, loop: true })
  const refs = useRef<Map<string | number, RefObject<Instance | null>>>(new Map())
  const listRef = useRef<Instance | null>(null)
  const context = useMemo<TabsContextValue>(() => ({
    value,
    setValue: (next, reason) => setValue(next, reason),
    orientation,
    roving,
    refs,
    setRef: (itemValue, ref) => { refs.current.set(itemValue, ref) },
    listRef,
  }), [value, setValue, orientation, roving])
  return <TabsContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: orientation === 'vertical' ? 'row' : 'column', gap: 10, width: '100%' }, props.style)}>{props.children}</div>
  </TabsContext.Provider>
}

function TabsList(props: { children: ReactNode; activateOnFocus?: boolean; loopFocus?: boolean; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tabs.List must be used inside Tabs.Root')
  const listContext = useMemo(() => ({ activateOnFocus: props.activateOnFocus ?? false }), [props.activateOnFocus])
  return <TabsListContext.Provider value={listContext}>
    <div
      role="tablist"
      ref={context.listRef as never}
      testId={props.testId}
      style={mergeStyle({
        position: 'relative',
        display: 'flex',
        flexDirection: context.orientation === 'vertical' ? 'column' : 'row',
        gap: 3,
        padding: 4,
        borderRadius: 9,
        backgroundColor: C.control,
        alignSelf: 'flex-start',
      }, props.style)}
    >{props.children}</div>
  </TabsListContext.Provider>
}

function TabsTab(props: { value: string | number; disabled?: boolean; children: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const context = useContext(TabsContext)
  const listContext = useContext(TabsListContext)
  if (!context) throw new Error('Tabs.Tab must be used inside Tabs.Root')
  const ref = useRef<Instance | null>(null)
  const indexRef = useRef(-1)
  const { register, keyDownFor } = context.roving
  const setRef = context.setRef
  useEffect(() => {
    setRef(props.value, ref)
    indexRef.current = register(ref)
  }, [setRef, props.value, register])
  const active = context.value === props.value
  const { pressProps, hovered, focused } = usePress({
    disabled: props.disabled,
    onPress: () => context.setValue(props.value, 'trigger-press'),
    onKeyDown: (event) => keyDownFor(indexRef.current)(event),
  })
  const onFocus = () => { if (listContext?.activateOnFocus) context.setValue(props.value, 'list-navigation') }
  const ariaProps = { 'aria-selected': active }
  return <div
    {...pressProps}
    {...ariaProps}
    ref={ref as never}
    testId={props.testId}
    aria-label={props.ariaLabel}
    onFocus={onFocus}
    style={mergeStyle({
      minHeight: 32,
      flexGrow: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 7,
      cursor: props.disabled ? 'default' : 'pointer',
      opacity: props.disabled ? 0.45 : 1,
      backgroundColor: active ? C.panel : hovered ? C.panelRaised : undefined,
      borderWidth: focused ? 1 : 0,
      borderColor: C.primary,
    }, props.style)}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? C.text : C.muted }}>{props.children}</text>
  </div>
}

function TabsPanel(props: { value: string | number; keepMounted?: boolean; children: ReactNode; style?: Style; testId?: string }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tabs.Panel must be used inside Tabs.Root')
  const active = context.value === props.value
  if (!active && !props.keepMounted) return null
  return <div role="tabpanel" testId={props.testId} style={mergeStyle({ display: active ? 'flex' : 'none', flexDirection: 'column', gap: 6 }, props.style)}>{props.children}</div>
}

function TabsIndicator(props: { style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useContext(TabsContext)
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null)
  const listRef = context?.listRef ?? { current: null }
  const activeRef = context && context.value !== null ? context.refs.current.get(context.value) : undefined
  const getListBounds = useBounds(listRef)
  const getActiveBounds = useBounds(activeRef ?? { current: null })
  const activeValue = context?.value ?? null
  useEffect(() => {
    const listBounds = getListBounds()
    const activeBounds = getActiveBounds()
    if (!listBounds || !activeBounds) return
    const next = { left: activeBounds.x - listBounds.x, width: activeBounds.width }
    setRect((current) => current && Math.abs(current.left - next.left) < 1 && Math.abs(current.width - next.width) < 1 ? current : next)
  }, [activeValue, getActiveBounds, getListBounds])
  if (!context) throw new Error('Tabs.Indicator must be used inside Tabs.List')
  if (!rect) return null
  return <div style={mergeStyle({ position: 'absolute', bottom: 2, left: rect.left, width: rect.width, height: 2, borderRadius: 1, backgroundColor: C.primary }, props.style)} />
}

export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Trigger: TabsTab,
  Panel: TabsPanel,
  Content: TabsPanel,
  Indicator: TabsIndicator,
})

export function Separator(props: { orientation?: 'horizontal' | 'vertical'; style?: Style }) {
  const { tokens: C } = useTheme()
  const orientation = props.orientation ?? 'horizontal'
  const ariaProps = { 'aria-orientation': orientation }
  return <div {...ariaProps} style={mergeStyle(orientation === 'horizontal' ? { height: 1, width: '100%', backgroundColor: C.border } : { width: 1, alignSelf: 'stretch', backgroundColor: C.border }, props.style)} />
}

type ScrollMetrics = { scrollTop: number; viewportHeight: number; contentHeight: number }

type ScrollAreaContextValue = {
  metrics: ScrollMetrics
  setMetrics: (metrics: ScrollMetrics) => void
  scrollToTop: (top: number) => void
  viewportRef: RefObject<Instance | null>
  contentRef: RefObject<Instance | null>
}

const ScrollAreaContext = createContext<ScrollAreaContextValue | null>(null)

function ScrollAreaRoot(props: { children: ReactNode; overflowEdgeThreshold?: number; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const [metrics, setMetrics] = useState<ScrollMetrics>({ scrollTop: 0, viewportHeight: 0, contentHeight: 0 })
  const viewportRef = useRef<Instance | null>(null)
  const contentRef = useRef<Instance | null>(null)
  const { renderer } = useGpuix()
  const scrollToTop = (top: number) => {
    const id = viewportRef.current?.id
    if (id === undefined || id === null) return
    const max = Math.max(0, metrics.contentHeight - metrics.viewportHeight)
    renderer?.scrollTo?.(id, 0, -clamp(top, 0, max))
  }
  const context = useMemo<ScrollAreaContextValue>(() => ({ metrics, setMetrics, scrollToTop, viewportRef, contentRef }), [metrics])
  return <ScrollAreaContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 10 }, props.style)}>{props.children}</div>
  </ScrollAreaContext.Provider>
}

function ScrollAreaViewport(props: { children: ReactNode; style?: Style; testId?: string }) {
  const context = useContext(ScrollAreaContext)
  if (!context) throw new Error('ScrollArea.Viewport must be used inside ScrollArea.Root')
  const { renderer } = useGpuix()
  const measure = () => {
    const viewportId = context.viewportRef.current?.id
    const contentId = context.contentRef.current?.id
    if (viewportId === undefined || viewportId === null) return
    const offset = renderer?.getScrollOffset?.(viewportId) ?? null
    const viewportBounds = renderer?.getElementBounds?.(viewportId) ?? null
    const contentBounds = contentId === undefined || contentId === null ? null : renderer?.getElementBounds?.(contentId) ?? null
    context.setMetrics({
      scrollTop: offset ? -offset[1] : 0,
      viewportHeight: viewportBounds?.height ?? 0,
      contentHeight: contentBounds?.height ?? 0,
    })
  }
  return <div
    ref={context.viewportRef as never}
    testId={props.testId}
    onScroll={measure}
    onMouseEnter={measure}
    style={mergeStyle({ flexGrow: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }, props.style)}
  >{props.children}</div>
}

function ScrollAreaContent(props: { children: ReactNode; style?: Style }) {
  const context = useContext(ScrollAreaContext)
  if (!context) throw new Error('ScrollArea.Content must be used inside ScrollArea.Root')
  return <div ref={context.contentRef as never} style={mergeStyle({ display: 'flex', flexDirection: 'column' }, props.style)}>{props.children}</div>
}

function ScrollAreaScrollbar(props: { orientation?: 'vertical' | 'horizontal'; keepMounted?: boolean; children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useContext(ScrollAreaContext)
  if (!context) throw new Error('ScrollArea.Scrollbar must be used inside ScrollArea.Root')
  const orientation = props.orientation ?? 'vertical'
  const { contentHeight, viewportHeight } = context.metrics
  const overflow = contentHeight > viewportHeight + 1
  if (!overflow && !props.keepMounted) return null
  const ariaProps = { 'aria-hidden': true }
  return <div
    {...ariaProps}
    style={mergeStyle(orientation === 'vertical'
      ? { position: 'absolute', top: 2, right: 2, bottom: 2, width: 8, display: 'flex', flexDirection: 'column', borderRadius: 4, backgroundColor: C.control }
      : { position: 'absolute', left: 2, right: 2, bottom: 2, height: 8, display: 'flex', flexDirection: 'row', borderRadius: 4, backgroundColor: C.control }, props.style)}
  >{props.children}</div>
}

function ScrollAreaThumb(props: { style?: Style }) {
  const { tokens: C } = useTheme()
  const context = useContext(ScrollAreaContext)
  if (!context) throw new Error('ScrollArea.Thumb must be used inside ScrollArea.Root')
  const { contentHeight, viewportHeight, scrollTop } = context.metrics
  const ratio = contentHeight > 0 ? clamp(viewportHeight / contentHeight, 0.08, 1) : 1
  const thumbHeight = Math.max(24, Math.round(viewportHeight * ratio))
  const travel = Math.max(1, viewportHeight - thumbHeight)
  const maxScroll = Math.max(1, contentHeight - viewportHeight)
  const position = contentHeight > 0 ? clamp(scrollTop / maxScroll, 0, 1) : 0
  const dragRef = useRef<{ startY: number; startTop: number } | null>(null)
  const { renderer } = useGpuix()
  const onMouseDown = (event: EventPayload) => { dragRef.current = { startY: event.y ?? 0, startTop: context.metrics.scrollTop } }
  const onMouseMove = (event: EventPayload) => {
    const drag = dragRef.current
    if (!drag || event.pressedButton !== 0 || viewportHeight <= 0) return
    const delta = (event.y ?? 0) - drag.startY
    context.scrollToTop(drag.startTop + (delta * contentHeight) / viewportHeight)
  }
  const onMouseUp = () => { dragRef.current = null }
  return <div
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    onMouseUp={onMouseUp}
    style={mergeStyle({
      height: thumbHeight,
      marginTop: Math.round(position * travel),
      width: 8,
      minHeight: 24,
      borderRadius: 4,
      backgroundColor: C.borderStrong,
      cursor: 'default',
    }, props.style)}
  />
}

function ScrollAreaCorner(props: { style?: Style }) {
  const ariaProps = { 'aria-hidden': true }
  return <div {...ariaProps} style={mergeStyle({ position: 'absolute', right: 2, bottom: 2, width: 8, height: 8 }, props.style)} />
}

export const ScrollArea = Object.assign(ScrollAreaRoot, {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
  Content: ScrollAreaContent,
  Scrollbar: ScrollAreaScrollbar,
  Thumb: ScrollAreaThumb,
  Corner: ScrollAreaCorner,
})

export type ToastObject = {
  id: string
  title?: ReactNode
  description?: ReactNode
  type?: 'info' | 'success' | 'warning' | 'error'
  timeout?: number
  priority?: 'low' | 'high'
  updateKey?: number
  limited?: boolean
}

export type ToastOptions = Partial<Omit<ToastObject, 'id' | 'limited' | 'updateKey'>> & { id?: string }

export type ToastPromiseOptions<T> = {
  loading: ToastOptions
  success: ToastOptions | ((value: T) => ToastOptions)
  error: ToastOptions | ((error: unknown) => ToastOptions)
}

export type ToastManager = {
  toasts: ToastObject[]
  add: (options: ToastOptions) => string
  update: (id: string, options: ToastOptions | ((toast: ToastObject) => ToastOptions)) => void
  close: (id?: string) => void
  promise: <T>(promise: Promise<T>, options: ToastPromiseOptions<T>) => Promise<T>
  subscribe: (listener: () => void) => () => void
  setDefaultTimeout: (timeout: number | undefined) => void
  setLimit: (limit: number | undefined) => void
}

export function createToastManager(): ToastManager {
  let toasts: ToastObject[] = []
  let defaultTimeout: number | undefined
  let limit: number | undefined
  let counter = 0
  const listeners = new Set<() => void>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const emit = () => { listeners.forEach((listener) => listener()) }
  const clearTimer = (id: string) => {
    const timer = timers.get(id)
    if (timer !== undefined) { clearTimeout(timer); timers.delete(id) }
  }
  const schedule = (toast: ToastObject) => {
    clearTimer(toast.id)
    const timeout = toast.timeout ?? defaultTimeout
    if (timeout === undefined || timeout <= 0) return
    timers.set(toast.id, setTimeout(() => {
      timers.delete(toast.id)
      manager.close(toast.id)
    }, timeout))
  }
  const clampLimit = () => {
    if (limit === undefined) { toasts = toasts.map((toast) => ({ ...toast, limited: false })); return }
    const active = toasts.filter((toast) => toast.priority !== 'high')
    const overflow = new Set(active.slice(0, Math.max(0, active.length - limit)).map((toast) => toast.id))
    toasts = toasts.map((toast) => ({ ...toast, limited: overflow.has(toast.id) }))
  }
  const manager: ToastManager = {
    get toasts() { return toasts },
    add(options) {
      const id = options.id ?? `toast-${++counter}`
      const existing = toasts.find((toast) => toast.id === id)
      if (existing) { manager.update(id, options); return id }
      const toast: ToastObject = { id, priority: 'low', updateKey: 0, ...options }
      toasts = [...toasts, toast]
      clampLimit()
      schedule(toast)
      emit()
      return id
    },
    update(id, options) {
      const apply = (toast: ToastObject) => (typeof options === 'function' ? options(toast) : options)
      toasts = toasts.map((toast) => {
        if (toast.id !== id) return toast
        const next: ToastObject = { ...toast, ...apply(toast), id, updateKey: (toast.updateKey ?? 0) + 1 }
        schedule(next)
        return next
      })
      clampLimit()
      emit()
    },
    close(id) {
      if (id === undefined) {
        toasts.forEach((toast) => clearTimer(toast.id))
        toasts = []
        emit()
        return
      }
      clearTimer(id)
      toasts = toasts.filter((toast) => toast.id !== id)
      clampLimit()
      emit()
    },
    async promise(promise, options) {
      const id = manager.add(options.loading)
      try {
        const value = await promise
        manager.update(id, typeof options.success === 'function' ? options.success(value) : options.success)
        return value
      } catch (error) {
        manager.update(id, typeof options.error === 'function' ? options.error(error) : options.error)
        throw error
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    setDefaultTimeout(timeout) { defaultTimeout = timeout },
    setLimit(nextLimit) { limit = nextLimit; clampLimit() },
  }
  return manager
}

const ToastManagerContext = createContext<ToastManager | null>(null)

export function ToastProvider(props: { children: ReactNode; timeout?: number; limit?: number; toastManager?: ToastManager }) {
  const managerRef = useRef<ToastManager | null>(null)
  if (!managerRef.current) managerRef.current = props.toastManager ?? createToastManager()
  const manager = managerRef.current
  useEffect(() => {
    manager.setDefaultTimeout(props.timeout ?? 5000)
    manager.setLimit(props.limit ?? 3)
  }, [manager, props.timeout, props.limit])
  return <ToastManagerContext.Provider value={manager}>{props.children}</ToastManagerContext.Provider>
}

export function useToastManager() {
  const manager = useContext(ToastManagerContext)
  if (!manager) throw new Error('useToastManager must be used inside Toast.Provider')
  return manager
}

function useToastList() {
  const manager = useToastManager()
  return useSyncExternalStore(manager.subscribe, () => manager.toasts)
}

function ToastPortal(props: { children: ReactNode }) {
  return <>{props.children}</>
}

function ToastViewport(props: { children?: ReactNode; style?: Style; testId?: string }) {
  const toasts = useToastList()
  const expanded = toasts.length > 0
  const ariaProps = { 'aria-live': 'polite' as const, 'aria-atomic': false }
  return <div
    {...ariaProps}
    role="region"
    aria-label="Notifications"
    testId={props.testId}
    data-expanded={expanded}
    style={mergeStyle({ position: 'absolute', right: 22, bottom: 22, width: 330, display: 'flex', flexDirection: 'column', gap: 8 }, props.style)}
  >{props.children}</div>
}

const ToastItemContext = createContext<{ toast: ToastObject; close: () => void } | null>(null)

function ToastRoot(props: { toast: ToastObject; swipeDirection?: 'up' | 'down' | 'left' | 'right' | ('up' | 'down' | 'left' | 'right')[]; children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const manager = useToastManager()
  const tint = props.toast.type === 'success' ? C.green : props.toast.type === 'warning' ? C.orange : props.toast.type === 'error' ? C.red : C.border
  const context = useMemo(() => ({ toast: props.toast, close: () => manager.close(props.toast.id) }), [props.toast, manager])
  return <ToastItemContext.Provider value={context}>
    <div
      testId={props.testId}
      data-type={props.toast.type ?? 'info'}
      data-limited={props.toast.limited}
      style={mergeStyle({
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.panelRaised,
        borderWidth: 1,
        borderColor: tint,
        borderRadius: 10,
        padding: 13,
        gap: 5,
        opacity: props.toast.limited ? 0.35 : 1,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
      }, props.style)}
    >{props.children}</div>
  </ToastItemContext.Provider>
}

function ToastContent(props: { children?: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 4 }, props.style)}>{props.children}</div>
}

function ToastTitle(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const item = useContext(ToastItemContext)
  const content = props.children ?? item?.toast.title
  if (content === undefined || content === null) return null
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 800, color: C.text }, props.style)}>{content}</text>
}

function ToastDescription(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const item = useContext(ToastItemContext)
  const content = props.children ?? item?.toast.description
  if (content === undefined || content === null) return null
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, color: C.muted }, props.style)}>{content}</text>
}

function ToastAction(props: { children: ReactNode; onClick?: () => void; style?: Style; testId?: string }) {
  const item = useContext(ToastItemContext)
  const { pressProps, hovered } = usePress({ onPress: () => { props.onClick?.(); item?.close() } })
  const { tokens: C } = useTheme()
  return <div {...pressProps} testId={props.testId} style={mergeStyle({ alignSelf: 'flex-start', minHeight: 28, display: 'flex', alignItems: 'center', paddingLeft: 10, paddingRight: 10, borderRadius: 6, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: hovered ? C.panelRaised : C.control, cursor: 'pointer' }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 700, color: C.text }}>{props.children}</text>
  </div>
}

function ToastClose(props: { children?: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const item = useContext(ToastItemContext)
  const { pressProps, hovered } = usePress({ onPress: () => item?.close(), role: 'button' })
  return <div {...pressProps} aria-label="Close" testId={props.testId} style={mergeStyle({ position: 'absolute', top: 8, right: 8, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: hovered ? C.control : 'transparent', cursor: 'pointer' }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 14, color: C.muted }}>{props.children ?? '×'}</text>
  </div>
}

function ToastPositioner(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column' }, props.style)}>{props.children}</div>
}

function ToastArrow() {
  return null
}

export const Toast = Object.assign(ToastProvider, {
  Provider: ToastProvider,
  Portal: ToastPortal,
  Viewport: ToastViewport,
  Root: ToastRoot,
  Content: ToastContent,
  Title: ToastTitle,
  Description: ToastDescription,
  Action: ToastAction,
  Close: ToastClose,
  Positioner: ToastPositioner,
  Arrow: ToastArrow,
})

export { useToastManager as useToast }
