import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { useGpuix } from '@gpuix/react'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'
import { useTheme } from '../theme-context'
import {
  clamp, formatNumber, mergeStyle, ratioOf, useBounds, useControllableState, useDrag, usePress,
  useRovingFocus, type ChangeDetails, type ElementRef, type OpenReason, type Style,
} from './foundations'
import { FormContext as ButtonFormContext, type FormContextValue as ButtonFormContextValue } from './form-context'

type FieldApi = {
  name: string | undefined
  getValue: () => unknown
  validate: () => Promise<string[]> | string[]
  setErrors: (errors: string[]) => void
}

type ExtendedFormContextValue = ButtonFormContextValue & {
  registerField: (key: object, api: React.MutableRefObject<FieldApi>) => () => void
}

const FormContext = createContext<ExtendedFormContextValue | null>(null)

export function useForm() {
  return useContext(FormContext)
}

export { ButtonFormContext, type ButtonFormContextValue }

type FieldContextValue = {
  name?: string
  value: unknown
  setValue: (value: unknown, reason?: OpenReason, event?: EventPayload) => void
  disabled: boolean
  touched: boolean
  dirty: boolean
  filled: boolean
  focused: boolean
  invalid: boolean
  error: string | null
  validate: () => void
  validationMode: 'onSubmit' | 'onBlur' | 'onChange'
  controlRef: React.MutableRefObject<Instance | null>
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useField(name: string) {
  const field = useContext(FieldContext)
  if (!field) throw new Error(`${name} must be used inside Field.Root`)
  return field
}

function FieldRoot(props: {
  name?: string
  value?: unknown
  defaultValue?: unknown
  onValueChange?: (value: unknown, details: ChangeDetails) => void
  validate?: (value: unknown) => string | string[] | void | null | Promise<string | string[] | void | null>
  validationMode?: 'onSubmit' | 'onBlur' | 'onChange'
  disabled?: boolean
  invalid?: boolean
  dirty?: boolean
  touched?: boolean
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [value, setValue] = useControllableState<unknown>({
    value: props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const [touched, setTouched] = useState(props.touched ?? false)
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controlRef = useRef<Instance | null>(null)
  const form = useContext(FormContext)
  const formMode = form?.validationMode ?? 'onSubmit'
  const validationMode = props.validationMode ?? formMode
  const dirty = props.dirty ?? (props.defaultValue !== undefined && value !== props.defaultValue)

  const runValidate = () => {
    if (!props.validate) return
    Promise.resolve(props.validate(value)).then((result) => {
      if (Array.isArray(result)) setError(result[0] ?? null)
      else setError(result ?? null)
    }).catch(() => setError('Validation failed'))
  }

  const apiKey = useRef({})
  const api = useRef<FieldApi>({
    name: props.name,
    getValue: () => value,
    validate: () => [],
    setErrors: (errors) => setError(errors[0] ?? null),
  })
  api.current.name = props.name
  api.current.getValue = () => value
  api.current.validate = async () => {
    if (!props.validate) return []
    const result = await props.validate(value)
    return Array.isArray(result) ? result : result ? [result] : []
  }

  useEffect(() => {
    if (!form) return
    return form.registerField(apiKey.current, api)
  }, [form])

  const context = useMemo<FieldContextValue>(() => ({
    name: props.name,
    value,
    setValue,
    disabled: props.disabled ?? false,
    touched,
    dirty,
    filled: value !== '' && value !== null && value !== undefined,
    focused,
    invalid: Boolean(props.invalid || error),
    error,
    validate: runValidate,
    validationMode,
    controlRef,
  }), [props.name, value, setValue, props.disabled, touched, dirty, focused, props.invalid, error, validationMode, runValidate, controlRef])

  return <FieldContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }, props.style)}>{props.children}</div>
  </FieldContext.Provider>
}

function FieldLabel(props: { children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const field = useField('Field.Label')
  const focusControl = useFocusControl()
  return <div role="label" testId={props.testId} onClick={() => focusControl(field.controlRef)} style={mergeStyle({ display: 'flex', flexDirection: 'column' }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 700, color: C.text }}>{props.children}</text>
  </div>
}

function useFocusControl() {
  const { renderer } = useGpuix()
  return (ref: React.MutableRefObject<Instance | null> | null) => {
    const id = ref?.current?.id
    if (id !== undefined && id !== null) renderer?.focusElement?.(id)
  }
}

function FieldDescription(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 11, color: C.muted }, props.style)}>{props.children}</text>
}

function FieldError(props: {
  children?: ReactNode | ((error: string) => ReactNode)
  match?: boolean | string
  style?: Style
  testId?: string
}) {
  const { tokens: C } = useTheme()
  const field = useField('Field.Error')
  const show = props.match === false ? false : props.match === true ? true : field.error !== null
  if (!show) return null
  const content = typeof props.children === 'function' ? props.children(field.error ?? '') : props.children ?? field.error
  if (content === null || content === undefined) return null
  return <text testId={props.testId} style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 11, color: C.red }, props.style)}>{content}</text>
}

function FieldControl(props: {
  defaultValue?: unknown
  onValueChange?: (value: string, details: ChangeDetails) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoFocus?: boolean
  tabIndex?: number
  style?: Style
  testId?: string
  ariaLabel?: string
  inputRef?: React.MutableRefObject<Instance | null>
}) {
  const { tokens: C } = useTheme()
  const field = useField('Field.Control')
  const form = useContext(FormContext)
  const ref = useRef<Instance | null>(null)
  const disabled = props.disabled ?? field.disabled
  return <input
    ref={(node: Instance | null) => { ref.current = node; field.controlRef.current = node }}
    testId={props.testId}
    aria-label={props.ariaLabel}
    autoFocus={props.autoFocus}
    tabIndex={props.tabIndex ?? (disabled ? -1 : 0)}
    value={field.value === undefined || field.value === null ? '' : String(field.value)}
    placeholder={props.placeholder}
    readOnly={disabled || props.readOnly}
    onSubmit={() => { form?.submit() }}
    onFocus={() => { }}
    onChange={(event: EventPayload) => {
      const next = event.value ?? ''
      field.setValue(next, 'none', event)
      props.onValueChange?.(next, { reason: 'none', event, cancel: () => undefined, isCanceled: false })
      if (field.validationMode === 'onChange') field.validate()
    }}
    style={mergeStyle({
      height: 38,
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: field.invalid ? C.red : C.borderStrong,
      backgroundColor: C.input,
      color: C.text,
      fontFamily: 'Helvetica',
      fontSize: 13,
      opacity: disabled ? 0.5 : 1,
    }, props.style)}
  />
}

