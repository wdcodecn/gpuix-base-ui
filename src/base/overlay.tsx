import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { useWindowSize } from '@gpuix/react'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'
import { useTheme } from '../theme-context'
import {
  cloneElement, isValidElement, type ReactElement } from 'react'
import {
  isActivationKey, keyName, mergeStyle, useAnchoredPosition, useControllableState, useDismiss, usePress, useReturnFocus, useRovingFocus,
  type ChangeDetails, type OpenReason, type Style,
} from './foundations'
import { menuItemStyle, popupListStyle, useItemCollection, useItemRegistration, useListNavigation } from './surface'
import { Chevron } from './chevron'
import { mergeProps } from '../merge-props'

type OverlayContextValue = {
  open: boolean
  setOpen: (open: boolean, reason: OpenReason, event?: EventPayload) => void
  triggerRef: React.MutableRefObject<Instance | null>
  popupRef: React.MutableRefObject<Instance | null>
  modal: boolean
  dismissable: boolean
  disabled: boolean
}

function useOverlay(name: string) {
  const context = useContext(OverlayContext)
  if (!context) throw new Error(`${name} must be used inside its Root`)
  return context
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

function OverlayRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  modal?: boolean
  dismissable?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const triggerRef = useRef<Instance | null>(null)
  const popupRef = useRef<Instance | null>(null)
  const context = useMemo<OverlayContextValue>(() => ({
    open,
    setOpen: (next, reason, event) => setOpen(next, reason, event),
    triggerRef,
    popupRef,
    modal: props.modal ?? false,
    dismissable: props.dismissable ?? true,
    disabled: props.disabled ?? false,
  }), [open, setOpen, props.modal, props.dismissable, props.disabled])
  useReturnFocus(open, triggerRef)
  return <OverlayContext.Provider value={context}>{props.children}</OverlayContext.Provider>
}

function TriggerSurface(props: {
  children: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
  active?: boolean
  disabled?: boolean
  onPress?: (event: EventPayload) => void
  onKeyDown?: (event: EventPayload) => void
  onMouseEnter?: (event: EventPayload) => void
  onMouseLeave?: (event: EventPayload) => void
  ref?: React.MutableRefObject<Instance | null>
  autoFocus?: boolean
}) {
  const { tokens: C } = useTheme()
  const { pressProps, hovered, focused } = usePress({
    disabled: props.disabled,
    focusableWhenDisabled: true,
    onPress: props.onPress,
    onKeyDown: props.onKeyDown,
  })
  const ariaProps = { 'aria-expanded': props.active }
  return <div
    {...pressProps}
    {...ariaProps}
    ref={props.ref as never}
    testId={props.testId}
    aria-label={props.ariaLabel}
    autoFocus={props.autoFocus}
    onMouseEnter={props.onMouseEnter}
    onMouseLeave={props.onMouseLeave}
    style={mergeStyle({
      minHeight: 36,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.borderStrong,
      backgroundColor: props.active ? C.selected : C.control,
      cursor: props.disabled ? 'default' : 'pointer',
      opacity: props.disabled ? 0.5 : 1,
      userSelect: 'none',
    }, props.style)}
  >{props.children}</div>
}

function DialogRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  modal?: boolean | 'trap-focus'
  disablePointerDismissal?: boolean
  children: ReactNode
}) {
  return <OverlayRoot
    open={props.open}
    defaultOpen={props.defaultOpen}
    onOpenChange={props.onOpenChange}
    modal={props.modal === undefined ? true : props.modal !== false}
    dismissable={!props.disablePointerDismissal}
  >{props.children}</OverlayRoot>
}

function DialogTrigger(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const dialog = useOverlay('Dialog.Trigger')
  return <TriggerSurface
    ref={dialog.triggerRef}
    testId={props.testId}
    ariaLabel={props.ariaLabel}
    active={dialog.open}
    style={props.style}
    onPress={() => dialog.setOpen(true, 'trigger-press')}
  ><Chevron open={dialog.open} size={11} /></TriggerSurface>
}

function DialogPortal(props: { children: ReactNode }) { return <>{props.children}</> }

function DialogBackdrop(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const dialog = useOverlay('Dialog.Backdrop')
  const { width, height } = useWindowSize()
  if (!dialog.open) return null
  return <anchored position={{ x: 0, y: 0 }} priority={3}>
    <div
      onClick={() => { if (dialog.dismissable) dialog.setOpen(false, 'outside-press') }}
      style={mergeStyle({ width, height, backgroundColor: `${C.canvas}CC` }, props.style)}
    >{props.children}</div>
  </anchored>
}

function DialogViewport(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, props.style)}>{props.children}</div>
}

