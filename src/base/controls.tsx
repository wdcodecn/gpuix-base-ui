import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'
import { useTheme } from '../theme-context'
import { mergeStyle, useControllableState, usePress, useRovingFocus, type ChangeDetails, type ElementRef, type Style } from './foundations'
import { Button, type ButtonProps } from './button'

type Roving = ReturnType<typeof useRovingFocus>

type ToggleGroupContextValue = {
  value: string[]
  toggle: (value: string) => void
  disabled: boolean
  register: Roving['register']
  keyDownFor: Roving['keyDownFor']
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null)

export function Toggle(props: {
  value?: string
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean, details: ChangeDetails) => void
  disabled?: boolean
  children?: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const { tokens: C } = useTheme()
  const group = useContext(ToggleGroupContext)
  const [own, setOwn] = useControllableState<boolean>({
    value: props.pressed,
    defaultValue: props.defaultPressed ?? false,
    onChange: (value, details) => props.onPressedChange?.(value, details),
  })
  const disabled = props.disabled ?? group?.disabled ?? false
  const pressed = group ? group.value.includes(props.value ?? '') : own
  const ref = useRef<Instance | null>(null)
  const indexRef = useRef(-1)
  const register = group?.register
  useEffect(() => {
    if (register) indexRef.current = register(ref)
  }, [register])
  const { pressProps, hovered, focused } = usePress({
    disabled,
    onPress: () => {
      if (group) group.toggle(props.value ?? '')
      else setOwn(!own, 'item-press')
    },
    onKeyDown: (event) => {
      if (group) group.keyDownFor(indexRef.current)(event)
    },
  })
  const ariaProps = { 'aria-pressed': pressed }
  return <div
    {...pressProps}
    {...ariaProps}
    ref={ref as never}
    testId={props.testId}
    aria-label={props.ariaLabel}
    style={mergeStyle({
      minHeight: 34,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: pressed ? C.selected : 'transparent',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      userSelect: 'none',
    }, props.style)}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 600, color: pressed ? C.selectedForeground : C.muted }}>{props.children}</text>
  </div>
}