function FieldValidity(props: { children: (state: { validity: { valid: boolean | null; customError: string | null }; errors: string[]; error: string | null; value: unknown }) => ReactNode }) {
  const field = useField('Field.Validity')
  return <>{props.children({
    validity: { valid: field.error ? false : null, customError: field.error },
    errors: field.error ? [field.error] : [],
    error: field.error,
    value: field.value,
  })}</>
}

const FieldItemContext = createContext<{ disabled: boolean } | null>(null)

function FieldItem(props: { disabled?: boolean; children: ReactNode; style?: Style }) {
  const context = useMemo(() => ({ disabled: props.disabled ?? false }), [props.disabled])
  return <FieldItemContext.Provider value={context}>
    <div style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }, props.style)}>{props.children}</div>
  </FieldItemContext.Provider>
}

function FieldItemControl(props: { children: ReactNode }) { return <>{props.children}</> }
function FieldItemLabel(props: { children: ReactNode; style?: Style }) { const { tokens: C } = useTheme(); return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 13, color: C.text }, props.style)}>{props.children}</text> }
function FieldItemDescription(props: { children: ReactNode; style?: Style }) { const { tokens: C } = useTheme(); return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 11, color: C.muted }, props.style)}>{props.children}</text> }
function FieldItemError(props: { children?: ReactNode; style?: Style }) { const { tokens: C } = useTheme(); return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 11, color: C.red }, props.style)}>{props.children}</text> }

export const Field = Object.assign(FieldRoot, {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
  Validity: FieldValidity,
  Item: FieldItem,
  ItemControl: FieldItemControl,
  ItemLabel: FieldItemLabel,
  ItemDescription: FieldItemDescription,
  ItemError: FieldItemError,
})

export function FieldsetRoot(props: { children: ReactNode; disabled?: boolean; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  return <div role="group" testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderWidth: 1, borderColor: C.border, borderRadius: 9, opacity: props.disabled ? 0.6 : 1 }, props.style)}>{props.children}</div>
}

export function FieldsetLegend(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 800, color: C.text }, props.style)}>{props.children}</text>
}

export const Fieldset = Object.assign(FieldsetRoot, { Root: FieldsetRoot, Legend: FieldsetLegend })

function FormRoot(props: {
  errors?: Record<string, string | string[]>
  validationMode?: 'onSubmit' | 'onBlur' | 'onChange'
  onFormSubmit?: (values: Record<string, unknown>, details: { reason: 'none'; event?: EventPayload }) => void
  actionsRef?: React.MutableRefObject<{ validate: () => Promise<boolean> } | null>
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const fields = useRef(new Map<object, React.MutableRefObject<FieldApi>>())
  const validationMode = props.validationMode ?? 'onSubmit'

  const validateAll = async () => {
    const result = await Promise.all(Array.from(fields.current.values()).map((field) => field.current.validate()))
    return result.every((errors) => errors.length === 0)
  }

  const submit = () => {
    void (async () => {
      const valid = await validateAll()
      if (!valid) return
      const values: Record<string, unknown> = {}
      fields.current.forEach((field) => { if (field.current.name) values[field.current.name as string] = field.current.getValue() })
      props.onFormSubmit?.(values, { reason: 'none' })
    })()
  }

  const context = useMemo<ExtendedFormContextValue>(() => ({
    submit,
    validationMode,
    registerField: (key, api) => {
      fields.current.set(key, api)
      return () => { fields.current.delete(key) }
    },
  }), [validationMode, props.onFormSubmit])

  useEffect(() => {
    if (props.actionsRef) props.actionsRef.current = { validate: validateAll }
  }, [props.actionsRef])

  useEffect(() => {
    if (!props.errors) return
    fields.current.forEach((field) => {
      if (!field.current.name) return
      const errors = props.errors?.[field.current.name]
      if (errors === undefined) return
      field.current.setErrors(Array.isArray(errors) ? errors : [errors])
    })
  }, [props.errors])

  return <FormContext.Provider value={context}>
    <ButtonFormContext.Provider value={context}>
      <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }, props.style)}>{props.children}</div>
    </ButtonFormContext.Provider>
  </FormContext.Provider>
}

function FormSubmit(props: { children: ReactNode; style?: Style; testId?: string }) {
  const form = useContext(FormContext)
  const { tokens: C } = useTheme()
  const { pressProps, hovered } = usePress({ onPress: () => form?.submit() })
  return <div {...pressProps} testId={props.testId} style={mergeStyle({ alignSelf: 'flex-start', height: 36, display: 'flex', alignItems: 'center', paddingLeft: 14, paddingRight: 14, borderRadius: 8, borderWidth: 1, borderColor: C.primary, backgroundColor: C.primary, cursor: 'pointer' }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 700, color: C.primaryForeground }}>{props.children}</text>
  </div>
}

export const Form = Object.assign(FormRoot, { Root: FormRoot, Submit: FormSubmit })

