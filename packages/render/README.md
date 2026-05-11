# @simtabi/cli-kit-js-render

Composable, width-safe renderers. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M4 (TTY) and M6 (HTML).

## What it does

| Renderer       | Output                                                     |
| -------------- | ---------------------------------------------------------- |
| `box`          | Bordered box (single, double, round, bold, ascii)          |
| `table`        | Column-aligned table with header, multi-line cells         |
| `list`         | Bulleted, numbered, or nested list                         |
| `tree`         | File-tree style hierarchy                                  |
| `banner`       | Title block                                                |
| `progressBar`  | Single-line progress with rate/ETA                         |
| `spinner`      | Async spinner controller (`succeed`/`fail`/`warn`/`info`)  |

All renderers are width-safe via `@simtabi/cli-kit-js-text` and emit through an `IOAdapter` from `@simtabi/cli-kit-js-io`, so the same code renders to a Node TTY, browser DOM, DevTools console, or in-memory buffer.

## Subpath: `/html`

`@simtabi/cli-kit-js-render/html` exports the ANSI → HTML converter. Output is XSS-safe by default — never uses `innerHTML`, allowlist of style properties, no `javascript:` URLs.

## Install

```bash
npm i @simtabi/cli-kit-js-render
```

## License

[MIT](./LICENSE) © Simtabi.