function DialogPopup(props: {
  children: ReactNode
  style?: Style
  testId?: string
  initialFocus?: boolean
  finalFocus?: boolean
  ariaLabel?: string
  role?: string
}) {
  const { tokens: C } = useTheme()
  const dialog = useOverlay('Dialog.Popup')
  const { width, height } = useWindowSize()
  if (!dialog.open) return null
  return <anchored position={{ x: 0, y: 0 }} priority={4} occlude>
    <div
      onMouseDown={() => { if (dialog.dismissable) dialog.setOpen(false, 'outside-press') }}
      onKeyDown={(event: EventPayload) => { if (keyName(event) === 'escape') dialog.setOpen(false, 'escape-key', event) }}
      style={{ width, height, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        ref={dialog.popupRef as never}
        role={props.role ?? 'dialog'}
        aria-label={props.ariaLabel}
        testId={props.testId}
        tabIndex={0}
        autoFocus={props.initialFocus !== false}
        onMouseDown={(event: EventPayload) => { void event }}
        style={mergeStyle({
          width: 420,
          maxWidth: width - 80,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 20,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.borderStrong,
          backgroundColor: C.panelRaised,
          boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
        }, props.style)}
      >{props.children}</div>
    </div>
  </anchored>
}

function DialogTitle(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 17, fontWeight: 800, color: C.text }, props.style)}>{props.children}</text>
}

function DialogDescription(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, color: C.muted }, props.style)}>{props.children}</text>
}

function DialogClose(props: { children?: ReactNode; style?: Style; testId?: string }) {
  const dialog = useOverlay('Dialog.Close')
  const { tokens: C } = useTheme()
  const { pressProps, hovered } = usePress({ onPress: () => dialog.setOpen(false, 'close-press'), disabled: dialog.disabled })
  return <div {...pressProps} testId={props.testId} style={mergeStyle({ alignSelf: 'flex-start', minHeight: 32, display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.control, cursor: 'pointer' }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 700, color: C.text }}>{props.children ?? '关闭'}</text>
  </div>
}

const dialogParts = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Viewport: DialogViewport,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
}

export const Dialog = Object.assign(DialogRoot, dialogParts)

function AlertDialogRoot(props: Parameters<typeof DialogRoot>[0]) {
  return <DialogRoot {...props} modal disablePointerDismissal />
}

function AlertDialogPopup(props: Parameters<typeof DialogPopup>[0]) {
  return <DialogPopup {...props} role="alertdialog" />
}

export const AlertDialog = Object.assign(AlertDialogRoot, { ...dialogParts, Root: AlertDialogRoot, Popup: AlertDialogPopup })

function DrawerRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  swipeDirection?: 'up' | 'down' | 'left' | 'right'
  snapPoints?: (number | string)[]
  defaultSnapPoint?: number | null
  snapPoint?: number | null
  onSnapPointChange?: (snapPoint: number | null, details: ChangeDetails) => void
  modal?: boolean | 'trap-focus'
  disablePointerDismissal?: boolean
  children: ReactNode
}) {
  return <DrawerContext.Provider value={{ swipeDirection: props.swipeDirection ?? 'down' }}>
    <OverlayRoot
      open={props.open}
      defaultOpen={props.defaultOpen}
      onOpenChange={props.onOpenChange}
      modal={props.modal === undefined ? true : props.modal !== false}
      dismissable={!props.disablePointerDismissal}
    >{props.children}</OverlayRoot>
  </DrawerContext.Provider>
}

const DrawerContext = createContext<{ swipeDirection: 'up' | 'down' | 'left' | 'right' }>({ swipeDirection: 'down' })

function DrawerPopup(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const drawer = useOverlay('Drawer.Popup')
  const { swipeDirection } = useContext(DrawerContext)
  const { width, height } = useWindowSize()
  if (!drawer.open) return null
  const isBottom = swipeDirection === 'down'
  const isTop = swipeDirection === 'up'
  const isLeft = swipeDirection === 'right'
  const isRight = swipeDirection === 'left'
  return <anchored position={{ x: 0, y: 0 }} priority={4} occlude>
    <div
      onMouseDown={() => { if (drawer.dismissable) drawer.setOpen(false, 'outside-press') }}
      onKeyDown={(event: EventPayload) => { if (keyName(event) === 'escape') drawer.setOpen(false, 'escape-key', event) }}
      style={{ width, height, display: 'flex', flexDirection: 'row', alignItems: isTop ? 'flex-start' : isBottom ? 'flex-end' : 'center', justifyContent: isLeft ? 'flex-start' : isRight ? 'flex-end' : 'center' }}
    >
      <div
        ref={drawer.popupRef as never}
        role="dialog"
        testId={props.testId}
        tabIndex={0}
        autoFocus
        onMouseDown={(event: EventPayload) => { void event }}
        style={mergeStyle({
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 20,
          backgroundColor: C.panelRaised,
          borderWidth: 1,
          borderColor: C.borderStrong,
          borderTopLeftRadius: isBottom || isRight ? 14 : 0,
          borderTopRightRadius: isBottom || isLeft ? 14 : 0,
          borderBottomLeftRadius: isTop || isRight ? 14 : 0,
          borderBottomRightRadius: isTop || isLeft ? 14 : 0,
          width: isBottom || isTop ? width : Math.min(420, width * 0.4),
          height: isBottom || isTop ? undefined : height,
          boxShadow: { offsetX: 0, offsetY: isTop ? 10 : -10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
        }, props.style)}
      >{props.children}</div>
    </div>
  </anchored>
}

function DrawerSwipeArea(props: { children?: ReactNode; style?: Style; disabled?: boolean }) {
  const { tokens: C } = useTheme()
  const drawer = useOverlay('Drawer.SwipeArea')
  const { swipeDirection } = useContext(DrawerContext)
  const start = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState(0)
  const horizontal = swipeDirection === 'left' || swipeDirection === 'right'
  if (props.disabled) return null
  return <div
    onMouseDown={(event: EventPayload) => {
      if (event.button !== undefined && event.button !== 0) return
      start.current = { x: event.x ?? 0, y: event.y ?? 0 }
      setOffset(0)
    }}
    onMouseMove={(event: EventPayload) => {
      if (!start.current || event.pressedButton !== 0) return
      const delta = horizontal ? (event.x ?? 0) - start.current.x : (event.y ?? 0) - start.current.y
      const signed = swipeDirection === 'down' || swipeDirection === 'right' ? delta : -delta
      setOffset(Math.max(0, signed))
    }}
    onMouseUp={() => {
      if (!start.current) return
      start.current = null
      const threshold = 80
      const direction = offset > threshold
      setOffset(0)
      if (direction) drawer.setOpen(false, 'outside-press')
    }}
    style={mergeStyle({ display: 'flex', justifyContent: 'center', paddingTop: 4, paddingBottom: 8, marginTop: horizontal ? 0 : offset, marginLeft: horizontal ? offset : 0, cursor: horizontal ? 'ew-resize' : 'ns-resize' }, props.style)}
  >
    <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, pointerEvents: 'none' }} />
    {props.children}
  </div>
}