export function Input(props: {
  label?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails) => void
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoFocus?: boolean
  testId?: string
  ariaLabel?: string
  style?: Style
  inputRef?: React.MutableRefObject<Instance | null>
}) {
  const { tokens: C } = useTheme()
  const [value, setValue] = useControllableState<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (next, details) => { props.onValueChange?.(next, details); props.onChange?.(next) },
  })
  const ref = useRef<Instance | null>(null)
  if (props.inputRef) props.inputRef.current = ref.current
  const disabled = props.disabled ?? false
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
    {props.label ? <text style={{ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 600, color: C.muted }}>{props.label}</text> : null}
    <input
      ref={ref as never}
      testId={props.testId}
      aria-label={props.ariaLabel}
      autoFocus={props.autoFocus}
      value={value}
      placeholder={props.placeholder}
      readOnly={disabled || props.readOnly}
      tabIndex={disabled ? -1 : 0}
      onChange={(event: EventPayload) => setValue(event.value ?? '', 'none', event)}
      style={mergeStyle({
        height: 38,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.input,
        color: C.text,
        fontFamily: 'Helvetica',
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }, props.style)}
    />
  </div>
}

type NumberFieldContextValue = {
  value: number | null
  text: string
  setText: (text: string, event?: EventPayload) => void
  commit: (event?: EventPayload) => void
  stepBy: (steps: number, reason: OpenReason, event?: EventPayload) => void
  setValue: (value: number | null, reason: OpenReason, event?: EventPayload) => void
  min: number | undefined
  max: number | undefined
  step: number
  smallStep: number
  largeStep: number
  format: Intl.NumberFormatOptions | undefined
  locale: Intl.LocalesArgument | undefined
  disabled: boolean
  readOnly: boolean
  scrubbing: boolean
  setScrubbing: (value: boolean) => void
}

const NumberFieldContext = createContext<NumberFieldContextValue | null>(null)

function useNumberField(name: string) {
  const context = useContext(NumberFieldContext)
  if (!context) throw new Error(`${name} must be used inside NumberField.Root`)
  return context
}

function NumberFieldRoot(props: {
  value?: number | null
  defaultValue?: number
  onValueChange?: (value: number | null, details: ChangeDetails) => void
  onValueCommitted?: (value: number | null, details: ChangeDetails) => void
  min?: number
  max?: number
  step?: number | 'any'
  smallStep?: number
  largeStep?: number
  allowOutOfRange?: boolean
  snapOnStep?: boolean
  allowWheelScrub?: boolean
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [value, setControlledValue] = useControllableState<number | null>({
    value: props.value === undefined ? undefined : props.value,
    defaultValue: props.defaultValue ?? null,
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const step = props.step === 'any' || props.step === undefined ? 1 : props.step
  const clampValue = (next: number | null) => {
    if (next === null) return null
    const withMin = props.min === undefined ? next : Math.max(props.min, next)
    const withMax = props.max === undefined ? next : Math.min(props.max, withMin)
    return withMax
  }
  const [text, setTextState] = useState('')
  useEffect(() => {
    setTextState(value === null ? '' : formatNumber(value, props.format, props.locale))
  }, [value, props.format, props.locale])
  const [scrubbing, setScrubbing] = useState(false)
  const commit = (event?: EventPayload) => {
    props.onValueCommitted?.(value, { reason: 'input-blur', event, cancel: () => undefined, isCanceled: false })
  }
  const setValue = (next: number | null, reason: OpenReason, event?: EventPayload) => {
    const applyClamp = !(props.allowOutOfRange && reason === 'input-change')
    setControlledValue(applyClamp ? clampValue(next) : next, reason, event)
  }
  const stepBy = (steps: number, reason: OpenReason, event?: EventPayload) => {
    const base = value ?? 0
    const next = base + steps * step
    setValue(props.snapOnStep ? Math.round(next / step) * step : next, reason, event)
  }
  const context = useMemo<NumberFieldContextValue>(() => ({
    value, text, setText: (next, event) => { setTextState(next); void event }, commit, stepBy, setValue,
    min: props.min, max: props.max, step, smallStep: props.smallStep ?? 0.1, largeStep: props.largeStep ?? 10,
    format: props.format, locale: props.locale, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false,
    scrubbing, setScrubbing,
  }), [value, text, props.min, props.max, step, props.smallStep, props.largeStep, props.format, props.locale, props.disabled, props.readOnly, scrubbing, commit, stepBy, setValue])
  return <NumberFieldContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }, props.style)}>{props.children}</div>
  </NumberFieldContext.Provider>
}

function NumberFieldScrubArea(props: { direction?: 'horizontal' | 'vertical'; pixelSensitivity?: number; children?: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const field = useNumberField('NumberField.ScrubArea')
  const sensitivity = props.pixelSensitivity ?? 2
  const start = useRef<{ x: number; y: number; value: number } | null>(null)
  if (field.disabled || field.readOnly) return null
  return <div
    testId={props.testId}
    onMouseDown={(event: EventPayload) => {
      if (event.button !== undefined && event.button !== 0) return
      start.current = { x: event.x ?? 0, y: event.y ?? 0, value: field.value ?? 0 }
      field.setScrubbing(true)
    }}
    onMouseMove={(event: EventPayload) => {
      const drag = start.current
      if (!drag || event.pressedButton !== 0) return
      const delta = props.direction === 'vertical' ? (drag.y - (event.y ?? 0)) : ((event.x ?? 0) - drag.x)
      field.setValue(drag.value + (delta / sensitivity) * field.step, 'scrub', event)
    }}
    onMouseUp={(event: EventPayload) => {
      if (!start.current) return
      start.current = null
      field.setScrubbing(false)
      field.commit(event)
    }}
    style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4, paddingRight: 4, cursor: field.scrubbing ? 'grabbing' : 'col-resize', userSelect: 'none' }, props.style)}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 14, color: C.faint }}>⇔</text>
    {props.children}
  </div>
}

function NumberFieldScrubAreaCursor() { return null }

function NumberFieldGroup(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.input, overflow: 'hidden' }, props.style)}>{props.children}</div>
}

