import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { useGpuix } from '@gpuix/react'
import type { EventPayload } from '@gpuix/native'
import type { PublicInstance as Instance } from '@gpuix/react'
import { useTheme } from '../theme-context'
import {
  clamp, keyName, mergeStyle, useControllableState, useDismiss, usePress, useReturnFocus, useTypeahead,
  type ChangeDetails, type ElementRef, type OpenReason, type Style,
} from './foundations'
import { menuItemStyle, popupListStyle, useItemCollection, useItemRegistration, useListNavigation } from './surface'

export type ChooserItem = { value: string; label: string; disabled?: boolean }
export type ChooserGroup = { label: string; items: ChooserItem[] }
export type ChooserItems = readonly (ChooserItem | string | ChooserGroup)[]

function normalizeItems(items: ChooserItems | undefined): ChooserItem[] {
  if (!items) return []
  const result: ChooserItem[] = []
  items.forEach((entry) => {
    if (typeof entry === 'string') { result.push({ value: entry, label: entry }); return }
    if ('items' in entry) { entry.items.forEach((item) => result.push(item)); return }
    result.push(entry)
  })
  return result
}

function sameValue(a: unknown, b: unknown) {
  return a === b
}

type SelectContextValue = {
  value: string[]
  setValue: (value: string[], reason: OpenReason, event?: EventPayload) => void
  open: boolean
  setOpen: (open: boolean, reason: OpenReason, event?: EventPayload) => void
  multiple: boolean
  disabled: boolean
  readOnly: boolean
  items: ChooserItem[]
  collection: ReturnType<typeof useItemCollection>
  triggerRef: React.MutableRefObject<Instance | null>
  itemToStringLabel: (value: string) => string
}

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelect(name: string) {
  const context = useContext(SelectContext)
  if (!context) throw new Error(`${name} must be used inside Select.Root`)
  return context
}

function SelectRoot(props: {
  value?: string | string[] | null
  defaultValue?: string | string[] | null
  onValueChange?: (value: string | string[] | null, details: ChangeDetails) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  items?: ChooserItems
  multiple?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  highlightItemOnHover?: boolean
  isItemEqualToValue?: (itemValue: string, value: string) => boolean
  itemToStringLabel?: (itemValue: string) => string
  itemToStringValue?: (item: ChooserItem) => string
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const multiple = props.multiple ?? (Array.isArray(props.value) || Array.isArray(props.defaultValue))
  const toArray = (input: string | string[] | null | undefined): string[] => {
    if (input === null || input === undefined) return []
    return Array.isArray(input) ? input : [input]
  }
  const items = useMemo(() => normalizeItems(props.items), [props.items])
  const [value, setValue] = useControllableState<string[]>({
    value: props.value === undefined ? undefined : toArray(props.value),
    defaultValue: toArray(props.defaultValue),
    onChange: (next, details) => props.onValueChange?.(multiple ? next : next[0] ?? null, details),
  })
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const collection = useItemCollection()
  const triggerRef = useRef<Instance | null>(null)
  useReturnFocus(open, triggerRef)
  const context = useMemo<SelectContextValue>(() => ({
    value, setValue: (next, reason, event) => setValue(next, reason, event),
    open, setOpen: (next, reason, event) => setOpen(next, reason, event),
    multiple: multiple ?? false, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false,
    items, collection, triggerRef,
    itemToStringLabel: (itemValue) => {
      const item = items.find((entry) => (props.isItemEqualToValue ?? sameValue)(entry.value, itemValue))
      if (item) return item.label
      return props.itemToStringLabel ? props.itemToStringLabel(itemValue) : itemValue
    },
  }), [value, setValue, open, setOpen, multiple, props.disabled, props.readOnly, items, collection, props.isItemEqualToValue, props.itemToStringLabel])
  return <SelectContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }, props.style)}>{props.children}</div>
  </SelectContext.Provider>
}

function SelectLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 600, color: C.muted }, props.style)}>{props.children}</text>
}

function SelectTrigger(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string; disabled?: boolean }) {
  const { tokens: C } = useTheme()
  const select = useSelect('Select.Trigger')
  const disabled = props.disabled ?? select.disabled
  const { pressProps, hovered, focused } = usePress({
    disabled,
    focusableWhenDisabled: true,
    onPress: () => { if (!select.readOnly) select.setOpen(!select.open, 'trigger-press') },
    onKeyDown: (event) => {
      const key = keyName(event)
      if (key === 'down' || key === 'up') select.setOpen(true, 'list-navigation', event)
      if (key === 'escape') select.setOpen(false, 'escape-key', event)
      if (key === 'enter' || key === 'space') select.setOpen(!select.open, 'trigger-press', event)
    },
  })
  const ariaProps = { 'aria-expanded': select.open }
  return <div
    {...pressProps}
    {...ariaProps}
    ref={select.triggerRef as never}
    testId={props.testId}
    aria-label={props.ariaLabel}
    style={mergeStyle({
      minHeight: 42,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 13,
      paddingRight: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: focused || select.open ? C.primary : C.borderStrong,
      backgroundColor: hovered && !select.open ? C.panelRaised : C.input,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
    }, props.style)}
  >{props.children}</div>
}