function DrawerContent(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 10 }, props.style)}>{props.children}</div>
}

function DrawerVirtualKeyboardProvider(props: { children: ReactNode }) { return <>{props.children}</> }
function DrawerProvider(props: { children: ReactNode }) { return <>{props.children}</> }
function DrawerIndentBackground(props: { children?: ReactNode }) { return <>{props.children}</> }
function DrawerIndent(props: { children?: ReactNode }) { return <>{props.children}</> }

export const Drawer = Object.assign(DrawerRoot, {
  Root: DrawerRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Viewport: DialogViewport,
  Popup: DrawerPopup,
  Content: DrawerContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
  SwipeArea: DrawerSwipeArea,
  VirtualKeyboardProvider: DrawerVirtualKeyboardProvider,
  Provider: DrawerProvider,
  IndentBackground: DrawerIndentBackground,
  Indent: DrawerIndent,
})

type PositionerValue = { side: 'top' | 'right' | 'bottom' | 'left'; align: 'start' | 'center' | 'end'; gap: number }

const PositionerContext = createContext<PositionerValue>({ side: 'bottom', align: 'center', gap: 6 })

function PopoverPositioner(props: { side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end'; sideOffset?: number; alignOffset?: number; gap?: number; children: ReactNode }) {
  const context = useMemo<PositionerValue>(() => ({
    side: props.side ?? 'bottom',
    align: props.align ?? 'center',
    gap: props.gap ?? props.sideOffset ?? 6,
  }), [props.side, props.align, props.gap, props.sideOffset])
  return <PositionerContext.Provider value={context}>{props.children}</PositionerContext.Provider>
}

function PopoverPopup(props: { children: ReactNode; style?: Style; testId?: string; className?: string }) {
  const { tokens: C } = useTheme()
  const popover = useOverlay('Popover.Popup')
  const positioner = useContext(PositionerContext)
  const position = useAnchoredPosition(popover.triggerRef, popover.open, positioner.side, positioner.align)
  const dismissProps = useDismiss({ enabled: popover.open && popover.dismissable, onDismiss: (event) => popover.setOpen(false, 'outside-press', event) })
  if (!popover.open) return null
  return <anchored
    position={position}
    side={positioner.side}
    align={positioner.align}
    gap={positioner.gap}
    deferred
    priority={3}
    occlude
    {...dismissProps}
    onKeyDown={(event: EventPayload) => { if (keyName(event) === 'escape') popover.setOpen(false, 'escape-key', event) }}
  >
    <div
      ref={popover.popupRef as never}
      role="dialog"
      testId={props.testId}
      tabIndex={0}
      autoFocus
      style={mergeStyle({
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 240,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.panelRaised,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
      }, props.style)}
    >{props.children}</div>
  </anchored>
}

function PopoverArrow() {
  const { tokens: C } = useTheme()
  return <div style={{ position: 'absolute', top: -5, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
    <div style={{ width: 10, height: 10, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 2 }} />
  </div>
}

function PopoverViewport(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6 }, props.style)}>{props.children}</div>
}

type PopoverRootProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  modal?: boolean | 'trap-focus'
  children: ReactNode
}

function PopoverRoot(props: PopoverRootProps) {
  return <OverlayRoot open={props.open} defaultOpen={props.defaultOpen} onOpenChange={props.onOpenChange} modal={false} dismissable>{props.children}</OverlayRoot>
}

function PopoverTrigger(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string; openOnHover?: boolean; delay?: number; closeDelay?: number }) {
  const popover = useOverlay('Popover.Trigger')
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null }
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }
  useEffect(() => clear, [])
  return <TriggerSurface
    ref={popover.triggerRef}
    testId={props.testId}
    ariaLabel={props.ariaLabel}
    active={popover.open}
    style={props.style}
    onPress={() => popover.setOpen(!popover.open, 'trigger-press')}
    onMouseEnter={() => {
      if (!props.openOnHover) return
      clear()
      openTimer.current = setTimeout(() => popover.setOpen(true, 'trigger-hover'), props.delay ?? 300)
    }}
    onMouseLeave={() => {
      if (!props.openOnHover) return
      clear()
      closeTimer.current = setTimeout(() => popover.setOpen(false, 'trigger-hover'), props.closeDelay ?? 0)
    }}
  >{props.children}</TriggerSurface>
}

