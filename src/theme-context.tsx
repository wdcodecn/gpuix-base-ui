import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export type ThemeTokens = {
  canvas: string
  sidebar: string
  panel: string
  panelRaised: string
  control: string
  input: string
  row: string
  border: string
  borderStrong: string
  text: string
  muted: string
  faint: string
  primary: string
  primaryForeground: string
  selected: string
  selectedForeground: string
  green: string
  orange: string
  red: string
  violet: string
  track: string
  iconBg: string
  shadow: string
}

// The palette follows the neutral/accent split used by shadcn, but is kept as
// GPUI-friendly string tokens so an app can replace the whole visual system.
const DARK: ThemeTokens = {
  canvas: '#09090B', sidebar: '#111113', panel: '#18181B', panelRaised: '#27272A',
  control: '#202023', input: '#111113', row: '#1D1D20', border: '#27272A', borderStrong: '#3F3F46',
  text: '#FAFAFA', muted: '#A1A1AA', faint: '#71717A', primary: '#7C3AED', primaryForeground: '#FFFFFF',
  selected: '#312E81', selectedForeground: '#EDE9FE', green: '#22C55E', orange: '#F59E0B',
  red: '#EF4444', violet: '#A78BFA', track: '#3F3F46', iconBg: '#312E81', shadow: '#00000066',
}

const LIGHT: ThemeTokens = {
  canvas: '#FAFAFA', sidebar: '#F4F4F5', panel: '#FFFFFF', panelRaised: '#F4F4F5',
  control: '#F4F4F5', input: '#FFFFFF', row: '#FAFAFA', border: '#E4E4E7', borderStrong: '#D4D4D8',
  text: '#18181B', muted: '#71717A', faint: '#A1A1AA', primary: '#7C3AED', primaryForeground: '#FFFFFF',
  selected: '#EDE9FE', selectedForeground: '#5B21B6', green: '#16A34A', orange: '#D97706',
  red: '#DC2626', violet: '#7C3AED', track: '#D4D4D8', iconBg: '#EDE9FE', shadow: '#18181B22',
}

type ThemeContextValue = {
  mode: ThemeMode
  tokens: ThemeTokens
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({ mode: 'dark', tokens: DARK, setMode: () => undefined })

export function ThemeProvider({ children, initialMode = 'dark' }: { children: ReactNode; initialMode?: ThemeMode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode)
  // GPUIX 0.9 does not expose OS appearance as a React hook. Keeping system
  // deterministic is preferable to a flash; applications may resolve it later.
  const tokens = useMemo(() => mode === 'light' ? LIGHT : DARK, [mode])
  return <ThemeContext.Provider value={{ mode, tokens, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