function SelectValue(props: { placeholder?: string; children?: ReactNode | ((value: string | string[] | null) => ReactNode) }) {
  const { tokens: C } = useTheme()
  const select = useSelect('Select.Value')
  const current = select.multiple ? select.value : select.value[0] ?? null
  const content = typeof props.children === 'function'
    ? props.children(select.multiple ? select.value : current)
    : props.children ?? (select.value.length > 0
      ? (select.multiple ? select.value.map((entry) => select.itemToStringLabel(entry)).join(', ') : select.itemToStringLabel(select.value[0]))
      : props.placeholder ?? 'Select an option')
  const placeholder = select.value.length === 0
  const ariaProps = { 'aria-valuetext': typeof content === 'string' ? content : undefined }
  return <text {...ariaProps} style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, color: placeholder ? C.faint : C.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineClamp: 1 }}>{content}</text>
}

function SelectIcon(props: { children?: ReactNode }) {
  const { tokens: C } = useTheme()
  const select = useSelect('Select.Icon')
  return <text style={{ width: 18, fontFamily: 'Helvetica', fontSize: 15, color: select.open ? C.text : C.muted, textAlign: 'center' }}>{props.children ?? (select.open ? '⌃' : '⌄')}</text>
}

function SelectPortal(props: { children: ReactNode }) { return <>{props.children}</> }
function SelectPositioner(props: { children: ReactNode; side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; sideOffset?: number; alignOffset?: number }) {
  return <>{props.children}</>
}
function SelectBackdrop(props: { children?: ReactNode }) { return <>{props.children}</> }

function SelectPopup(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const select = useSelect('Select.Popup')
  const navigation = useListNavigation({
    collection: select.collection,
    onSelect: (item) => {
      const next = select.multiple
        ? (select.value.includes(item.value) ? select.value.filter((entry) => entry !== item.value) : [...select.value, item.value])
        : [item.value]
      select.setValue(next, 'item-press')
      if (!select.multiple) select.setOpen(false, 'item-press')
    },
  })
  const dismissProps = useDismiss({ enabled: select.open, onDismiss: (event) => select.setOpen(false, 'outside-press', event) })
  const listRef = useRef<Instance | null>(null)
  if (!select.open) return null
  return <anchored
    side="bottom"
    align="start"
    gap={7}
    fit="snap"
    snapMargin={8}
    deferred
    priority={3}
    occlude
    {...dismissProps}
    onKeyDown={(event: EventPayload) => {
      if (keyName(event) === 'escape') { select.setOpen(false, 'escape-key', event); return }
      navigation.onKeyDown(event)
    }}
  >
    <div
      ref={listRef as never}
      role="listbox"
      aria-label={props.ariaLabel}
      testId={props.testId}
      tabIndex={0}
      autoFocus
      style={mergeStyle(popupListStyle(C), {
        minWidth: 220,
        padding: 7,
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

function SelectList(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{props.children}</div>
}

function SelectItem(props: { value: string; label?: string; children: ReactNode; disabled?: boolean; icon?: string; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const select = useSelect('Select.Item')
  const [hovered, setHovered] = useState(false)
  const selected = select.value.includes(props.value)
  const selectRef = useRef(select)
  selectRef.current = select
  useItemRegistration(select.collection, {
    value: props.value,
    label: props.label ?? (typeof props.children === 'string' ? props.children : props.value),
    disabled: props.disabled,
    onActivate: (event) => {
      const current = selectRef.current
      const next = current.multiple
        ? (current.value.includes(props.value) ? current.value.filter((entry) => entry !== props.value) : [...current.value, props.value])
        : [props.value]
      current.setValue(next, 'item-press', event)
      if (!current.multiple) current.setOpen(false, 'item-press', event)
    },
  })
  const { pressProps } = usePress({
    disabled: props.disabled ?? select.disabled,
    onPress: (event) => {
      const next = select.multiple
        ? (selected ? select.value.filter((entry) => entry !== props.value) : [...select.value, props.value])
        : [props.value]
      select.setValue(next, 'item-press', event)
      if (!select.multiple) select.setOpen(false, 'item-press', event)
    },
  })
  const ariaProps = { 'aria-selected': selected }
  return <div
    {...pressProps}
    {...ariaProps}
    role="option"
    testId={props.testId}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={mergeStyle(menuItemStyle(C, { highlighted: hovered, selected, disabled: props.disabled }), props.style)}
  >
    {props.icon ? <text style={{ width: 22, fontSize: 15, textAlign: 'center' }}>{props.icon}</text> : null}
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, whiteSpace: 'nowrap', color: selected ? C.selectedForeground : C.text }}>{props.children}</text>
    {selected ? <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.primary }}>✓</text> : null}
  </div>
}

function SelectItemText(props: { children: ReactNode }) { return <>{props.children}</> }
function SelectItemIndicator(props: { children?: ReactNode; keepMounted?: boolean }) { return <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: '#7C3AED' }}>{props.children ?? '✓'}</text> }
function SelectGroup(props: { children: ReactNode; style?: Style }) { return <div role="group" style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{props.children}</div> }
function SelectGroupLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ paddingLeft: 8, paddingTop: 6, paddingBottom: 2, fontFamily: 'Helvetica', fontSize: 11, fontWeight: 700, color: C.faint }, props.style)}>{props.children}</text>
}
function SelectSeparator() {
  const { tokens: C } = useTheme()
  return <div role="separator" style={{ height: 1, marginTop: 3, marginBottom: 3, backgroundColor: C.border }} />
}
function SelectScrollArrow(props: { direction?: 'up' | 'down'; keepMounted?: boolean; children?: ReactNode }) { return null }

