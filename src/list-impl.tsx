import { type ReactNode } from 'react'
import { Badge, useTheme } from './index-internal'

type Style = Record<string, unknown>
type ListDensity = 'compact' | 'comfortable'

function ListRoot({ children, style }: { children: ReactNode; style?: Style }) {
  const { tokens: C } = useTheme()
  return <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, borderRadius: 10, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...style }}>{children}</div>
}

function ListHeader({ title, description, count, action }: { title: string; description?: string; count?: ReactNode; action?: ReactNode }) {
  const { tokens: C } = useTheme()
  return <div style={{ minHeight: 60, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 16, borderBottomWidth: 1, borderColor: C.border }}><div style={{ minWidth: 0, flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}><text style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title}</text>{description ? <text style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{description}</text> : null}</div>{count ? <Badge tone="neutral">{count}</Badge> : null}{action ? <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>{action}</div> : null}</div>
}

function ListToolbar({ children }: { children: ReactNode }) {
  const { tokens: C } = useTheme()
  return <div style={{ minHeight: 48, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 12, backgroundColor: C.control, borderBottomWidth: 1, borderColor: C.border }}>{children}</div>
}

function ListItem({ children, selected = false, disabled = false, density = 'comfortable', onClick, testId, style }: { children: ReactNode; selected?: boolean; disabled?: boolean; density?: ListDensity; onClick?: () => void; testId?: string; style?: Style }) {
  const { tokens: C } = useTheme()
  const height = density === 'compact' ? 52 : 68
  return <div testId={testId} role="listitem" aria-selected={selected} aria-disabled={disabled} onClick={disabled ? undefined : onClick} style={{ width: '100%', height, minHeight: height, maxHeight: height, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 14, backgroundColor: selected ? C.selected : C.panel, borderBottomWidth: 1, borderColor: C.border, overflow: 'hidden', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer', hover: disabled ? undefined : { backgroundColor: selected ? C.selected : C.panelRaised }, ...style }}>
    {children}
  </div>
}

function ListItemLeading({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }) {
  const { tokens: C } = useTheme()
  const color = tone === 'info' ? C.violet : tone === 'success' ? C.green : tone === 'warning' ? C.orange : tone === 'danger' ? C.red : C.muted
  return <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}44` }}><text style={{ fontSize: 16, color }}>{children}</text></div>
}

function ListItemContent({ children }: { children: ReactNode }) { return <div style={{ height: 42, maxHeight: 42, flexGrow: 1, flexShrink: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>{children}</div> }
function ListItemTitle({ children }: { children: ReactNode }) { const { tokens: C } = useTheme(); return <text style={{ height: 19, maxHeight: 19, fontSize: 13, fontWeight: 700, color: C.text, textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineClamp: 1 }}>{children}</text> }
function ListItemDescription({ children }: { children: ReactNode }) { const { tokens: C } = useTheme(); return <text style={{ height: 16, maxHeight: 16, fontSize: 11, color: C.muted, textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineClamp: 1 }}>{children}</text> }
function ListItemMeta({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) { const { tokens: C } = useTheme(); return <div style={{ width: 170, minWidth: 170, height: 30, maxHeight: 30, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', whiteSpace: 'nowrap' }}>{children ?? <text style={{ color: C.faint }}>—</text>}</div> }
function ListItemActions({ children }: { children: ReactNode }) { return <div style={{ width: 102, minWidth: 102, height: 30, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' }}>{children}</div> }
function ListSeparator() { const { tokens: C } = useTheme(); return <div role="separator" style={{ height: 1, flexShrink: 0, backgroundColor: C.border }} /> }
function ListSection({ title, children }: { title: string; children: ReactNode }) { const { tokens: C } = useTheme(); return <div style={{ display: 'flex', flexDirection: 'column' }}><text style={{ minHeight: 30, display: 'flex', alignItems: 'center', paddingLeft: 14, backgroundColor: C.control, fontSize: 11, fontWeight: 800, color: C.muted }}>{title}</text>{children}</div> }
function ListEmpty({ title = '暂无数据', description, action }: { title?: string; description?: string; action?: ReactNode }) { const { tokens: C } = useTheme(); return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 46, paddingBottom: 46 }}><text style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{title}</text>{description ? <text style={{ fontSize: 11, color: C.muted }}>{description}</text> : null}{action}</div> }
function ListLoading({ label = '正在加载…' }: { label?: string }) { const { tokens: C } = useTheme(); return <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingTop: 32, paddingBottom: 32 }}><div style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.primary }} /><text style={{ fontSize: 12, color: C.muted }}>{label}</text></div> }

export const List = Object.assign(ListRoot, { Root: ListRoot, Header: ListHeader, Toolbar: ListToolbar, Item: ListItem, ItemLeading: ListItemLeading, ItemContent: ListItemContent, ItemTitle: ListItemTitle, ItemDescription: ListItemDescription, ItemMeta: ListItemMeta, ItemActions: ListItemActions, Section: ListSection, Separator: ListSeparator, Empty: ListEmpty, Loading: ListLoading })

export type { ListDensity }