function StepperButton(props: { direction: 1 | -1; children: ReactNode; testId?: string }) {
  const { tokens: C } = useTheme()
  const field = useNumberField('NumberField.Stepper')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }
  useEffect(() => stop, [])
  const disabled = field.disabled || field.readOnly
  const { pressProps, hovered } = usePress({
    disabled,
    onPress: () => field.stepBy(props.direction, props.direction === 1 ? 'increment-press' : 'decrement-press'),
  })
  return <div
    {...pressProps}
    testId={props.testId}
    onMouseDown={(event: EventPayload) => {
      if (disabled) return
      timer.current = setInterval(() => field.stepBy(props.direction, 'increment-press'), 90)
      void event
    }}
    onMouseUp={stop}
    onMouseLeave={stop}
    style={{ width: 32, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.control, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 14, color: C.text }}>{props.children}</text>
  </div>
}

function NumberFieldInput(props: { style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const field = useNumberField('NumberField.Input')
  const parse = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.+-]/g, '')
    const parsed = Number.parseFloat(cleaned)
    return Number.isNaN(parsed) ? null : parsed
  }
  return <input
    testId={props.testId}
    aria-label={props.ariaLabel}
    value={field.text}
    readOnly={field.disabled || field.readOnly}
    tabIndex={field.disabled ? -1 : 0}
    onChange={(event: EventPayload) => {
      const raw = event.value ?? ''
      field.setText(raw, event)
      const parsed = parse(raw)
      if (parsed !== null) field.setValue(parsed, 'input-change', event)
    }}
    onBlur={(event: EventPayload) => {
      const parsed = parse(field.text)
      field.setValue(parsed, 'input-blur', event)
      field.commit(event)
    }}
    onKeyDown={(event: EventPayload) => {
      const key = (event.key ?? '').toLowerCase()
      const alt = event.modifiers?.alt ? field.smallStep : field.step
      const shift = event.modifiers?.shift ? field.largeStep : alt
      if (key === 'up') field.stepBy(shift, 'keyboard', event)
      else if (key === 'down') field.stepBy(-shift, 'keyboard', event)
      else if (key === 'pageup') field.stepBy(field.largeStep, 'keyboard', event)
      else if (key === 'pagedown') field.stepBy(-field.largeStep, 'keyboard', event)
      else if (key === 'home' && field.min !== undefined) field.setValue(field.min, 'keyboard', event)
      else if (key === 'end' && field.max !== undefined) field.setValue(field.max, 'keyboard', event)
    }}
    style={mergeStyle({
      width: 74,
      height: '100%',
      paddingLeft: 10,
      paddingRight: 10,
      textAlign: 'center',
      borderWidth: 0,
      backgroundColor: 'transparent',
      color: C.text,
      fontFamily: 'Helvetica',
      fontSize: 13,
    }, props.style)}
  />
}

export const NumberField = Object.assign(NumberFieldRoot, {
  Root: NumberFieldRoot,
  ScrubArea: NumberFieldScrubArea,
  ScrubAreaCursor: NumberFieldScrubAreaCursor,
  Group: NumberFieldGroup,
  Decrement: (props: { testId?: string }) => <StepperButton direction={-1} testId={props.testId}>−</StepperButton>,
  Input: NumberFieldInput,
  Increment: (props: { testId?: string }) => <StepperButton direction={1} testId={props.testId}>＋</StepperButton>,
})

type OTPContextValue = {
  value: string
  length: number
  disabled: boolean
  readOnly: boolean
  masked: boolean
  applyText: (index: number, text: string, event?: EventPayload) => void
  setCellValue: (index: number, char: string, event?: EventPayload) => void
  registerCell: (index: number, ref: ElementRef) => void
  nextIndex: () => number
  focusCell: (index: number) => void
}

const OTPContext = createContext<OTPContextValue | null>(null)

function OTPFieldRoot(props: {
  length: number
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails) => void
  onValueComplete?: (value: string, details: ChangeDetails) => void
  onValueInvalid?: (value: string, details: ChangeDetails) => void
  validationType?: 'numeric' | 'alpha' | 'alphanumeric' | 'none'
  normalizeValue?: (value: string) => string
  mask?: boolean
  autoSubmit?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  children?: ReactNode
  style?: Style
  testId?: string
}) {
  const [value, setValue] = useControllableState<string>({
    value: props.value,
    defaultValue: props.defaultValue ?? '',
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const refs = useRef(new Map<number, ElementRef>())
  const counter = useRef(0)
  const completed = useRef(false)
  const validationType = props.validationType ?? 'numeric'
  const filter = (raw: string) => {
    const normalized = props.normalizeValue ? props.normalizeValue(raw) : raw
    return Array.from(normalized).filter((char) => {
      if (validationType === 'none') return true
      if (validationType === 'numeric') return /[0-9]/.test(char)
      if (validationType === 'alpha') return /[a-zA-Z]/.test(char)
      return /[a-zA-Z0-9]/.test(char)
    }).join('')
  }
  const commit = (next: string) => {
    const clamped = next.slice(0, props.length)
    setValue(clamped, 'input-change')
    if (clamped.length === props.length) {
      if (!completed.current) { completed.current = true; props.onValueComplete?.(clamped, { reason: 'input-change', cancel: () => undefined, isCanceled: false }) }
    } else completed.current = false
  }
  const { renderer } = useGpuix()
  const rendererRef = useRef(renderer)
  rendererRef.current = renderer
  const focusCellAt = (index: number) => {
    const id = refs.current.get(clamp(index, 0, props.length - 1))?.current?.id
    if (id != null) setTimeout(() => rendererRef.current?.focusElement?.(id), 0)
  }
  const context = useMemo<OTPContextValue>(() => ({
    value, length: props.length, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false, masked: props.mask ?? false,
    applyText: (index, raw, event) => {
      const cleaned = filter(raw)
      if (cleaned.length === 0 && raw.length > 0) { props.onValueInvalid?.(raw, { reason: 'input-change', event, cancel: () => undefined, isCanceled: false }); return }
      if (cleaned.length > 1) {
        commit(`${value.slice(0, index)}${cleaned}`)
        focusCellAt(index + cleaned.length)
        return
      }
      commit(`${value.slice(0, index)}${cleaned}${value.slice(index + 1)}`)
      if (cleaned) focusCellAt(index + 1)
    },
    setCellValue: (index, char, event) => {
      commit(`${value.slice(0, index)}${char}${value.slice(index + 1)}`)
      void event
    },
    registerCell: (index, ref) => { refs.current.set(index, ref) },
    nextIndex: () => counter.current++,
    focusCell: (index) => focusCellAt(index),
  }), [value, props.length, props.disabled, props.readOnly, props.mask, props.onValueInvalid])
  return <OTPContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }, props.style)}>
      {props.children ?? Array.from({ length: props.length }, (_, index) => <OTPFieldInput key={index} />)}
    </div>
  </OTPContext.Provider>
}

