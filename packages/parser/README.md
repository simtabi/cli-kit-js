# @simtabi/cli-kit-js-parser

Type-safe argv parser. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M2.

## What it does

Turns `process.argv.slice(2)` (or any string array) into a typed `ParsedArgs` object, with:

- **Long, short, clustered, and `=`-separated flags** (`--name=foo`, `-n foo`, `-vvv`).
- **Boolean coercion** symmetric for `true/1/yes/y/on` and `false/0/no/n/off`.
- **`--no-<flag>`** negation.
- **Counted flags** (`type: 'count'`) and **arrays** (`-I a -I b`).
- **Positional and rest args** (`...files`).
- **Alias canonicalization in the documented direction** — `alias: { name: ['n'] }` puts the value on `.name`, not `.n`.
- **Negative numbers accepted as values** (`--count -5`).
- **`--` separator** halts further flag parsing in the current command.
- **Strict mode** rejects unknown flags by default; opt-out per command.

## Security

- Result objects created with `Object.create(null)`.
- Keys matching `__proto__|prototype|constructor` rejected at parse time.
- Property names validated against `/^[A-Za-z_][A-Za-z0-9_-]*$/`.
- Hard caps: 10 000 argv tokens, 8 command-depth levels, 1 MiB total input.
- Fuzz tested with `fast-check` on every entry point.

See [`THREAT-MODEL.md`](../../THREAT-MODEL.md) for the full posture.

## Install

```bash
npm i @simtabi/cli-kit-js-parser
```

## License

[MIT](./LICENSE) © Simtabi.
