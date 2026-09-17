import { createContext, useContext, type ReactNode } from 'react'

export type Direction = 'ltr' | 'rtl'

const DirectionContext = createContext<Direction>('ltr')

export function DirectionProvider(props: { direction?: Direction; children: ReactNode }) {
  return <DirectionContext.Provider value={props.direction ?? 'ltr'}>{props.children}</DirectionContext.Provider>
}

export function useDirection() {
  return useContext(DirectionContext)
}

export function CSPProvider(props: { nonce?: string; disableStyleElements?: boolean; children: ReactNode }) {
  void props.nonce
  void props.disableStyleElements
  return <>{props.children}</>
}