function OTPFieldInput(props: { index?: number; style?: Style; testId?: string; ariaLabel?: string; placeholder?: string }) {
  const { tokens: C } = useTheme()
  const context = useContext(OTPContext)
  if (!context) throw new Error('OTPField.Input must be used inside OTPField.Root')
  const indexRef = useRef(props.index ?? -1)
  if (indexRef.current === -1) indexRef.current = context.nextIndex()
  const ref = useRef<Instance | null>(null)
  useEffect(() => { context.registerCell(indexRef.current, ref) }, [context, indexRef])
  const index = indexRef.current
  const char = context.value[index] ?? ''
  const wide = char ? /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(char) : false
  return <input
    ref={ref as never}
    testId={props.testId}
    aria-label={props.ariaLabel ?? `Character ${index + 1} of ${context.length}`}
    placeholder={props.placeholder}
    value={context.masked && char ? '•' : char}
    readOnly={context.disabled || context.readOnly}
    tabIndex={context.disabled ? -1 : 0}
    onChange={(event: EventPayload) => {
      const raw = event.value ?? ''
      const current = context.value[index] ?? ''
      const delta = raw.startsWith(current) ? raw.slice(current.length) : raw
      context.applyText(index, delta || raw, event)
    }}
    onKeyDown={(event: EventPayload) => {
      const key = (event.key ?? '').toLowerCase()
      if (key === 'backspace') {
        if (char) {
          context.setCellValue(index, '', event)
          if (index > 0) context.focusCell(index - 1)
        } else if (index > 0) {
          context.setCellValue(index - 1, '', event)
          context.focusCell(index - 1)
        }
      } else if (key === 'delete') {
        if (char) context.setCellValue(index, '', event)
        else context.focusCell(index + 1)
      } else if (key === 'left') context.focusCell(index - 1)
      else if (key === 'right') context.focusCell(index + 1)
    }}
    style={mergeStyle({
      width: 36,
      height: 42,
      paddingLeft: wide ? 9 : 12,
      paddingRight: 0,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.borderStrong,
      backgroundColor: C.input,
      color: C.text,
      fontFamily: 'Menlo',
      fontSize: 15,
      opacity: context.disabled ? 0.5 : 1,
    }, props.style)}
  />
}

function OTPFieldSeparator(props: { style?: Style }) {
  const { tokens: C } = useTheme()
  return <div style={mergeStyle({ width: 1, height: 24, backgroundColor: C.border }, props.style)} />
}

function OTPFieldGroup(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }, props.style)}>{props.children}</div>
}

export const OTPField = Object.assign(OTPFieldRoot, { Root: OTPFieldRoot, Group: OTPFieldGroup, Input: OTPFieldInput, Separator: OTPFieldSeparator })

type CheckboxGroupContextValue = {
  value: string[]
  toggle: (item: string, checked: boolean) => void
  selectAll: (checked: boolean) => void
  allValues: string[]
  disabled: boolean
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null)

export function CheckboxGroupRoot(props: {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[], details: ChangeDetails) => void
  allValues?: string[]
  disabled?: boolean
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [value, setValue] = useControllableState<string[]>({
    value: props.value,
    defaultValue: props.defaultValue ?? [],
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const context = useMemo<CheckboxGroupContextValue>(() => ({
    value,
    toggle: (item, checked) => setValue(checked ? [...value.filter((entry) => entry !== item), item] : value.filter((entry) => entry !== item), 'trigger-press'),
    selectAll: (checked) => setValue(checked ? props.allValues ?? [] : [], 'trigger-press'),
    allValues: props.allValues ?? [],
    disabled: props.disabled ?? false,
  }), [value, setValue, props.allValues, props.disabled])
  return <CheckboxGroupContext.Provider value={context}>
    <div role="group" testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 8 }, props.style)}>{props.children}</div>
  </CheckboxGroupContext.Provider>
}

