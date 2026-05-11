# @simtabi/cli-kit-js-text

Width-safe text utilities. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M2.

## What it does

- `width(s)` — printed column count, ANSI-stripped, Unicode-aware.
- `truncate(s, n, opts?)` — truncate to `n` columns, preserving ANSI styling.
- `wrap(s, n, opts?)` — soft-wrap to `n` columns; word boundaries respected.
- `pad(s, n, side?, fill?)` — pad to `n` columns. `side` is `'left' | 'right' | 'center'` (default `'left'`) and means "text on the left edge" (etc.) — standard alignment semantics. `pad('hi', 5)` → `'hi   '`.
- `align(lines, width, side?)` — align a block of lines.

Handles CJK wide characters, emoji presentation forms, zero-width joiners, combining marks, and variation selectors via an inlined Unicode width table (~2 KB).

## Install

```bash
npm i @simtabi/cli-kit-js-text
```

## License

[MIT](./LICENSE) © Simtabi.
