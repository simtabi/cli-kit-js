# @simtabi/cli-kit-js-testing

Test utilities for `cli-kit-js` consumers. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M3.

## What it does

- **`MemoryIOAdapter`** — captures `write`/`writeError` into buffers; replays scripted keystrokes for prompts.
- **`answer(...keys)`** — queues responses for `prompt.text`, `prompt.confirm`, `prompt.select`, `prompt.password`.
- **`expectStdout(/re/)`, `expectExitCode(n)`, `expectStderr(/re/)`** — first-class assertions.
- **`snapshotHelp(command)`** — generates deterministic help-text for snapshot testing.
- **`freezeTime(date)`** — pins `Date.now()` and `performance.now()` for reproducible output.
- **`withEnv({KEY: value}, fn)`** — runs `fn` with scoped env-var overrides.

## Install

```bash
npm i -D @simtabi/cli-kit-js-testing
```

## License

[MIT](./LICENSE) © Simtabi.
