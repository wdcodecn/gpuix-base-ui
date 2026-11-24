import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import type { EventPayload } from '@gpuix/native'
import {
  makeEventPreventable,
  mergeClassNames,
  mergeProps,
  mergePropsN,
} from '../src/merge-props'
import {
  createDetails,
  isActivationKey,
  isArrowKey,
  isModKey,
  keyName,
} from '../src/base/foundations'
import { useRender, useRenderElement } from '../src/use-render'
import {
  Button,
  Dialog,
  Input,
  List,
  Tabs,
  ThemeProvider,
  useTheme,
} from '../src/index'

const keyEv = (key: string): EventPayload => ({
  elementId: 1,
  eventType: 'keyDown',
  key,
})

const modEv = (mods: Partial<{ shift: boolean; ctrl: boolean; alt: boolean; cmd: boolean }>): EventPayload => ({
  elementId: 1,
  eventType: 'keyDown',
  modifiers: { shift: false, ctrl: false, alt: false, cmd: false, ...mods },
})

describe('gpuix-base-ui mergeProps & preventable events', () => {
  test('mergeClassNames concatenates user class before library class', () => {
    expect(mergeClassNames('our-btn', 'their-btn')).toBe('their-btn our-btn')
    expect(mergeClassNames('our-btn', undefined)).toBe('our-btn')
    expect(mergeClassNames(undefined, 'their-btn')).toBe('their-btn')
    expect(mergeClassNames(undefined, undefined)).toBeUndefined()
  })

  test('mergeProps merges styles, ignores undefined overrides, and chains handlers with preventBaseUIHandler', () => {
    const order: string[] = []
    const base = {
      className: 'base-cls',
      style: { color: '#fff', gap: 4 },
      title: 'default',
      onClick: () => {
        order.push('our')
      },
    }
    const override = {
      className: 'user-cls',
      style: { gap: 12 },
      title: undefined,
      onClick: (ev: { preventBaseUIHandler?: () => void }) => {
        order.push('their')
        ev.preventBaseUIHandler?.()
      },
    }

    const merged = mergeProps(base, override)
    expect(merged.className).toBe('user-cls base-cls')
    expect(merged.style).toEqual({ color: '#fff', gap: 12 })
    expect(merged.title).toBe('default')

    const preventableEvent = makeEventPreventable({ type: 'click' })
    ;(merged.onClick as (ev: typeof preventableEvent) => void)(preventableEvent)
    expect(order).toEqual(['their'])
    expect((preventableEvent as { baseUIHandlerPrevented?: boolean }).baseUIHandlerPrevented).toBe(true)

    const orderUnprevented: string[] = []
    const chained = mergePropsN([
      { onPress: () => orderUnprevented.push('our') },
      (prev) => ({
        title: String(Boolean(prev.onPress)),
        onPress: () => orderUnprevented.push('their'),
      }),
    ])
    expect(chained.title).toBe('true')
    ;(chained.onPress as (ev: Record<string, unknown>) => void)({})
    expect(orderUnprevented).toEqual(['their', 'our'])
  })
})

describe('gpuix-base-ui foundations helpers', () => {
  test('createDetails tracks cancellation cleanly', () => {
    const details = createDetails('trigger-press')
    expect(details.reason).toBe('trigger-press')
    expect(details.isCanceled).toBe(false)
    details.cancel()
    expect(details.isCanceled).toBe(true)
  })

  test('keyboard helpers normalize spacebar, activation, arrows, and modifiers', () => {
    expect(keyName(keyEv(' '))).toBe('space')
    expect(keyName(keyEv('Spacebar'))).toBe('space')
    expect(keyName(keyEv('Enter'))).toBe('enter')

    expect(isActivationKey(keyEv('Enter'))).toBe(true)
    expect(isActivationKey(keyEv(' '))).toBe(true)
    expect(isActivationKey(keyEv('Escape'))).toBe(false)

    expect(isArrowKey(keyEv('Up'), 'vertical')).toBe(true)
    expect(isArrowKey(keyEv('Down'), 'vertical')).toBe(true)
    expect(isArrowKey(keyEv('Left'), 'vertical')).toBe(false)
    expect(isArrowKey(keyEv('Left'), 'horizontal')).toBe(true)
    expect(isArrowKey(keyEv('Right'), 'horizontal')).toBe(true)

    expect(isModKey(modEv({ cmd: true }))).toBe(true)
    expect(isModKey(modEv({ ctrl: true }))).toBe(true)
    expect(isModKey(modEv({ shift: true }))).toBe(false)
  })
})

describe('gpuix-base-ui useRender & public API exports', () => {
  test('useRender respects enabled flag, defaultTagName, render function, and element cloning', () => {
    expect(useRender({ enabled: false })).toBeNull()

    const defaultEl = useRender({ defaultTagName: 'button', props: { disabled: true } })
    expect(defaultEl).not.toBeNull()
    if (defaultEl) {
      expect(defaultEl.type).toBe('button')
      expect((defaultEl.props as { disabled?: boolean }).disabled).toBe(true)
    }

    const fnEl = useRender({
      props: { className: 'internal' },
      state: { active: true },
      render: (props, state) =>
        createElement('div', { ...props, 'data-active': (state as { active: boolean }).active }),
    })
    expect(fnEl).not.toBeNull()
    if (fnEl) {
      expect((fnEl.props as { 'data-active'?: boolean })['data-active']).toBe(true)
    }

    const cloned = useRenderElement(createElement('span', { className: 'user' }), {
      props: { className: 'base', tabIndex: 0 },
    })
    expect(cloned).not.toBeNull()
    if (cloned) {
      expect(cloned.type).toBe('span')
      expect((cloned.props as { className?: string }).className).toBe('user base')
      expect((cloned.props as { tabIndex?: number }).tabIndex).toBe(0)
    }
  })

  test('exports core components and compound subcomponents', () => {
    expect(typeof ThemeProvider).toBe('function')
    expect(typeof useTheme).toBe('function')
    expect(typeof Button).toBe('function')
    expect(typeof Input).toBe('function')
    expect(typeof Dialog.Root).toBe('function')
    expect(typeof Tabs.Root).toBe('function')
    expect(typeof List.Virtual).toBe('function')
    expect(typeof List.Item).toBe('function')
  })
})
