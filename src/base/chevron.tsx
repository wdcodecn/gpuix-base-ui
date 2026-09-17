import { useTheme } from '../theme-context'
import { mergeStyle, type Style } from './foundations'

export function Chevron(props: { open?: boolean; size?: number; color?: string; style?: Style }) {
  const { tokens: C } = useTheme()
  return <div style={mergeStyle({
    width: 16,
    height: 16,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  }, props.style)}>
    <text style={{
      fontFamily: 'Helvetica',
      fontSize: props.size ?? 11,
      lineHeight: 16,
      textAlign: 'center',
      color: props.color ?? (props.open ? C.text : C.muted),
    }}>{props.open ? '▴' : '▾'}</text>
  </div>
}