export function CheckboxRoot(props: {
  value?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean, details: ChangeDetails) => void
  indeterminate?: boolean
  parent?: boolean
  checkedValue?: string
  uncheckedValue?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  label?: ReactNode
  children?: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const { tokens: C } = useTheme()
  const group = useContext(CheckboxGroupContext)
  const isParent = props.parent ?? false
  const allValues = group?.allValues ?? []
  const [own, setOwn] = useControllableState<boolean>({
    value: props.checked,
    defaultValue: props.defaultChecked ?? false,
    onChange: (next, details) => props.onCheckedChange?.(next, details),
  })
  const itemValue = props.value ?? props.name ?? ''
  const groupState = group && itemValue
    ? { checked: group.value.includes(itemValue), indeterminate: false }
    : undefined
  const parentSelected = isParent ? allValues.filter((entry) => group?.value.includes(entry)).length : 0
  const parentState = isParent
    ? { checked: allValues.length > 0 && parentSelected === allValues.length, indeterminate: parentSelected > 0 && parentSelected < allValues.length }
    : undefined
  const state = parentState ?? groupState ?? { checked: own, indeterminate: props.indeterminate ?? false }
  const disabled = props.disabled ?? group?.disabled ?? false
  const toggle = (event: EventPayload) => {
    if (disabled || props.readOnly) return
    if (isParent && group) {
      group.selectAll(!(state.checked || state.indeterminate))
      return
    }
    if (group && itemValue) group.toggle(itemValue, !state.checked)
    else setOwn(!state.checked, 'trigger-press', event)
  }
  const { pressProps, hovered, focused } = usePress({ disabled, focusableWhenDisabled: true, role: 'checkbox', onPress: (event) => toggle(event) })
  const ariaProps = { 'aria-checked': state.indeterminate ? 'mixed' : state.checked }
  const boxStyle: Style = {
    width: 19,
    height: 19,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: state.checked || state.indeterminate ? C.primary : C.borderStrong,
    backgroundColor: state.checked || state.indeterminate ? C.primary : C.input,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
  const boxContent = <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
    {props.children ?? (state.indeterminate
      ? <text style={{ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 800, color: C.primaryForeground }}>−</text>
      : state.checked
        ? <text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 800, color: C.primaryForeground }}>✓</text>
        : null)}
  </div>
  if (props.label === undefined) {
    return <div {...pressProps} {...ariaProps} testId={props.testId} aria-label={props.ariaLabel} style={mergeStyle(boxStyle, props.style)}>{boxContent}</div>
  }
  return <div {...pressProps} {...ariaProps} testId={props.testId} aria-label={props.ariaLabel} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer' }, props.style)}>
    <div style={{ ...boxStyle, pointerEvents: 'none' }}>{boxContent}</div>
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.label}</text>
  </div>
}

export function CheckboxIndicator(props: { children?: ReactNode; keepMounted?: boolean; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 800, color: C.primaryForeground }, props.style)}>{props.children ?? '✓'}</text>
}

export const Checkbox = Object.assign(CheckboxRoot, { Root: CheckboxRoot, Indicator: CheckboxIndicator })
export const CheckboxGroup = Object.assign(CheckboxGroupRoot, { Root: CheckboxGroupRoot, Item: CheckboxRoot, Indicator: CheckboxIndicator })

type RadioGroupContextValue = {
  value: string | number | null
  setValue: (value: string | number, reason: OpenReason) => void
  disabled: boolean
  readOnly: boolean
  required: boolean
  register: ReturnType<typeof useRovingFocus>['register']
  keyDownFor: ReturnType<typeof useRovingFocus>['keyDownFor']
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function RadioGroupRoot(props: {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string | number, details: ChangeDetails) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  orientation?: 'horizontal' | 'vertical'
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [value, setValue] = useControllableState<string | number | null>({
    value: props.value === undefined ? undefined : props.value,
    defaultValue: props.defaultValue ?? null,
    onChange: (next, details) => { if (next !== null) props.onValueChange?.(next, details) },
  })
  const orientation = props.orientation ?? 'vertical'
  const { register, keyDownFor } = useRovingFocus({ orientation, loop: true })
  const context = useMemo<RadioGroupContextValue>(() => ({
    value, setValue: (next, reason) => setValue(next, reason),
    disabled: props.disabled ?? false, readOnly: props.readOnly ?? false, required: props.required ?? false,
    register, keyDownFor,
  }), [value, setValue, props.disabled, props.readOnly, props.required, register, keyDownFor])
  return <RadioGroupContext.Provider value={context}>
    <div role="radiogroup" testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: orientation === 'vertical' ? 'column' : 'row', gap: 8 }, props.style)}>{props.children}</div>
  </RadioGroupContext.Provider>
}

function RadioRoot(props: { value: string | number; disabled?: boolean; label?: ReactNode; children?: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const group = useContext(RadioGroupContext)
  if (!group) throw new Error('Radio.Root must be used inside RadioGroup.Root')
  const ref = useRef<Instance | null>(null)
  const indexRef = useRef(-1)
  const { register, keyDownFor } = group
  useEffect(() => { indexRef.current = register(ref) }, [register])
  const selected = group.value === props.value
  const disabled = props.disabled ?? group.disabled
  const { pressProps, hovered, focused } = usePress({
    disabled: disabled || group.readOnly,
    focusableWhenDisabled: true,
    role: 'radio',
    onPress: () => group.setValue(props.value, 'trigger-press'),
    onKeyDown: (event) => {
      const key = (event.key ?? '').toLowerCase()
      if (key === 'up' || key === 'down' || key === 'left' || key === 'right') {
        keyDownFor(indexRef.current)(event)
        group.setValue(props.value, 'list-navigation')
      }
    },
  })
  const ariaProps = { 'aria-checked': selected }
  const circleStyle: Style = {
    width: 18,
    height: 18,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: selected ? C.selected : C.input,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
  const circleContent = <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
    {props.children ?? (selected ? <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} /> : null)}
  </div>
  if (props.label === undefined) {
    return <div {...pressProps} {...ariaProps} ref={ref as never} testId={props.testId} aria-label={props.ariaLabel} style={mergeStyle(circleStyle, props.style)}>{circleContent}</div>
  }
  return <div {...pressProps} {...ariaProps} ref={ref as never} testId={props.testId} aria-label={props.ariaLabel} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer' }, props.style)}>
    <div style={{ ...circleStyle, pointerEvents: 'none' }}>{circleContent}</div>
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.label}</text>
  </div>
}

function RadioIndicator(props: { keepMounted?: boolean; style?: Style }) {
  const { tokens: C } = useTheme()
  return <div style={mergeStyle({ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }, props.style)} />
}

export const RadioGroup = Object.assign(RadioGroupRoot, { Root: RadioGroupRoot, Item: RadioRoot, Indicator: RadioIndicator })
export const Radio = Object.assign(RadioRoot, { Root: RadioRoot, Indicator: RadioIndicator })

const SwitchContext = createContext<{ checked: boolean } | null>(null)