const popoverParts = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Positioner: PopoverPositioner,
  Popup: PopoverPopup,
  Arrow: PopoverArrow,
  Viewport: PopoverViewport,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
}

export const Popover = Object.assign(PopoverRoot, popoverParts)

function PreviewCardTrigger(props: { children: ReactNode; style?: Style; testId?: string; delay?: number; closeDelay?: number }) {
  const preview = useOverlay('PreviewCard.Trigger')
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null }
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }
  useEffect(() => clear, [])
  return <TriggerSurface
    ref={preview.triggerRef}
    testId={props.testId}
    active={preview.open}
    style={props.style}
    onPress={() => undefined}
    onMouseEnter={() => {
      clear()
      openTimer.current = setTimeout(() => preview.setOpen(true, 'trigger-hover'), props.delay ?? 600)
    }}
    onMouseLeave={() => {
      clear()
      closeTimer.current = setTimeout(() => preview.setOpen(false, 'trigger-hover'), props.closeDelay ?? 300)
    }}
  >{props.children}</TriggerSurface>
}

function PreviewCardPopup(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const preview = useOverlay('PreviewCard.Popup')
  const positioner = useContext(PositionerContext)
  const position = useAnchoredPosition(preview.triggerRef, preview.open, positioner.side, positioner.align)
  const dismissProps = useDismiss({ enabled: preview.open && preview.dismissable, onDismiss: (event) => preview.setOpen(false, 'outside-press', event) })
  if (!preview.open) return null
  return <anchored
    position={position}
    side={positioner.side}
    align={positioner.align}
    gap={positioner.gap}
    deferred
    priority={3}
    occlude
    {...dismissProps}
    onMouseEnter={() => preview.setOpen(true, 'trigger-hover')}
    onKeyDown={(event: EventPayload) => { if (keyName(event) === 'escape') preview.setOpen(false, 'escape-key', event) }}
  >
    <div
      ref={preview.popupRef as never}
      testId={props.testId}
      tabIndex={0}
      autoFocus
      onMouseLeave={() => preview.setOpen(false, 'trigger-hover')}
      style={mergeStyle({
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 240,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.panelRaised,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
      }, props.style)}
    >{props.children}</div>
  </anchored>
}

// Do not Object.assign onto PopoverRoot here. PopoverRoot is also the function
// carrying Popover's static parts; mutating it made `Popover.Popup` silently
// become `PreviewCard.Popup`, so clicking a normal Popover rendered the wrong
// component and crashed the gallery. A distinct wrapper keeps both families'
// compound namespaces independent.
function PreviewCardRoot(props: PopoverRootProps) {
  return <PopoverRoot {...props} />
}

export const PreviewCard = Object.assign(PreviewCardRoot, {
  Root: PreviewCardRoot,
  Trigger: PreviewCardTrigger,
  Portal: DialogPortal,
  Positioner: PopoverPositioner,
  Popup: PreviewCardPopup,
  Arrow: PopoverArrow,
})

type TooltipContextValue = {
  open: boolean
  setOpen: (open: boolean, reason: OpenReason, event?: EventPayload) => void
  disabled: boolean
  delay: number
  closeDelay: number
  triggerRef: React.MutableRefObject<Instance | null>
}

const TooltipContext = createContext<TooltipContextValue | null>(null)
const TooltipProviderContext = createContext<{ delay?: number; closeDelay?: number; timeout: number } | null>(null)

function TooltipProvider(props: { delay?: number; closeDelay?: number; timeout?: number; children: ReactNode }) {
  const context = useMemo(() => ({ delay: props.delay, closeDelay: props.closeDelay, timeout: props.timeout ?? 400 }), [props.delay, props.closeDelay, props.timeout])
  return <TooltipProviderContext.Provider value={context}>{props.children}</TooltipProviderContext.Provider>
}

function TooltipRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  disabled?: boolean
  disableHoverablePopup?: boolean
  trackCursorAxis?: 'none' | 'x' | 'y' | 'both'
  children: ReactNode
}) {
  const provider = useContext(TooltipProviderContext)
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const triggerRef = useRef<Instance | null>(null)
  const context = useMemo<TooltipContextValue>(() => ({
    open, setOpen: (next, reason, event) => setOpen(next, reason, event), disabled: props.disabled ?? false,
    delay: provider?.delay ?? 600, closeDelay: provider?.closeDelay ?? 0, triggerRef,
  }), [open, setOpen, props.disabled, provider])
  return <TooltipContext.Provider value={context}>{props.children}</TooltipContext.Provider>
}

