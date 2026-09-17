import { Children, type ReactNode } from 'react'
import { useTheme } from './theme-context'

const FONT = 'Helvetica'

export function Glyph({ children, color, size = 20 }: { children: string; color?: string; size?: number }) {
  const { tokens: C } = useTheme()
  return <text style={{ width: 24, fontFamily: FONT, fontSize: size, color: color ?? C.muted, textAlign: 'center' }}>{children}</text>
}

export function IconButton({ children, onClick, label, testId, variant = 'ghost' }: { children: string; onClick?: () => void; label: string; testId?: string; variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' }) {
  const { tokens: C } = useTheme()
  const background = variant === 'primary' ? C.primary : variant === 'destructive' ? C.red : variant === 'secondary' ? C.control : 'transparent'
  return <div testId={testId} role="button" aria-label={label} onClick={onClick} style={{ width: 34, height: 34, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: variant === 'ghost' ? 0 : 1, borderColor: C.borderStrong, backgroundColor: background, cursor: 'pointer', hover: { backgroundColor: variant === 'primary' ? C.violet : C.panelRaised } }}><Glyph color={variant === 'primary' || variant === 'destructive' ? C.primaryForeground : C.text} size={18}>{children}</Glyph></div>
}

export function Badge({ children, tone = 'neutral', width }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; width?: number | string }) {
  const { tokens: C } = useTheme()
  const tint = tone === 'success' ? C.green : tone === 'warning' ? C.orange : tone === 'danger' ? C.red : tone === 'info' ? C.violet : C.muted
  const parts = Children.toArray(children)
  const label = parts.every((part) => typeof part === 'string' || typeof part === 'number') ? parts.join('') : children
  return <div style={{ width, minWidth: width, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8, borderRadius: 6, backgroundColor: `${tint}18`, borderWidth: 1, borderColor: `${tint}55` }}><text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: tint, whiteSpace: 'nowrap' }}>{label}</text></div>
}

function CardRoot({ children, testId, style }: { children: ReactNode; testId?: string; style?: Record<string, unknown> }) {
  const { tokens: C } = useTheme()
  return <div testId={testId} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRadius: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...style }}>{children}</div>
}

function CardHeader({ title, description, icon, action }: { title: string; description?: string; icon?: string; action?: ReactNode }) {
  const { tokens: C } = useTheme()
  return <div style={{ minHeight: 58, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 16, borderBottomWidth: 1, borderColor: C.border }}>{icon ? <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: C.iconBg }}><Glyph color={C.violet} size={18}>{icon}</Glyph></div> : null}<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><text style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text }}>{title}</text>{description ? <text style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{description}</text> : null}</div><div style={{ flexGrow: 1 }} />{action}</div>
}

function CardContent({ children, gap = 13 }: { children: ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, padding: 16 }}>{children}</div>
}

export const Card = Object.assign(CardRoot, { Root: CardRoot, Header: CardHeader, Content: CardContent })