export const Select = Object.assign(SelectRoot, {
  Root: SelectRoot,
  Label: SelectLabel,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Backdrop: SelectBackdrop,
  Portal: SelectPortal,
  Positioner: SelectPositioner,
  Popup: SelectPopup,
  Content: SelectPopup,
  List: SelectList,
  Arrow: SelectIcon,
  Item: SelectItem,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
  Separator: SelectSeparator,
  ScrollUpArrow: SelectScrollArrow,
  ScrollDownArrow: SelectScrollArrow,
})

type FilterableMode = 'autocomplete' | 'combobox'

type FilterableContextValue = {
  mode: FilterableMode
  value: string[]
  setValue: (value: string[], reason: OpenReason, event?: EventPayload) => void
  query: string
  setQuery: (query: string, event?: EventPayload) => void
  open: boolean
  setOpen: (open: boolean, reason: OpenReason, event?: EventPayload) => void
  multiple: boolean
  disabled: boolean
  readOnly: boolean
  items: ChooserItem[]
  filtered: ChooserItem[]
  collection: ReturnType<typeof useItemCollection>
  inputRef: React.MutableRefObject<Instance | null>
  itemToStringLabel: (value: string) => string
  openOnInputClick: boolean
  autoHighlight: boolean
}

const FilterableContext = createContext<FilterableContextValue | null>(null)

function useFilterable(name: string) {
  const context = useContext(FilterableContext)
  if (!context) throw new Error(`${name} must be used inside its Root`)
  return context
}