export function SwitchRoot(props: {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean, details: ChangeDetails) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  value?: string
  uncheckedValue?: string
  label?: ReactNode
  children?: ReactNode
  style?: Style
  testId?: string
  ariaLabel?: string
}) {
  const { tokens: C } = useTheme()
  const [checked, setChecked] = useControllableState<boolean>({
    value: props.checked,
    defaultValue: props.defaultChecked ?? false,
    onChange: (next, details) => props.onCheckedChange?.(next, details),
  })
  const disabled = props.disabled ?? false
  const { pressProps, hovered, focused } = usePress({
    disabled,
    focusableWhenDisabled: true,
    role: 'switch',
    onPress: (event) => setChecked(!checked, 'trigger-press', event),
  })
  const ariaProps = { 'aria-checked': checked }
  const trackStyle: Style = {
    width: 40,
    height: 24,
    flexShrink: 0,
    padding: 3,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: checked ? C.primary : C.track,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  }
  const track = <div style={props.label === undefined ? mergeStyle(trackStyle, props.style) : { ...trackStyle, pointerEvents: 'none' }}>{props.children ?? <SwitchThumb />}</div>
  return <SwitchContext.Provider value={{ checked }}>
    {props.label === undefined
      ? <div {...pressProps} {...ariaProps} testId={props.testId} aria-label={props.ariaLabel} style={mergeStyle(trackStyle, props.style)}>{props.children ?? <SwitchThumb />}</div>
      : <div {...pressProps} {...ariaProps} testId={props.testId} aria-label={props.ariaLabel} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, cursor: disabled ? 'default' : 'pointer' }}>
          {track}
          <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{props.label}</text>
        </div>}
  </SwitchContext.Provider>
}

function SwitchThumb(props: { checked?: boolean }) {
  const { tokens: C } = useTheme()
  const context = useContext(SwitchContext)
  const checked = props.checked ?? context?.checked ?? false
  return <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.primaryForeground, marginLeft: checked ? 16 : 0, pointerEvents: 'none' }} />
}

export const Switch = Object.assign(SwitchRoot, { Root: SwitchRoot, Thumb: SwitchThumb })

type SliderContextValue = {
  values: number[]
  min: number
  max: number
  step: number
  largeStep: number
  minStepsBetweenValues: number
  orientation: 'horizontal' | 'vertical'
  disabled: boolean
  format: Intl.NumberFormatOptions | undefined
  locale: Intl.LocalesArgument | undefined
  trackRef: ElementRef
  setValueAt: (index: number, value: number, reason: OpenReason, event?: EventPayload) => void
  commit: (event?: EventPayload) => void
}

const SliderContext = createContext<SliderContextValue | null>(null)

function useSlider(name: string) {
  const context = useContext(SliderContext)
  if (!context) throw new Error(`${name} must be used inside Slider.Root`)
  return context
}

function SliderRoot(props: {
  value?: number | number[]
  defaultValue?: number | number[]
  onValueChange?: (value: number | number[], details: ChangeDetails) => void
  onValueCommitted?: (value: number | number[], details: ChangeDetails) => void
  min?: number
  max?: number
  step?: number
  largeStep?: number
  minStepsBetweenValues?: number
  orientation?: 'horizontal' | 'vertical'
  disabled?: boolean
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const multiple = Array.isArray(props.value) || Array.isArray(props.defaultValue)
  const toArray = (input: number | number[] | undefined, fallback: number[]) => {
    if (input === undefined) return fallback
    return Array.isArray(input) ? input : [input]
  }
  const [values, setValues] = useControllableState<number[]>({
    value: props.value === undefined ? undefined : toArray(props.value, [0]),
    defaultValue: toArray(props.defaultValue, [50]),
    onChange: (next, details) => props.onValueChange?.(multiple ? next : next[0], details),
  })
  const min = props.min ?? 0
  const max = props.max ?? 100
  const step = props.step ?? 1
  const largeStep = props.largeStep ?? step * 10
  const trackRef = useRef<Instance | null>(null)
  const commit = (event?: EventPayload) => {
    props.onValueCommitted?.(multiple ? values : values[0], { reason: 'drag', event, cancel: () => undefined, isCanceled: false })
  }
  const setValueAt = (index: number, raw: number, reason: OpenReason, event?: EventPayload) => {
    const minGap = (props.minStepsBetweenValues ?? 0) * step
    const lower = index > 0 ? values[index - 1] + minGap : min
    const upper = index < values.length - 1 ? values[index + 1] - minGap : max
    const snapped = clamp(Math.round((raw - min) / step) * step + min, lower, upper)
    const next = values.slice()
    next[index] = snapped
    setValues(next, reason, event)
  }
  const context = useMemo<SliderContextValue>(() => ({
    values, min, max, step, largeStep, minStepsBetweenValues: props.minStepsBetweenValues ?? 0,
    orientation: props.orientation ?? 'horizontal', disabled: props.disabled ?? false,
    format: props.format, locale: props.locale, trackRef, setValueAt, commit,
  }), [values, min, max, step, largeStep, props.minStepsBetweenValues, props.orientation, props.disabled, props.format, props.locale, setValueAt, commit])
  return <SliderContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }, props.style)}>{props.children}</div>
  </SliderContext.Provider>
}

function SliderLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 700, color: C.text }, props.style)}>{props.children}</text>
}

function SliderValue(props: { children?: ReactNode | ((formatted: string, value: number[]) => ReactNode); style?: Style }) {
  const { tokens: C } = useTheme()
  const slider = useSlider('Slider.Value')
  const formatted = slider.values.map((value) => formatNumber(value, slider.format, slider.locale)).join(' – ')
  const content = typeof props.children === 'function' ? props.children(formatted, slider.values) : props.children ?? formatted
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, color: C.muted }, props.style)}>{content}</text>
}

function SliderControl(props: { children: ReactNode; style?: Style }) {
  const slider = useSlider('Slider.Control')
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', height: 24, cursor: slider.disabled ? 'default' : 'pointer', opacity: slider.disabled ? 0.5 : 1, userSelect: 'none' }, props.style)}>{props.children}</div>
}