function TooltipTrigger(props: { children: ReactNode; style?: Style; testId?: string; delay?: number; closeDelay?: number; closeOnClick?: boolean }) {
  const tooltip = useContext(TooltipContext)
  if (!tooltip) throw new Error('Tooltip.Trigger must be used inside Tooltip.Root')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clear, [])
  const toggle = (event: EventPayload) => {
    if (tooltip.disabled) return
    if (tooltip.open && props.closeOnClick !== false) tooltip.setOpen(false, 'trigger-press', event)
    else tooltip.setOpen(true, 'trigger-press', event)
  }
  const { pressProps } = usePress({
    disabled: tooltip.disabled,
    onPress: toggle,
    onKeyDown: (event) => { if (keyName(event) === 'escape') tooltip.setOpen(false, 'escape-key', event) },
  })
  const triggerProps = {
    ...pressProps,
    ref: tooltip.triggerRef as never,
    testId: props.testId,
    onMouseEnter: () => { if (tooltip.disabled) return; clear(); timer.current = setTimeout(() => tooltip.setOpen(true, 'trigger-hover'), props.delay ?? tooltip.delay) },
    onMouseLeave: () => { clear(); if (tooltip.open) timer.current = setTimeout(() => tooltip.setOpen(false, 'trigger-hover'), props.closeDelay ?? tooltip.closeDelay) },
    style: mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center' }, props.style),
  }
  // A Button (or another interactive child) consumes the native click at its
  // own element. Clone it with the trigger handlers so Tooltip works for both
  // composed controls and plain text children, instead of relying on bubbling
  // through a wrapper that GPUI does not guarantee.
  const child = props.children as ReactElement | undefined
  if (isValidElement(child)) return cloneElement(child, mergeProps(child.props as Record<string, unknown>, triggerProps as Record<string, unknown>) as never)
  return <div {...triggerProps}>{props.children}</div>
}

function TooltipPopup(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const tooltip = useContext(TooltipContext)
  if (!tooltip) throw new Error('Tooltip.Popup must be used inside Tooltip.Root')
  if (!tooltip.open) return null
  const position = useAnchoredPosition(tooltip.triggerRef, tooltip.open, 'top', 'center')
  return <anchored position={position} side="top" align="center" gap={7} deferred priority={3}>
    <div
      role="tooltip"
      testId={props.testId}
      onMouseEnter={() => tooltip.setOpen(true, 'trigger-hover')}
      onMouseLeave={() => tooltip.setOpen(false, 'trigger-hover')}
      style={mergeStyle({
        maxWidth: 280,
        padding: 8,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.panelRaised,
        boxShadow: { offsetX: 0, offsetY: 6, blurRadius: 15, spreadRadius: 0, color: C.shadow },
      }, props.style)}
    >{props.children}</div>
  </anchored>
}

export const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Portal: DialogPortal,
  Positioner: PopoverPositioner,
  Popup: TooltipPopup,
  Arrow: PopoverArrow,
})

type MenuItemData = { value: string; label: string; disabled?: boolean; onSelect?: (event?: EventPayload) => void }

type MenuContextValue = {
  open: boolean
  setOpen: (open: boolean, reason: OpenReason, event?: EventPayload) => void
  disabled: boolean
  collection: ReturnType<typeof useItemCollection>
  triggerRef: React.MutableRefObject<Instance | null>
  nested: boolean
}

const MenuContext = createContext<MenuContextValue | null>(null)
const MenuPopupContext = createContext<MenuContextValue | null>(null)

function useMenu(name: string) {
  const context = useContext(MenuPopupContext) ?? useContext(MenuContext)
  if (!context) throw new Error(`${name} must be used inside Menu.Root`)
  return context
}

function MenuRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  disabled?: boolean
  loopFocus?: boolean
  modal?: boolean
  highlightItemOnHover?: boolean
  closeParentOnEsc?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const collection = useItemCollection()
  const triggerRef = useRef<Instance | null>(null)
  const context = useMemo<MenuContextValue>(() => ({
    open, setOpen: (next, reason, event) => setOpen(next, reason, event),
    disabled: props.disabled ?? false, collection, triggerRef, nested: false,
  }), [open, setOpen, props.disabled, collection])
  useReturnFocus(open, triggerRef)
  return <MenuContext.Provider value={context}>{props.children}</MenuContext.Provider>
}

const MenubarContext = createContext<{ register: (ref: React.MutableRefObject<Instance | null>) => number; keyDownFor: (index: number) => (event: EventPayload) => void } | null>(null)

function MenuTrigger(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string; disabled?: boolean; openOnHover?: boolean; delay?: number; closeDelay?: number; payload?: unknown }) {
  const { tokens: C } = useTheme()
  const menu = useContext(MenuContext)
  if (!menu) throw new Error('Menu.Trigger must be used inside Menu.Root')
  const menubar = useContext(MenubarContext)
  const indexRef = useRef(-1)
  const register = menubar?.register
  useEffect(() => { if (register) indexRef.current = register(menu.triggerRef) }, [register, menu.triggerRef])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return <TriggerSurface
    ref={menu.triggerRef}
    testId={props.testId}
    ariaLabel={props.ariaLabel}
    active={menu.open}
    disabled={props.disabled ?? menu.disabled}
    style={props.style}
    onPress={() => menu.setOpen(!menu.open, 'trigger-press')}
    onKeyDown={(event) => {
      const key = keyName(event)
      if (menubar && (key === 'left' || key === 'right')) { menubar.keyDownFor(indexRef.current)(event); return }
      if (key === 'down' || key === 'up') menu.setOpen(true, 'list-navigation', event)
      if (key === 'escape') menu.setOpen(false, 'escape-key', event)
    }}
    onMouseEnter={() => {
      if (!props.openOnHover) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => menu.setOpen(true, 'trigger-hover'), props.delay ?? 100)
    }}
    onMouseLeave={() => {
      if (!props.openOnHover) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => menu.setOpen(false, 'trigger-hover'), props.closeDelay ?? 0)
    }}
  >
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.children}</text>
    <Chevron open={menu.open} size={11} />
  </TriggerSurface>
}