function ToggleGroupRoot(props: {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[], details: ChangeDetails) => void
  multiple?: boolean
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  loopFocus?: boolean
  children: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const { tokens: C } = useTheme()
  const [value, setValue] = useControllableState<string[]>({
    value: props.value,
    defaultValue: props.defaultValue ?? [],
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const orientation = props.orientation ?? 'horizontal'
  const { register, keyDownFor } = useRovingFocus({ orientation, loop: props.loopFocus ?? true })
  const toggle = (item: string) => {
    if (props.disabled) return
    if (value.includes(item)) setValue(value.filter((entry) => entry !== item), 'item-press')
    else setValue(props.multiple ? [...value, item] : [item], 'item-press')
  }
  const context = useMemo<ToggleGroupContextValue>(
    () => ({ value, toggle, disabled: props.disabled ?? false, register, keyDownFor }),
    [value, toggle, props.disabled, register, keyDownFor],
  )
  return <ToggleGroupContext.Provider value={context}>
    <div
      role="group"
      aria-label={props.ariaLabel}
      testId={props.testId}
      style={mergeStyle({
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        gap: 4,
        padding: 4,
        borderRadius: 9,
        backgroundColor: C.control,
        alignSelf: 'flex-start',
      }, props.style)}
    >{props.children}</div>
  </ToggleGroupContext.Provider>
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, { Root: ToggleGroupRoot, Item: Toggle, Button: Toggle })

type ToolbarContextValue = {
  register: Roving['register']
  keyDownFor: Roving['keyDownFor']
  disabled: boolean
  orientation: 'horizontal' | 'vertical'
}

const ToolbarContext = createContext<ToolbarContextValue | null>(null)

function useToolbarItem(focusable = true) {
  const toolbar = useContext(ToolbarContext)
  const ref = useRef<Instance | null>(null)
  const indexRef = useRef(-1)
  const register = toolbar?.register
  useEffect(() => {
    if (register && focusable) indexRef.current = register(ref)
  }, [register, focusable])
  const onKeyDown = (event: EventPayload) => {
    if (toolbar) toolbar.keyDownFor(indexRef.current)(event)
  }
  return { ref, onKeyDown }
}

function ToolbarRoot(props: {
  orientation?: 'horizontal' | 'vertical'
  loopFocus?: boolean
  disabled?: boolean
  children: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const orientation = props.orientation ?? 'horizontal'
  const { register, keyDownFor } = useRovingFocus({ orientation, loop: props.loopFocus ?? true })
  const context = useMemo<ToolbarContextValue>(
    () => ({ register, keyDownFor, disabled: props.disabled ?? false, orientation }),
    [register, keyDownFor, props.disabled, orientation],
  )
  return <ToolbarContext.Provider value={context}>
    <div
      role="toolbar"
      aria-label={props.ariaLabel}
      testId={props.testId}
      style={mergeStyle({
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
        gap: 5,
      }, props.style)}
    >{props.children}</div>
  </ToolbarContext.Provider>
}

function ToolbarButton(props: ButtonProps) {
  const toolbar = useContext(ToolbarContext)
  const { ref, onKeyDown } = useToolbarItem(!props.disabled)
  return <Button {...props} disabled={props.disabled ?? toolbar?.disabled} ref={ref} onKeyDown={(event) => { props.onKeyDown?.(event); onKeyDown(event) }} />
}

function ToolbarLink(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const toolbar = useContext(ToolbarContext)
  const { ref, onKeyDown } = useToolbarItem(!props.disabled)
  const { pressProps, hovered, focused } = usePress({ disabled: props.disabled ?? toolbar?.disabled, onPress: props.onClick, onKeyDown })
  return <div {...pressProps} ref={ref as never} testId={props.testId} style={mergeStyle({ minHeight: 34, display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8, borderRadius: 7, cursor: 'pointer', backgroundColor: undefined }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.text, textDecoration: focused ? 'underline' : 'none' }}>{props.children}</text>
  </div>
}

function ToolbarInput(props: { value?: string; placeholder?: string; onChange?: (value: string) => void; disabled?: boolean; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const toolbar = useContext(ToolbarContext)
  const { ref, onKeyDown } = useToolbarItem(!props.disabled)
  return <input
    ref={ref as never}
    testId={props.testId}
    value={props.value}
    placeholder={props.placeholder}
    readOnly={props.disabled ?? toolbar?.disabled}
    onKeyDown={onKeyDown}
    onChange={(event: EventPayload) => props.onChange?.(event.value ?? '')}
    style={mergeStyle({
      height: 32,
      minWidth: 150,
      paddingLeft: 9,
      paddingRight: 9,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: C.borderStrong,
      backgroundColor: C.input,
      color: C.text,
      fontFamily: 'Helvetica',
      fontSize: 12,
    }, props.style)}
  />
}

function ToolbarGroup(props: { children: ReactNode; disabled?: boolean; style?: Style }) {
  const toolbar = useContext(ToolbarContext)
  const disabled = props.disabled ?? toolbar?.disabled ?? false
  const direction = (props.style?.flexDirection as string | undefined) ?? 'row'
  return <div role="group" style={mergeStyle({ display: 'flex', flexDirection: direction, alignItems: 'center', gap: 4, opacity: disabled ? 0.6 : 1 }, props.style)}>{props.children}</div>
}

function ToolbarSeparator(props: { orientation?: 'horizontal' | 'vertical' }) {
  const { tokens: C } = useTheme()
  const toolbar = useContext(ToolbarContext)
  const orientation = props.orientation ?? (toolbar?.orientation === 'horizontal' ? 'vertical' : 'horizontal')
  return <div role="separator" style={orientation === 'vertical' ? { width: 1, alignSelf: 'stretch', backgroundColor: C.border } : { height: 1, width: '100%', backgroundColor: C.border }} />
}

export const Toolbar = Object.assign(ToolbarRoot, {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Link: ToolbarLink,
  Input: ToolbarInput,
  Group: ToolbarGroup,
  Separator: ToolbarSeparator,
})

export type { ButtonProps }