function defaultFilter(items: ChooserItem[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items.filter((item) => item.label.toLowerCase().includes(needle) || item.value.toLowerCase().includes(needle))
}

function FilterableRoot(props: {
  mode: FilterableMode
  multiple?: boolean
  items?: ChooserItems
  filteredItems?: ChooserItem[]
  filter?: ((item: ChooserItem, query: string) => boolean) | null
  value?: string | string[] | null
  defaultValue?: string | string[] | null
  onValueChange?: (value: string | string[] | null, details: ChangeDetails) => void
  inputValue?: string
  defaultInputValue?: string
  onInputValueChange?: (value: string, details: ChangeDetails) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
  openOnInputClick?: boolean
  autoHighlight?: boolean | 'always'
  keepHighlight?: boolean
  loopFocus?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  limit?: number
  grid?: boolean
  inline?: boolean
  virtualized?: boolean
  locale?: Intl.LocalesArgument
  isItemEqualToValue?: (itemValue: string, value: string) => boolean
  itemToStringLabel?: (itemValue: string) => string
  itemToStringValue?: (item: ChooserItem) => string
  onItemHighlighted?: (value: string | undefined, details: { reason: OpenReason; event?: EventPayload }) => void
  onOpenChangeComplete?: (open: boolean) => void
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const multiple = props.multiple ?? (Array.isArray(props.value) || Array.isArray(props.defaultValue))
  const toArray = (input: string | string[] | null | undefined): string[] => {
    if (input === null || input === undefined) return []
    return Array.isArray(input) ? input : [input]
  }
  const items = useMemo(() => normalizeItems(props.items), [props.items])
  const [value, setValue] = useControllableState<string[]>({
    value: props.value === undefined ? undefined : toArray(props.value),
    defaultValue: toArray(props.defaultValue),
    onChange: (next, details) => props.onValueChange?.(multiple ? next : next[0] ?? null, details),
  })
  const [query, setQuery] = useControllableState<string>({
    value: props.inputValue,
    defaultValue: props.defaultInputValue ?? '',
    onChange: (next, details) => props.onInputValueChange?.(next, details),
  })
  const [open, setOpen] = useControllableState<boolean>({
    value: props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next, details) => props.onOpenChange?.(next, details),
  })
  const collection = useItemCollection()
  const inputRef = useRef<Instance | null>(null)
  const filtered = useMemo(() => {
    if (props.filteredItems) return props.filteredItems
    const limited = props.limit !== undefined && props.limit >= 0 ? items.slice(0, props.limit) : items
    if (props.filter === null) return limited
    if (props.filter) return limited.filter((item) => props.filter?.(item, query))
    return defaultFilter(limited, query)
  }, [items, props.filteredItems, props.filter, props.limit, query])
  const context = useMemo<FilterableContextValue>(() => ({
    mode: props.mode, value, setValue: (next, reason, event) => setValue(next, reason, event),
    query, setQuery: (next, event) => setQuery(next, 'input-change', event),
    open, setOpen: (next, reason, event) => setOpen(next, reason, event),
    multiple: multiple ?? false, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false,
    items, filtered, collection, inputRef,
    itemToStringLabel: (itemValue) => {
      const item = items.find((entry) => (props.isItemEqualToValue ?? sameValue)(entry.value, itemValue))
      if (item) return item.label
      return props.itemToStringLabel ? props.itemToStringLabel(itemValue) : itemValue
    },
    openOnInputClick: props.openOnInputClick ?? props.mode === 'combobox',
    autoHighlight: props.autoHighlight === true || props.autoHighlight === 'always',
  }), [props.mode, value, setValue, query, setQuery, open, setOpen, multiple, props.disabled, props.readOnly, items, filtered, collection, props.isItemEqualToValue, props.itemToStringLabel, props.openOnInputClick, props.autoHighlight])
  return <FilterableContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }, props.style)}>{props.children}</div>
  </FilterableContext.Provider>
}

function FilterableLabel(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <text style={mergeStyle({ fontFamily: 'Helvetica', fontSize: 12, fontWeight: 600, color: C.muted }, props.style)}>{props.children}</text>
}

function FilterableInputGroup(props: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('InputGroup')
  const { pressProps, hovered, focused } = usePress({
    disabled: filterable.disabled,
    focusableWhenDisabled: true,
    onPress: () => { if (filterable.openOnInputClick && !filterable.readOnly) filterable.setOpen(true, 'trigger-press') },
  })
  return <div
    {...pressProps}
    style={mergeStyle({
      minHeight: 40,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 10,
      paddingRight: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: focused || filterable.open ? C.primary : hovered ? C.borderStrong : C.border,
      backgroundColor: C.input,
      opacity: filterable.disabled ? 0.5 : 1,
      cursor: filterable.disabled ? 'default' : 'text',
    }, props.style)}
  >{props.children}</div>
}

function FilterableInput(props: { placeholder?: string; style?: Style; testId?: string; ariaLabel?: string; disabled?: boolean; autoFocus?: boolean }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Input')
  const navigation = useListNavigation({
    collection: filterable.collection,
    onSelect: (item, event) => selectFilterableItem(filterable, item, event),
    enabled: filterable.open,
  })
  const disabled = props.disabled ?? filterable.disabled
  return <input
    ref={filterable.inputRef as never}
    testId={props.testId}
    aria-label={props.ariaLabel}
    autoFocus={props.autoFocus}
    value={filterable.query}
    placeholder={props.placeholder}
    readOnly={disabled || filterable.readOnly}
    tabIndex={disabled ? -1 : 0}
    onFocus={() => { if (filterable.openOnInputClick && !filterable.readOnly) filterable.setOpen(true, 'trigger-focus') }}
    onChange={(event: EventPayload) => {
      filterable.setQuery(event.value ?? '', event)
      if (!filterable.open && (event.value ?? '').length > 0) filterable.setOpen(true, 'input-change', event)
    }}
    onKeyDown={(event: EventPayload) => {
      const key = keyName(event)
      if (key === 'escape') { filterable.setOpen(false, 'escape-key', event); return }
      if (key === 'down' || key === 'up') {
        if (!filterable.open) { filterable.setOpen(true, 'list-navigation', event); return }
        navigation.onKeyDown(event)
        return
      }
      if (key === 'enter') { navigation.onKeyDown(event); return }
      if (key === 'backspace' && filterable.multiple && filterable.query.length === 0 && filterable.value.length > 0) {
        filterable.setValue(filterable.value.slice(0, -1), 'input-clear', event)
      }
    }}
    style={mergeStyle({
      flexGrow: 1,
      minWidth: 80,
      height: 36,
      borderWidth: 0,
      backgroundColor: 'transparent',
      color: C.text,
      fontFamily: 'Helvetica',
      fontSize: 13,
    }, props.style)}
  />
}

