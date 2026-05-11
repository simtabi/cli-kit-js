# @simtabi/cli-kit-js-ansi

SGR colors, ANSI sanitisation, and capability detection. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M2.

## What it does

- **SGR styling**: `red`, `green`, `bold`, `bgYellow`, 256-color, RGB truecolor.
- **`strip()`**: removes all ANSI SGR sequences from a string.
- **`sanitize()`**: allowlist filter — keeps SGR, removes OSC (clipboard hijack), DCS, APC, PM, SOS, and CSI cursor / scroll / erase / mode-set sequences.
- **`detectColorDepth()`**: returns `0 | 4 | 8 | 24` based on `NO_COLOR`, `FORCE_COLOR`, `isTTY`, `COLORTERM`, `TERM`, and Windows console capabilities.
- **`detectUnicode()`**: returns whether the terminal can render Unicode symbols.

## Security

The `sanitize()` function is the single chokepoint for external strings flowing into any TTY adapter. It is allowlist-based, not denylist-based — anything not on the SGR allowlist is stripped. Fuzz-tested with `fast-check`.

## Install

```bash
npm i @simtabi/cli-kit-js-ansi
```

## License

[MIT](./LICENSE) © Simtabi.
