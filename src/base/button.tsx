import type { ReactNode } from 'react'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'
import type { Ref } from 'react'
import { useTheme } from '../theme-context'
import { usePress, mergeStyle, type Style } from './foundations'
import { useFormContext } from './form-context'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = {
  children?: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  focusableWhenDisabled?: boolean
  testId?: string
  icon?: string
  width?: number | string
  justify?: 'center' | 'start'
  style?: Style
  type?: 'button' | 'submit'
  ariaLabel?: string
  autoFocus?: boolean
  ref?: Ref<Instance>
  onKeyDown?: (event: EventPayload) => void
}

export function useButtonStyle(options: {
  variant: ButtonVariant
  size: ButtonSize
  justify: 'center' | 'start'
  hovered: boolean
  focused: boolean
  pressed: boolean
  disabled: boolean
}): Style {
  const { tokens: C } = useTheme()
  const { variant, size, disabled, hovered, pressed, focused } = options
  const isPrimary = variant === 'primary'
  const isDestructive = variant === 'destructive'
  const height = size === 'sm' ? 30 : size === 'lg' ? 42 : 36
  const background = isPrimary
    ? pressed || hovered ? C.violet : C.primary
    : isDestructive
      ? hovered ? C.red : C.red
      : variant === 'ghost'
        ? hovered || pressed ? C.control : 'transparent'
        : hovered || pressed ? C.panelRaised : C.control
  return {
    height,
    minWidth: size === 'sm' ? 30 : undefined,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: options.justify,
    gap: 8,
    paddingLeft: size === 'sm' ? 10 : 14,
    paddingRight: size === 'sm' ? 10 : 14,
    borderRadius: 8,
    borderWidth: variant === 'ghost' ? (focused ? 1 : 0) : 1,
    borderColor: focused ? C.primary : isPrimary ? C.primary : isDestructive ? C.red : C.borderStrong,
    backgroundColor: background,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'default' : 'pointer',
    userSelect: 'none',
  }
}

export type ButtonTextStyle = {
  fontFamily: string
  fontSize: number
  fontWeight: number
  color: string
}

export function useButtonTextStyle(options: { variant: ButtonVariant; size: ButtonSize; disabled: boolean }): ButtonTextStyle {
  const { tokens: C } = useTheme()
  const isPrimary = options.variant === 'primary'
  const isDestructive = options.variant === 'destructive'
  return {
    fontFamily: 'Helvetica',
    fontSize: options.size === 'sm' ? 12 : 13,
    fontWeight: 700,
    color: isPrimary || isDestructive ? C.primaryForeground : C.text,
  }
}

export function Button(props: ButtonProps) {
  const { tokens: C } = useTheme()
  const form = useFormContext()
  const variant = props.variant ?? 'secondary'
  const size = props.size ?? 'md'
  const disabled = props.disabled ?? false
  const { pressProps, hovered, focused } = usePress({
    disabled,
    focusableWhenDisabled: props.focusableWhenDisabled,
    onKeyDown: props.onKeyDown,
    onPress: () => {
      if (props.type === 'submit' && form) { form.submit(); return }
      if (props.type === 'submit' && !form) return
      props.onClick?.()
    },
  })
  const color = useButtonTextStyle({ variant, size, disabled })
  return <div
    {...pressProps}
    ref={props.ref as never}
    testId={props.testId}
    aria-label={props.ariaLabel}
    autoFocus={props.autoFocus}
    style={mergeStyle(useButtonStyle({ variant, size, justify: props.justify ?? 'center', hovered, focused, pressed: false, disabled }), { width: props.width }, props.style)}
  >
    {props.icon ? <text style={{ width: 20, fontFamily: 'Helvetica', fontSize: size === 'sm' ? 15 : 17, textAlign: 'center', color: color.color }}>{props.icon}</text> : null}
    {props.children === undefined || props.children === null ? null : <text style={color}>{props.children}</text>}
  </div>
}

export function IconButton(props: { icon: string; label: string; onClick?: () => void; testId?: string; variant?: ButtonVariant; disabled?: boolean }) {
  const { tokens: C } = useTheme()
  const variant = props.variant ?? 'ghost'
  const { pressProps, hovered } = usePress({ disabled: props.disabled, onPress: props.onClick, role: 'button' })
  const background = variant === 'primary' ? C.primary : variant === 'destructive' ? C.red : variant === 'secondary' ? C.control : hovered ? C.control : 'transparent'
  return <div {...pressProps} testId={props.testId} aria-label={props.label} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: variant === 'ghost' ? 0 : 1, borderColor: C.borderStrong, backgroundColor: background, cursor: props.disabled ? 'default' : 'pointer', opacity: props.disabled ? 0.45 : 1 }}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 17, textAlign: 'center', color: variant === 'primary' || variant === 'destructive' ? C.primaryForeground : C.text }}>{props.icon}</text>
  </div>
}

export type { Style }