function selectFilterableItem(filterable: FilterableContextValue, item: { value: string }, event?: EventPayload) {
  if (filterable.multiple) {
    const next = filterable.value.includes(item.value)
      ? filterable.value.filter((entry) => entry !== item.value)
      : [...filterable.value, item.value]
    filterable.setValue(next, 'item-press', event)
    filterable.setQuery('', event)
    return
  }
  filterable.setValue([item.value], 'item-press', event)
  filterable.setQuery(filterable.itemToStringLabel(item.value), event)
  filterable.setOpen(false, 'item-press', event)
}

function FilterableTrigger(props: { children?: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Trigger')
  const { pressProps } = usePress({
    disabled: filterable.disabled,
    focusableWhenDisabled: true,
    onPress: () => filterable.setOpen(!filterable.open, 'trigger-press'),
  })
  const ariaProps = { 'aria-expanded': filterable.open }
  return <div {...pressProps} {...ariaProps} testId={props.testId} aria-label={props.ariaLabel} style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, cursor: 'pointer', hover: { backgroundColor: C.control } }, props.style)}>
    {props.children ?? <text style={{ fontFamily: 'Helvetica', fontSize: 14, color: C.muted }}>{filterable.open ? '⌃' : '⌄'}</text>}
  </div>
}

function FilterableIcon(props: { children?: ReactNode }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Icon')
  return <text style={{ width: 18, fontFamily: 'Helvetica', fontSize: 14, color: filterable.open ? C.text : C.muted, textAlign: 'center' }}>{props.children ?? '⌄'}</text>
}

function FilterableClear(props: { children?: ReactNode; keepMounted?: boolean; testId?: string }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Clear')
  const { pressProps, hovered } = usePress({
    disabled: filterable.disabled || filterable.readOnly,
    onPress: (event) => { filterable.setValue([], 'input-clear', event); filterable.setQuery('', event) },
  })
  if (filterable.value.length === 0 && !props.keepMounted) return null
  return <div {...pressProps} testId={props.testId} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: hovered ? C.control : 'transparent', cursor: 'pointer' }}>
    {props.children ?? <text style={{ fontFamily: 'Helvetica', fontSize: 14, color: C.muted }}>×</text>}
  </div>
}

function FilterableValue(props: { children?: ReactNode | ((value: string | string[] | null) => ReactNode) }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Value')
  const content = typeof props.children === 'function'
    ? props.children(filterable.multiple ? filterable.value : filterable.value[0] ?? null)
    : props.children ?? (filterable.value.length > 0
      ? filterable.value.map((entry) => filterable.itemToStringLabel(entry)).join(', ')
      : null)
  if (content === null || content === undefined) return null
  return <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.text }}>{content}</text>
}

function FilterableChips(props: { children?: ReactNode; style?: Style }) {
  const filterable = useFilterable('Chips')
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 5, flexGrow: 1, minWidth: 0 }, props.style)}>
    {props.children ?? filterable.value.map((entry) => (
      <FilterableChip key={entry} value={entry}>{filterable.itemToStringLabel(entry)}</FilterableChip>
    ))}
  </div>
}

function FilterableChip(props: { value: string; children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Chip')
  return <div style={mergeStyle({ height: 24, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 4, borderRadius: 6, backgroundColor: C.selected, borderWidth: 1, borderColor: `${C.violet}55` }, props.style)}>
    <text style={{ fontFamily: 'Helvetica', fontSize: 11, fontWeight: 600, color: C.selectedForeground }}>{props.children ?? props.value}</text>
    <FilterableChipRemove value={props.value} />
  </div>
}

function FilterableChipRemove(props: { value: string; children?: ReactNode; testId?: string }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('ChipRemove')
  const { pressProps, hovered } = usePress({
    disabled: filterable.disabled || filterable.readOnly,
    onPress: (event) => filterable.setValue(filterable.value.filter((entry) => entry !== props.value), 'input-clear', event),
  })
  return <div {...pressProps} testId={props.testId} style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: hovered ? C.control : 'transparent', cursor: 'pointer' }}>
    {props.children ?? <text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.selectedForeground }}>×</text>}
  </div>
}

