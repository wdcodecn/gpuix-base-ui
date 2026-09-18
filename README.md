# gpuix-base-ui

[简体中文](README.zh-CN.md)

Open-code, composable UI components for React on GPUIX 0.9. The library ports
the public Base UI v1.8 component families and anatomy to GPUIX native nodes
and events. It does not patch `@gpuix/*` internals.

## Components

The package exposes 37 component families:

`Accordion` · `AlertDialog` · `Autocomplete` · `Avatar` · `Button` · `Checkbox` ·
`CheckboxGroup` · `Collapsible` · `Combobox` · `ContextMenu` · `Dialog` · `Drawer` ·
`Field` · `Fieldset` · `Form` · `Input` · `Menu` · `Menubar` · `Meter` ·
`NavigationMenu` · `NumberField` · `OTPField` · `Popover` · `PreviewCard` ·
`Progress` · `RadioGroup` · `ScrollArea` · `Select` · `Separator` · `Slider` ·
`Switch` · `Tabs` · `Toast` · `Toggle` · `ToggleGroup` · `Toolbar` · `Tooltip`.

Utilities and providers include `mergeProps`, `mergePropsN`, `useRender`,
`CSPProvider`, `DirectionProvider`, `useDirection`, `useToastManager`, and
`createToastManager`. The repository also includes application-level `List`,
`Card`, `Badge`, `Glyph`, and `IconButton` compositions.

## Install

```sh
bun add gpuix-base-ui @gpuix/react @gpuix/native react
```

```tsx
import { render } from '@gpuix/react'
import { Button, Card, ThemeProvider } from 'gpuix-base-ui'

function App() {
  return <Card.Root>
    <Card.Header title="GPUIX" description="Native UI components" />
    <Card.Content>
      <Button variant="primary">Continue</Button>
    </Card.Content>
  </Card.Root>
}

render(<ThemeProvider initialMode="system"><App /></ThemeProvider>)
```

## Source layout

```text
src/base/foundations.tsx   Controlled state, press, keyboard, focus and drag primitives
src/base/surface.tsx       Shared anchored popup and collection behavior
src/base/button.tsx        Button semantics and theme presets
src/base/controls.tsx      Toggle, ToggleGroup and Toolbar
src/base/overlay.tsx       Dialog, Drawer, Popover, Tooltip and menu families
src/base/chooser.tsx       Select, Autocomplete, Combobox and NavigationMenu
src/base/form.tsx          Fields, inputs, checkboxes, radios, switches and sliders
src/base/display.tsx       Accordion, progress, scroll, tabs and toast families
src/base/providers.tsx     DirectionProvider and CSPProvider
src/<name>.ts              Per-component package entry points
```

Applications can import the components directly or copy their source and
replace `ThemeTokens` with a product-specific visual system.

## GPUIX mapping notes

- GPUIX has no DOM portal. Overlay portal parts are transparent wrappers;
  anchored content uses GPUIX native positioning.
- Percentage offsets are not available for all native styles. Sliders,
  indicators and scroll thumbs use measured pixel bounds.
- Accessibility uses the GPUIX-supported role and ARIA subset.
- Keyboard interactions require focus. Interactive components manage focus,
  directional keys, Enter, Space, Escape and typeahead where applicable.
- Closing an overlay restores focus to its trigger.

## Playground

```sh
bun install
bun run typecheck
bun run dev
```

The playground contains nine product-style pages plus an interactive component
gallery. The proxy page exercises a 5,000-row native virtual list with a
100-row application window.

## Android companion

The Android runtime, standalone Hermes host and APK/AAB CLI live in
[`wdcodecn/gpuix-android`](https://github.com/wdcodecn/gpuix-android). A runnable
example lives in
[`wdcodecn/gpuix-app-starter`](https://github.com/wdcodecn/gpuix-app-starter).
This repository remains focused on component source, theme contracts and
interaction semantics.

## License

MIT. See [LICENSE](LICENSE).