function MenuSeparator() {
  const { tokens: C } = useTheme()
  return <div role="separator" style={{ height: 1, marginTop: 3, marginBottom: 3, backgroundColor: C.border }} />
}

function MenuGroup(props: { children: ReactNode; style?: Style }) {
  return <div role="group" style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{props.children}</div>
}

function MenuGroupLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ paddingLeft: 8, paddingTop: 6, paddingBottom: 2, fontFamily: 'Helvetica', fontSize: 11, fontWeight: 700, color: C.faint }, props.style)}>{props.children}</text>
}

function MenuItem(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; label?: string; closeOnClick?: boolean; style?: Style; testId?: string; value?: string }) {
  const { tokens: C } = useTheme()
  const menu = useMenu('Menu.Item')
  const [hovered, setHovered] = useState(false)
  const label = props.label ?? (typeof props.children === 'string' ? props.children : props.value ?? '')
  const menuRef = useRef(menu)
  menuRef.current = menu
  useItemRegistration(menu.collection, {
    value: props.value ?? label,
    label,
    disabled: props.disabled,
    onActivate: (event) => {
      props.onClick?.()
      if (props.closeOnClick !== false) menuRef.current.setOpen(false, 'item-press', event)
    },
  })
  const { pressProps } = usePress({
    disabled: props.disabled ?? menu.disabled,
    onPress: (event) => {
      props.onClick?.()
      if (props.closeOnClick !== false) menu.setOpen(false, 'item-press', event)
    },
  })
  return <div
    {...pressProps}
    role="menuitem"
    testId={props.testId}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={mergeStyle(menuItemStyle(C, { highlighted: hovered, disabled: props.disabled }), props.style)}
  >
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.children}</text>
  </div>
}

function MenuLinkItem(props: { children: ReactNode; href?: string; label?: string; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  return <MenuItem label={props.label} closeOnClick={false} style={props.style} testId={props.testId}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
      <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.children}</text>
      {props.href ? <text style={{ color: C.faint }}>↗</text> : null}
    </div>
  </MenuItem>
}

function MenuCheckboxItem(props: { children: ReactNode; checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean, details: ChangeDetails) => void; disabled?: boolean; closeOnClick?: boolean; label?: string; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const [checked, setChecked] = useControllableState<boolean>({
    value: props.checked,
    defaultValue: props.defaultChecked ?? false,
    onChange: (next, details) => props.onCheckedChange?.(next, details),
  })
  const menu = useMenu('Menu.CheckboxItem')
  const [hovered, setHovered] = useState(false)
  const label = props.label ?? (typeof props.children === 'string' ? props.children : '')
  const menuRef = useRef(menu)
  menuRef.current = menu
  const checkedRef = useRef(checked)
  checkedRef.current = checked
  useItemRegistration(menu.collection, {
    value: label,
    label,
    disabled: props.disabled,
    onActivate: (event) => {
      setChecked(!checkedRef.current, 'item-press', event)
      if (props.closeOnClick) menuRef.current.setOpen(false, 'item-press', event)
    },
  })
  const { pressProps } = usePress({
    disabled: props.disabled ?? menu.disabled,
    onPress: (event) => {
      setChecked(!checked, 'item-press', event)
      if (props.closeOnClick) menu.setOpen(false, 'item-press', event)
    },
  })
  return <div
    {...pressProps}
    role="menuitemcheckbox"
    testId={props.testId}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={mergeStyle(menuItemStyle(C, { highlighted: hovered, disabled: props.disabled }), props.style)}
  >
    <text style={{ width: 18, fontFamily: 'Helvetica', fontSize: 13, color: C.primary }}>{checked ? '✓' : ''}</text>
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.children}</text>
  </div>
}

function MenuRadioGroup(props: { children: ReactNode; value?: string; defaultValue?: string; onValueChange?: (value: string, details: ChangeDetails) => void; style?: Style }) {
  const [value, setValue] = useControllableState<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const context = useMemo(() => ({ value, setValue }), [value, setValue])
  return <MenuRadioGroupContext.Provider value={context}>
    <div role="group" style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{props.children}</div>
  </MenuRadioGroupContext.Provider>
}

const MenuRadioGroupContext = createContext<{ value: string; setValue: (value: string, reason: OpenReason, event?: EventPayload) => void } | null>(null)