function FilterablePortal(props: { children: ReactNode }) { return <>{props.children}</> }
function FilterableBackdrop(props: { children?: ReactNode }) { return <>{props.children}</> }
function FilterablePositioner(props: { children: ReactNode; side?: string; align?: string; sideOffset?: number }) { return <>{props.children}</> }

function FilterablePopup(props: { children: ReactNode; style?: Style; testId?: string; ariaLabel?: string }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Popup')
  const navigation = useListNavigation({
    collection: filterable.collection,
    onSelect: (item, event) => selectFilterableItem(filterable, item, event),
  })
  const dismissProps = useDismiss({ enabled: filterable.open, onDismiss: (event) => filterable.setOpen(false, 'outside-press', event) })
  if (!filterable.open) return null
  return <anchored
    side="bottom"
    align="start"
    gap={7}
    fit="snap"
    deferred
    priority={3}
    occlude
    {...dismissProps}
    onKeyDown={(event: EventPayload) => {
      if (keyName(event) === 'escape') { filterable.setOpen(false, 'escape-key', event); return }
      navigation.onKeyDown(event)
    }}
  >
    <div
      role="listbox"
      aria-label={props.ariaLabel}
      testId={props.testId}
      tabIndex={0}
      autoFocus={filterable.mode === 'combobox' ? false : true}
      style={mergeStyle(popupListStyle(C), {
        minWidth: 240,
        padding: 7,
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

function FilterableArrow() { return null }

function FilterableStatus(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Status')
  return <text style={mergeStyle({ padding: 10, fontFamily: 'Helvetica', fontSize: 11, color: C.faint }, props.style)}>
    {props.children ?? (filterable.filtered.length === 0 ? 'No results found.' : `${filterable.filtered.length} results available.`)}
  </text>
}

function FilterableEmpty(props: { children?: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Empty')
  if (filterable.filtered.length > 0) return null
  return <text style={mergeStyle({ padding: 12, fontFamily: 'Helvetica', fontSize: 12, color: C.faint }, props.style)}>{props.children ?? 'No results'}</text>
}

function FilterableList(props: { children?: ReactNode | ((item: ChooserItem, index: number) => ReactNode); style?: Style }) {
  const filterable = useFilterable('List')
  const render = props.children
  let content: ReactNode
  if (typeof render === 'function') content = filterable.filtered.map((item, index) => render(item, index))
  else content = render ?? filterable.filtered.map((item) => <FilterableItem key={item.value} value={item.value}>{item.label}</FilterableItem>)
  return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{content}</div>
}

function FilterableRow(props: { children: ReactNode; style?: Style }) { return <div role="row" style={mergeStyle({ display: 'flex', flexDirection: 'row', gap: 3 }, props.style)}>{props.children}</div> }

function FilterableItem(props: { value: string; label?: string; index?: number; disabled?: boolean; children: ReactNode; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const filterable = useFilterable('Item')
  const [hovered, setHovered] = useState(false)
  const selected = filterable.value.includes(props.value)
  const filterableRef = useRef(filterable)
  filterableRef.current = filterable
  useItemRegistration(filterable.collection, {
    value: props.value,
    label: props.label ?? (typeof props.children === 'string' ? props.children : props.value),
    disabled: props.disabled,
    onActivate: (event) => selectFilterableItem(filterableRef.current, { value: props.value }, event),
  })
  const { pressProps } = usePress({
    disabled: props.disabled ?? filterable.disabled,
    onPress: (event) => selectFilterableItem(filterable, { value: props.value }, event),
  })
  const ariaProps = { 'aria-selected': selected }
  return <div
    {...pressProps}
    {...ariaProps}
    role="option"
    testId={props.testId}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={mergeStyle(menuItemStyle(C, { highlighted: hovered, selected, disabled: props.disabled }), props.style)}
  >
    <text style={{ flexGrow: 1, fontFamily: 'Helvetica', fontSize: 13, whiteSpace: 'nowrap', color: selected ? C.selectedForeground : C.text }}>{props.children}</text>
    {selected ? <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: C.primary }}>✓</text> : null}
  </div>
}

function FilterableItemIndicator(props: { children?: ReactNode; keepMounted?: boolean }) { return <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: '#7C3AED' }}>{props.children ?? '✓'}</text> }
function FilterableSeparator() { const { tokens: C } = useTheme(); return <div role="separator" style={{ height: 1, marginTop: 3, marginBottom: 3, backgroundColor: C.border }} /> }
function FilterableGroup(props: { children: ReactNode; items?: ChooserItem[]; style?: Style }) { return <div role="group" style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 3 }, props.style)}>{props.children}</div> }
function FilterableGroupLabel(props: { children: ReactNode; style?: Style }) { const { tokens: C } = useTheme(); return <text style={mergeStyle({ paddingLeft: 8, paddingTop: 6, paddingBottom: 2, fontFamily: 'Helvetica', fontSize: 11, fontWeight: 700, color: C.faint }, props.style)}>{props.children}</text> }
function FilterableCollection(props: { children?: ReactNode | ((item: ChooserItem, index: number) => ReactNode) }) { return <>{typeof props.children === 'function' ? null : props.children}</> }

