import { cloneElement, createElement, isValidElement, type ReactElement, type Ref } from 'react'
import type { PublicInstance as Instance } from '@gpuix/react'
import { mergeProps } from './merge-props'

export type UseRenderOptions = {
  defaultTagName?: string
  render?: ReactElement | ((props: Record<string, unknown>, state?: unknown) => ReactElement)
  ref?: Ref<Instance> | Ref<Instance>[]
  state?: unknown
  props?: Record<string, unknown>
  enabled?: boolean
}

export function useRender(options: UseRenderOptions): ReactElement | null {
  const { render, enabled = true, defaultTagName = 'div' } = options
  if (enabled === false) return null
  const internal = options.props ?? {}
  const merged = options.ref === undefined ? internal : mergeProps(internal, { ref: options.ref })
  if (render !== undefined && render !== null) {
    if (typeof render === 'function') return render(merged, options.state)
    if (isValidElement(render)) {
      return cloneElement(render, mergeProps(merged, (render.props ?? {}) as Record<string, unknown>) as never)
    }
  }
  return createElement(defaultTagName as never, merged as never)
}

export function useRenderElement(
  element: ReactElement | ((props: Record<string, unknown>, state?: unknown) => ReactElement) | undefined,
  options: Omit<UseRenderOptions, 'render'>,
) {
  return useRender({ ...options, render: element })
}