function MenuRadioItem(props: { children: ReactNode; value: string; disabled?: boolean; closeOnClick?: boolean; label?: string; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const menu = useMenu('Menu.RadioItem')
  const group = useContext(MenuRadioGroupContext)
  const [hovered, setHovered] = useState(false)
  const label = props.label ?? (typeof props.children === 'string' ? props.children : props.value)
  const menuRef = useRef(menu)
  menuRef.current = menu
  useItemRegistration(menu.collection, {
    value: props.value,
    label,
    disabled: props.disabled,
    onActivate: (event) => {
      group?.setValue(props.value, 'item-press', event)
      if (props.closeOnClick) menuRef.current.setOpen(false, 'item-press', event)
    },
  })
  const { pressProps } = usePress({
    disabled: props.disabled ?? menu.disabled,
    onPress: (event) => {
      group?.setValue(props.value, 'item-press', event)
      if (props.closeOnClick) menu.setOpen(false, 'item-press', event)
    },
  })
  const selected = group?.value === props.value
  return <div
    {...pressProps}
    role="menuitemradio"
    testId={props.testId}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={mergeStyle(menuItemStyle(C, { highlighted: hovered, disabled: props.disabled, selected }), props.style)}
  >
    <text style={{ width: 18, fontFamily: 'Helvetica', fontSize: 13, color: C.primary }}>{selected ? '●' : ''}</text>
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.children}</text>
  </div>
}

function MenuRadioItemIndicator(props: { children?: ReactNode }) { return <>{props.children ?? '●'}</> }
function MenuCheckboxItemIndicator(props: { children?: ReactNode }) { return <>{props.children ?? '✓'}</> }

const SubmenuContext = createContext<MenuContextValue | null>(null)

function MenuSubmenuRoot(props: { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean, details: ChangeDetails) => void; disabled?: boolean; children: ReactNode }) {
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const parent = useContext(MenuPopupContext)
  const collection = useItemCollection()
  const triggerRef = useRef<Instance | null>(null)
  const context = useMemo<MenuContextValue>(() => ({
    open, setOpen: (next, reason, event) => setOpen(next, reason, event),
    disabled: props.disabled ?? parent?.disabled ?? false, collection, triggerRef, nested: true,
  }), [open, setOpen, props.disabled, parent, collection])
  return <SubmenuContext.Provider value={context}>
    <MenuPopupContext.Provider value={context}>{props.children}</MenuPopupContext.Provider>
  </SubmenuContext.Provider>
}

function MenuSubmenuTrigger(props: { children: ReactNode; disabled?: boolean; label?: string; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const submenu = useContext(SubmenuContext)
  if (!submenu) throw new Error('Menu.SubmenuTrigger must be used inside Menu.SubmenuRoot')
  const [hovered, setHovered] = useState(false)
  const label = props.label ?? (typeof props.children === 'string' ? props.children : '')
  const submenuRef = useRef(submenu)
  submenuRef.current = submenu
  useItemRegistration(submenu.collection, {
    value: label,
    label,
    disabled: props.disabled,
    onActivate: (event) => submenuRef.current.setOpen(true, 'list-navigation', event),
  })
  const { pressProps } = usePress({
    disabled: props.disabled ?? submenu.disabled,
    onPress: () => submenu.setOpen(!submenu.open, 'trigger-press'),
    onKeyDown: (event) => {
      if (keyName(event) === 'right') submenu.setOpen(true, 'list-navigation', event)
      if (keyName(event) === 'left') submenu.setOpen(false, 'list-navigation', event)
    },
  })
  return <div
    {...pressProps}
    role="menuitem"
    testId={props.testId}
    onMouseEnter={() => { setHovered(true); submenu.setOpen(true, 'trigger-hover') }}
    onMouseLeave={() => setHovered(false)}
    style={mergeStyle(menuItemStyle(C, { highlighted: hovered, disabled: props.disabled }), props.style)}
  >
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.children}</text>
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.muted }}>›</text>
  </div>
}

function MenuPopup(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const menu = useContext(MenuPopupContext) ?? useContext(MenuContext)
  if (!menu) throw new Error('Menu.Popup must be used inside Menu.Root')
  const navigation = useListNavigation({
    collection: menu.collection,
    onSelect: (item) => {
      const data = item as MenuItemData
      data.onSelect?.()
    },
  })
  const side = menu.nested ? 'right' : 'bottom'
  const position = useAnchoredPosition(menu.triggerRef, menu.open, side, 'start')
  const dismissProps = useDismiss({ enabled: menu.open, onDismiss: (event) => menu.setOpen(false, 'outside-press', event) })
  if (!menu.open || menu.disabled) return null
  return <anchored
    position={position}
    side={side}
    align="start"
    gap={6}
    fit="snap"
    snapMargin={8}
    deferred
    priority={3}
    occlude
    {...dismissProps}
    onKeyDown={(event: EventPayload) => navigation.onKeyDown(event)}
  >
    <div
      role="menu"
      aria-label={props.ariaLabel}
      testId={props.testId}
      tabIndex={0}
      autoFocus
      style={mergeStyle(popupListStyle(C), {
        minWidth: 200,
        padding: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.panelRaised,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
        userSelect: 'none',
      }, props.style)}
    >{props.children}</div>
  </anchored>
}

function MenuPortal(props: { children: ReactNode }) { return <>{props.children}</> }
function MenuViewport(props: { children: ReactNode; style?: Style }) { return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{props.children}</div> }
function MenuArrow() { return null }

