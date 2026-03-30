# Brick Nim Prototype

This folder mirrors the current TypeScript CLI behavior in Nim.

## Commands

From the repository root:

```bash
nim c -r nim/src/brick.nim -- parse demo/components/Main.ctr
nim c -r nim/src/brick.nim -- generate web demo
```

Or from `nim/` via nimble:

```bash
nimble run -- parse ../demo/components/Main.ctr
nimble run -- generate web ../demo
```

## Scope

Current parity target:

- `parse <file>` for `[Contract]` declarations
- `generate web <dir>` for `app.json` to `dist/web/index.html`

This is a non-destructive migration path and does not remove existing TypeScript files.
