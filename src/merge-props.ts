type PropsLike = Record<string, unknown>
type PropsArg = PropsLike | ((merged: PropsLike) => PropsLike)

function isHandler(key: string, value: unknown): value is (...args: never[]) => void {
  return typeof value === 'function' && /^on[A-Z0-9]/.test(key)
}

export function mergeClassNames(our: string | undefined, their: string | undefined) {
  if (our && their) return `${their} ${our}`
  return our ?? their
}

function preventBaseUIHandler(this: { baseUIHandlerPrevented?: boolean }) {
  this.baseUIHandlerPrevented = true
}

export function makeEventPreventable<T>(event: T): T {
  if (event && typeof event === 'object' && !('preventBaseUIHandler' in event)) {
    try { Object.defineProperty(event, 'preventBaseUIHandler', { value: preventBaseUIHandler, writable: true, configurable: true }) } catch { /* frozen event */ }
  }
  return event
}

function chainHandlers(their: (...args: never[]) => void, our: (...args: never[]) => void) {
  return (...args: never[]) => {
    const event = args[0] as { baseUIHandlerPrevented?: boolean } | undefined
    if (event && typeof event === 'object') {
      try { makeEventPreventable(event) } catch { /* frozen event */ }
    }
    their(...args)
    if (event?.baseUIHandlerPrevented === true) return
    our(...args)
  }
}

function mergeTwo(our: PropsLike, their: PropsLike): PropsLike {
  const result: PropsLike = { ...our }
  for (const key of Object.keys(their)) {
    const theirValue = their[key]
    if (theirValue === undefined) continue
    const ourValue = our[key]
    if (key === 'ref') { result[key] = theirValue; continue }
    if (key === 'className') { result[key] = mergeClassNames(ourValue as string | undefined, theirValue as string | undefined); continue }
    if (key === 'style') { result[key] = { ...(ourValue as PropsLike | undefined), ...(theirValue as PropsLike) }; continue }
    if (isHandler(key, theirValue)) {
      result[key] = isHandler(key, ourValue) ? chainHandlers(theirValue, ourValue) : theirValue
      continue
    }
    result[key] = theirValue
  }
  return result
}

export function mergeProps(...args: PropsArg[]): PropsLike {
  let merged: PropsLike = {}
  for (const arg of args) {
    if (!arg) continue
    const current = typeof arg === 'function' ? arg(merged) : arg
    merged = mergeTwo(merged, current)
  }
  return merged
}

export function mergePropsN(propsList: PropsArg[]): PropsLike {
  return mergeProps(...propsList)
}