export const Menu = Object.assign(MenuRoot, {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Portal: MenuPortal,
  Backdrop: (props: { children?: ReactNode }) => <>{props.children}</>,
  Positioner: PopoverPositioner,
  Popup: MenuPopup,
  Viewport: MenuViewport,
  Arrow: MenuArrow,
  Item: MenuItem,
  LinkItem: MenuLinkItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  RadioItemIndicator: MenuRadioItemIndicator,
  CheckboxItem: MenuCheckboxItem,
  CheckboxItemIndicator: MenuCheckboxItemIndicator,
  SubmenuRoot: MenuSubmenuRoot,
  SubmenuTrigger: MenuSubmenuTrigger,
})

function ContextMenuRoot(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  disabled?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const collection = useItemCollection()
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<Instance | null>(null)
  const context = useMemo<MenuContextValue>(() => ({
    open, setOpen: (next, reason, event) => setOpen(next, reason, event),
    disabled: props.disabled ?? false, collection, triggerRef, nested: false,
  }), [open, setOpen, props.disabled, collection])
  const contextValue = { context, position, setPosition }
  // ContextMenu.Item reuses the same collection/keyboard implementation as
  // Menu.Item. Provide the menu context here as well; without this bridge a
  // right-click opened the popup and then crashed while rendering its items
  // with "Menu.Item must be used inside Menu.Root".
  return <ContextMenuContext.Provider value={contextValue}>
    <MenuContext.Provider value={context}>{props.children}</MenuContext.Provider>
  </ContextMenuContext.Provider>
}

const ContextMenuContext = createContext<{
  context: MenuContextValue
  position: { x: number; y: number }
  setPosition: (position: { x: number; y: number }) => void
} | null>(null)

function ContextMenuTrigger(props: { children: ReactNode; style?: Style; testId?: string }) {
  const value = useContext(ContextMenuContext)
  if (!value) throw new Error('ContextMenu.Trigger must be used inside ContextMenu.Root')
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }
  useEffect(() => clearLongPress, [])
  const openAt = (event: EventPayload) => {
    value.setPosition({ x: event.x ?? 0, y: event.y ?? 0 })
    value.context.setOpen(true, 'trigger-press', event)
  }
  const onContext = (event: EventPayload) => {
    if (event.button !== 2 && !event.isRightClick) return
    clearLongPress()
    openAt(event)
  }
  const onMouseDown = (event: EventPayload) => {
    clearLongPress()
    if (event.button === 2 || event.isRightClick) { onContext(event); return }
    // Android touch is delivered as a primary mouse gesture by the current
    // native bridge. Treat a held primary press as the context-menu gesture,
    // while cancelling on release/move so ordinary taps remain ordinary taps.
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      openAt(event)
    }, 500)
  }
  const handlers = {
    testId: props.testId,
    onMouseDown,
    onMouseUp: clearLongPress,
    onMouseMove: clearLongPress,
    onAuxClick: onContext,
    onClick: (event: EventPayload) => { if (event.isRightClick || event.button === 2) onContext(event) },
    style: mergeStyle({ display: 'flex', flexDirection: 'column' }, props.style),
  }
  const child = props.children as ReactElement | undefined
  if (isValidElement(child) && isValidElement(child)) {
    return cloneElement(child, mergeProps(child.props as Record<string, unknown>, handlers as Record<string, unknown>) as never)
  }
  return <div {...(handlers as Record<string, unknown>)}>{props.children}</div>
}

function ContextMenuPopup(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const value = useContext(ContextMenuContext)
  if (!value) throw new Error('ContextMenu.Popup must be used inside ContextMenu.Root')
  const menu = value.context
  const navigation = useListNavigation({
    collection: menu.collection,
    onSelect: (item) => { (item as MenuItemData).onSelect?.() },
  })
  const dismissProps = useDismiss({ enabled: menu.open, onDismiss: (event) => menu.setOpen(false, 'outside-press', event) })
  if (!menu.open) return null
  return <anchored position={value.position} priority={4} occlude {...dismissProps} onKeyDown={(event: EventPayload) => navigation.onKeyDown(event)}>
    <div
      role="menu"
      testId={props.testId}
      tabIndex={0}
      autoFocus
      style={mergeStyle(popupListStyle(C), {
        minWidth: 200,
        padding: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.panelRaised,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
        userSelect: 'none',
      }, props.style)}
    >{props.children}</div>
  </anchored>
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Portal: MenuPortal,
  Positioner: PopoverPositioner,
  Popup: ContextMenuPopup,
  Item: MenuItem,
  LinkItem: MenuLinkItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  RadioItemIndicator: MenuRadioItemIndicator,
  CheckboxItem: MenuCheckboxItem,
  CheckboxItemIndicator: MenuCheckboxItemIndicator,
  SubmenuRoot: MenuSubmenuRoot,
  SubmenuTrigger: MenuSubmenuTrigger,
})

function MenubarRoot(props: { children: ReactNode; disabled?: boolean; loopFocus?: boolean; modal?: boolean; orientation?: 'horizontal' | 'vertical'; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const { register, keyDownFor } = useRovingFocus({ orientation: 'horizontal', loop: props.loopFocus ?? true })
  const context = useMemo(() => ({ register, keyDownFor }), [register, keyDownFor])
  return <MenubarContext.Provider value={context}>
    <div role="menubar" testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: 9, backgroundColor: C.control, alignSelf: 'flex-start' }, props.style)}>{props.children}</div>
  </MenubarContext.Provider>
}

export const Menubar = Object.assign(MenubarRoot, { Root: MenubarRoot, Menu })