function SliderTrack(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const slider = useSlider('Slider.Track')
  const vertical = slider.orientation === 'vertical'
  const getBounds = useBounds(slider.trackRef)
  const valueFromEvent = (event: EventPayload) => {
    const bounds = getBounds()
    if (!bounds) return null
    const ratio = vertical
      ? 1 - ((event.y ?? 0) - bounds.y) / Math.max(1, bounds.height)
      : ((event.x ?? 0) - bounds.x) / Math.max(1, bounds.width)
    return slider.min + clamp(ratio, 0, 1) * (slider.max - slider.min)
  }
  const nearestIndex = (value: number) => {
    let best = 0
    let distance = Infinity
    slider.values.forEach((entry, index) => {
      const next = Math.abs(entry - value)
      if (next < distance) { distance = next; best = index }
    })
    return best
  }
  return <div
    ref={slider.trackRef as never}
    onMouseDown={(event: EventPayload) => {
      if (slider.disabled) return
      const value = valueFromEvent(event)
      if (value === null) return
      slider.setValueAt(nearestIndex(value), value, 'track-press', event)
    }}
    style={mergeStyle(vertical
      ? { position: 'relative', width: 6, height: 160, borderRadius: 3, backgroundColor: C.track, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }
      : { position: 'relative', flexGrow: 1, height: 6, borderRadius: 3, backgroundColor: C.track, display: 'flex', flexDirection: 'row' }, props.style)}
  >{props.children}</div>
}

function SliderIndicator(props: { style?: Style }) {
  const { tokens: C } = useTheme()
  const slider = useSlider('Slider.Indicator')
  const getBounds = useBounds(slider.trackRef)
  const value = slider.values[0]
  const ratio = ratioOf(value, slider.min, slider.max)
  const vertical = slider.orientation === 'vertical'
  const size = Math.round(ratio * ((vertical ? getBounds()?.height : getBounds()?.width) ?? 0))
  return <div style={mergeStyle(vertical
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: size, borderRadius: 3, backgroundColor: C.violet, pointerEvents: 'none' }
    : { position: 'absolute', top: 0, bottom: 0, left: 0, width: size, borderRadius: 3, backgroundColor: C.violet, pointerEvents: 'none' }, props.style)} />
}

function SliderThumb(props: { index?: number; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const slider = useSlider('Slider.Thumb')
  const index = props.index ?? 0
  const value = slider.values[index] ?? slider.min
  const ratio = ratioOf(value, slider.min, slider.max)
  const vertical = slider.orientation === 'vertical'
  const getBounds = useBounds(slider.trackRef)
  const bounds = getBounds()
  const dragRef = useRef<number | null>(null)
  const { renderer } = useGpuix()
  const boundsOf = (ref: ElementRef) => { const id = ref.current?.id; return id == null ? null : renderer?.getElementBounds?.(id) ?? null }
  const valueFromEvent = (event: EventPayload) => {
    const bounds = boundsOf(slider.trackRef)
    if (!bounds) return null
    const ratioNext = vertical
      ? 1 - ((event.y ?? 0) - bounds.y) / Math.max(1, bounds.height)
      : ((event.x ?? 0) - bounds.x) / Math.max(1, bounds.width)
    return slider.min + clamp(ratioNext, 0, 1) * (slider.max - slider.min)
  }
  const { pressProps } = usePress({
    disabled: slider.disabled,
    role: 'slider',
    onPress: () => undefined,
    onKeyDown: (event) => {
      const key = (event.key ?? '').toLowerCase()
      const big = event.modifiers?.shift
      const amount = big ? slider.largeStep : slider.step
      if (key === 'right' || key === 'up') slider.setValueAt(index, value + amount, 'keyboard', event)
      else if (key === 'left' || key === 'down') slider.setValueAt(index, value - amount, 'keyboard', event)
      else if (key === 'pageup') slider.setValueAt(index, value + slider.largeStep, 'keyboard', event)
      else if (key === 'pagedown') slider.setValueAt(index, value - slider.largeStep, 'keyboard', event)
      else if (key === 'home') slider.setValueAt(index, slider.min, 'keyboard', event)
      else if (key === 'end') slider.setValueAt(index, slider.max, 'keyboard', event)
    },
  })
  const ariaProps = { 'aria-valuetext': formatNumber(value, slider.format, slider.locale) }
  const { isDragging, dragProps } = useDrag({
    onStart: (event) => { dragRef.current = index; const next = valueFromEvent(event); if (next !== null) slider.setValueAt(index, next, 'drag', event) },
    onMove: (event) => { if (dragRef.current === null) return; const next = valueFromEvent(event); if (next !== null) slider.setValueAt(index, next, 'drag', event) },
    onEnd: (event) => { dragRef.current = null; slider.commit(event) },
  })
  return <div
    {...pressProps}
    {...dragProps}
    {...ariaProps}
    testId={props.testId}
    aria-label={props.ariaLabel}
    style={mergeStyle(vertical
      ? { position: 'absolute', left: Math.round((bounds?.width ?? 0) / 2) - 8, top: Math.round((1 - ratio) * (bounds?.height ?? 0)) - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.primaryForeground, borderWidth: 2, borderColor: C.violet, cursor: isDragging ? 'grabbing' : 'grab' }
      : { position: 'absolute', top: -5, left: Math.round(ratio * (bounds?.width ?? 0)) - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.primaryForeground, borderWidth: 2, borderColor: C.violet, cursor: isDragging ? 'grabbing' : 'grab' }, props.style)}
  />
}

export const Slider = Object.assign(SliderRoot, {
  Root: SliderRoot,
  Label: SliderLabel,
  Value: SliderValue,
  Control: SliderControl,
  Track: SliderTrack,
  Indicator: SliderIndicator,
  Thumb: SliderThumb,
})
