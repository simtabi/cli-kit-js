# @simtabi/cli-kit-js-io

The IOAdapter abstraction and its implementations. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M3 (Node + Memory) and M6 (DOM + Console).

## What it does

Every byte the library writes goes through one `IOAdapter` interface. Four implementations:

| Subpath              | Where it runs              | Notes                                              |
| -------------------- | -------------------------- | -------------------------------------------------- |
| `/node`              | Node 22+                   | stdio + raw mode + signal-aware terminal restore   |
| `/dom`               | Browser DOM                | HTML-escaped by default; CSP-strict; nonce-capable |
| `/console`           | Browser DevTools           | Translates ANSI → `%c` CSS strings                 |
| `/memory`            | Any                        | In-process buffer for tests                        |

## Interface

```ts
interface IOAdapter {
  write(chunk: string): void
  writeError(chunk: string): void
  writeRaw(chunk: string): void   // bypasses HTML escape; still sanitises ANSI
  readKey(signal: AbortSignal): Promise<KeyEvent>
  readLine(signal: AbortSignal): Promise<string>
  clear(): void
  readonly columns: number
  readonly rows: number
  readonly isTTY: boolean
  readonly isPiped: boolean
  readonly capabilities: { color: 0 | 4 | 8 | 24; unicode: boolean; hyperlinks: boolean }
  readonly stdin: ReadableStream<Uint8Array>
  onResize(cb: () => void): () => void
}
```

## Security

DOM adapter never uses `innerHTML`, `eval`, `Function`, or inline event handlers. Style attributes restricted to a 5-property allowlist. See [`THREAT-MODEL.md`](../../THREAT-MODEL.md).

## Install

```bash
npm i @simtabi/cli-kit-js-io
```

## License

[MIT](./LICENSE) © Simtabi.
