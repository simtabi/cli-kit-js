# @simtabi/cli-kit-js-config

Layered, schema-validated configuration. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M3a.

## What it does

Resolves a typed configuration object from up to 8 ordered layers:

| Layer | Source                              | Trust  |
| ----- | ----------------------------------- | ------ |
| 1     | Schema defaults (TS source)         | High   |
| 2     | `config/default.json`               | High   |
| 3     | `config/{env}.json`                 | High   |
| 4     | `config/{env}.local.json`           | High   |
| 5     | `config/local.json`                 | High   |
| 6     | `process.env` (mapped via schema)   | Medium |
| 7     | Parsed CLI args (mapped via schema) | Medium |
| 8     | `.set()` runtime overrides          | High   |

Later layers override earlier ones. Reads are memoised; `.set()` invalidates only the touched path.

## Features

- **Type-safe schema** with `Infer<typeof schema>` producing a precise TS type.
- **Strict mode** rejects unknown keys.
- **`sensitive`/`secret`** schema flags redact values in snapshots, logs, and `inspect()`.
- **Path traversal sandbox** — files outside `configDir` cannot be loaded.
- **Prototype-pollution-safe** JSON parsing via custom reviver.
- **Size caps** — 1 MiB per file, 4 MiB aggregate.
- **No JS / TS config files** in the default loader. Opt-in plugin available.

## Install

```bash
npm i @simtabi/cli-kit-js-config
```

## License

[MIT](./LICENSE) © Simtabi.