const filterableParts = {
  Label: FilterableLabel,
  InputGroup: FilterableInputGroup,
  Input: FilterableInput,
  Trigger: FilterableTrigger,
  Icon: FilterableIcon,
  Clear: FilterableClear,
  Value: FilterableValue,
  Chips: FilterableChips,
  Chip: FilterableChip,
  ChipRemove: FilterableChipRemove,
  Portal: FilterablePortal,
  Backdrop: FilterableBackdrop,
  Positioner: FilterablePositioner,
  Popup: FilterablePopup,
  Arrow: FilterableArrow,
  Status: FilterableStatus,
  Empty: FilterableEmpty,
  List: FilterableList,
  Row: FilterableRow,
  Item: FilterableItem,
  ItemIndicator: FilterableItemIndicator,
  Separator: FilterableSeparator,
  Group: FilterableGroup,
  GroupLabel: FilterableGroupLabel,
  Collection: FilterableCollection,
}

function AutocompleteRoot(props: Omit<Parameters<typeof FilterableRoot>[0], 'mode'>) {
  return <FilterableRoot {...props} mode="autocomplete" />
}

function ComboboxRoot(props: Omit<Parameters<typeof FilterableRoot>[0], 'mode'>) {
  return <FilterableRoot {...props} mode="combobox" openOnInputClick={props.openOnInputClick ?? true} />
}

export const Autocomplete = Object.assign(AutocompleteRoot, { Root: AutocompleteRoot, ...filterableParts })
export const Combobox = Object.assign(ComboboxRoot, { Root: ComboboxRoot, ...filterableParts })

type NavigationMenuContextValue = {
  value: string | null
  setValue: (value: string | null, reason: OpenReason, event?: EventPayload) => void
  delay: number
  closeDelay: number
  orientation: 'horizontal' | 'vertical'
}

const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null)

function useNavigationMenu(name: string) {
  const context = useContext(NavigationMenuContext)
  if (!context) throw new Error(`${name} must be used inside NavigationMenu.Root`)
  return context
}

function NavigationMenuRoot(props: {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, details: ChangeDetails) => void
  delay?: number
  closeDelay?: number
  orientation?: 'horizontal' | 'vertical'
  children: ReactNode
  style?: Style
  testId?: string
}) {
  const [value, setValue] = useControllableState<string | null>({
    value: props.value === undefined ? undefined : props.value,
    defaultValue: props.defaultValue ?? null,
    onChange: (next, details) => props.onValueChange?.(next, details),
  })
  const context = useMemo<NavigationMenuContextValue>(() => ({
    value, setValue: (next, reason, event) => setValue(next, reason, event),
    delay: props.delay ?? 50, closeDelay: props.closeDelay ?? 50, orientation: props.orientation ?? 'horizontal',
  }), [value, setValue, props.delay, props.closeDelay, props.orientation])
  return <NavigationMenuContext.Provider value={context}>
    <div testId={props.testId} style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }, props.style)}>{props.children}</div>
  </NavigationMenuContext.Provider>
}

function NavigationMenuList(props: { children: ReactNode; style?: Style }) {
  return <div role="menubar" style={mergeStyle({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }, props.style)}>{props.children}</div>
}

function NavigationMenuItem(props: { children: ReactNode; style?: Style }) {
  return <div style={mergeStyle({ position: 'relative', display: 'flex', flexDirection: 'column' }, props.style)}>{props.children}</div>
}

