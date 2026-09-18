# Contributing

Component behavior, anatomy, focus handling, accessibility and theme changes
belong in this repository. Android runtime and packaging changes belong in
[`gpuix-android`](https://github.com/wdcodecn/gpuix-android).

Before opening a pull request:

```sh
bun install
bun run typecheck
```

Keep component interfaces small, preserve controlled and uncontrolled state
contracts, and verify overlay focus restoration and keyboard interaction.