function NavigationMenuTrigger(props: { children: ReactNode; value?: string; disabled?: boolean; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const menu = useNavigationMenu('NavigationMenu.Trigger')
  const itemValue = props.value ?? (typeof props.children === 'string' ? props.children : '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clear, [])
  const active = menu.value === itemValue
  const { pressProps, hovered, focused } = usePress({
    disabled: props.disabled,
    focusableWhenDisabled: true,
    onPress: () => menu.setValue(active ? null : itemValue, 'trigger-press'),
    onKeyDown: (event) => { if (keyName(event) === 'escape') menu.setValue(null, 'escape-key', event) },
  })
  const ariaProps = { 'aria-expanded': active }
  return <div
    {...pressProps}
    {...ariaProps}
    testId={props.testId}
    onMouseEnter={() => { clear(); timer.current = setTimeout(() => menu.setValue(itemValue, 'trigger-hover'), menu.delay) }}
    onMouseLeave={() => { clear(); timer.current = setTimeout(() => { if (menu.value === itemValue) menu.setValue(null, 'trigger-hover') }, menu.closeDelay) }}
    style={mergeStyle({
      minHeight: 34,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 8,
      backgroundColor: active ? C.selected : hovered ? C.control : 'transparent',
      borderWidth: focused ? 1 : 0,
      borderColor: C.primary,
      cursor: 'pointer',
      userSelect: 'none',
    }, props.style)}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.selectedForeground : C.text }}>{props.children}</text>
    <NavigationMenuIcon />
  </div>
}

function NavigationMenuIcon(props: { children?: ReactNode }) {
  const { tokens: C } = useTheme()
  return <text style={{ fontFamily: 'Helvetica', fontSize: 11, color: C.muted }}>{props.children ?? '⌄'}</text>
}

function NavigationMenuContent(props: { value?: string; children: ReactNode; style?: Style; testId?: string; keepMounted?: boolean }) {
  const { tokens: C } = useTheme()
  const menu = useNavigationMenu('NavigationMenu.Content')
  const itemValue = props.value ?? ''
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clear, [])
  const active = menu.value === itemValue
  if (!active && !props.keepMounted) return null
  return <anchored side="bottom" align="start" gap={5} deferred priority={3} occlude>
    <div
      role="region"
      testId={props.testId}
      onMouseEnter={() => clear()}
      onMouseLeave={() => { clear(); timer.current = setTimeout(() => { if (menu.value === itemValue) menu.setValue(null, 'trigger-hover') }, menu.closeDelay) }}
      style={mergeStyle({
        display: active ? 'flex' : 'none',
        flexDirection: 'column',
        gap: 6,
        minWidth: 200,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.panelRaised,
        boxShadow: { offsetX: 0, offsetY: 10, blurRadius: 28, spreadRadius: 0, color: C.shadow },
      }, props.style)}
    >{props.children}</div>
  </anchored>
}

function NavigationMenuLink(props: { children: ReactNode; active?: boolean; closeOnClick?: boolean; onClick?: () => void; style?: Style; testId?: string }) {
  const { tokens: C } = useTheme()
  const menu = useNavigationMenu('NavigationMenu.Link')
  const { pressProps, hovered, focused } = usePress({
    onPress: () => { props.onClick?.(); if (props.closeOnClick !== false) menu.setValue(null, 'item-press') },
  })
  return <div
    {...pressProps}
    testId={props.testId}
    style={mergeStyle({
      minHeight: 32,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 10,
      paddingRight: 10,
      borderRadius: 7,
      backgroundColor: props.active ? C.selected : hovered ? C.control : 'transparent',
      borderWidth: focused ? 1 : 0,
      borderColor: C.primary,
      cursor: 'pointer',
    }, props.style)}
  >
    <text style={{ fontFamily: 'Helvetica', fontSize: 13, color: props.active ? C.selectedForeground : C.text }}>{props.children}</text>
  </div>
}

function NavigationMenuViewport(props: { children: ReactNode; style?: Style }) { return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6 }, props.style)}>{props.children}</div> }
function NavigationMenuPortal(props: { children: ReactNode }) { return <>{props.children}</> }
function NavigationMenuBackdrop(props: { children?: ReactNode }) { return <>{props.children}</> }
function NavigationMenuPositioner(props: { children: ReactNode }) { return <>{props.children}</> }
function NavigationMenuPopup(props: { children: ReactNode; style?: Style }) { return <div style={mergeStyle({ display: 'flex', flexDirection: 'column', gap: 6 }, props.style)}>{props.children}</div> }
function NavigationMenuArrow() { return null }

export const NavigationMenu = Object.assign(NavigationMenuRoot, {
  Root: NavigationMenuRoot,
  List: NavigationMenuList,
  Item: NavigationMenuItem,
  Trigger: NavigationMenuTrigger,
  Icon: NavigationMenuIcon,
  Content: NavigationMenuContent,
  Link: NavigationMenuLink,
  Viewport: NavigationMenuViewport,
  Portal: NavigationMenuPortal,
  Backdrop: NavigationMenuBackdrop,
  Positioner: NavigationMenuPositioner,
  Popup: NavigationMenuPopup,
  Arrow: NavigationMenuArrow,
})
