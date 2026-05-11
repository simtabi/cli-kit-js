# @simtabi/cli-kit-js-core

The runtime heart of `cli-kit-js`. Part of the [`cli-kit-js`](https://github.com/simtabi/cli-kit-js) family.

**Status:** pre-alpha. Implementation lands in M3.

## What it does

- **`command()` / `defineCommand()`** — declarative command builder.
- **`cli('name')`** — fluent OOP builder producing the same immutable config.
- **`run(command, opts?)`** — async-correct runner with signal matrix, exit-code map, hook bus, lazy subcommand resolution, terminal-state guard, and graceful-shutdown timeout.
- **`logger`** — leveled logger with secret-key redaction.
- **Help generator** — nested-subcommand recursion plus `--help=json|markdown|man` export formats for docs and man pages.

## Lifecycle

```
parse → validate → setup → run → cleanup → exit
       ↘            ↘     ↘    ↘
        on:parse   on:run  on:error  on:exit   (hooks)
```

All hooks receive `{ args, signal, io, config }`. The signal flips on SIGINT/SIGTERM/SIGHUP and on browser `beforeunload`. First signal triggers cooperative shutdown with a configurable timeout (default 5 s); a second signal hard-exits.

## Install

```bash
npm i @simtabi/cli-kit-js-core
```

## License

[MIT](./LICENSE) © Simtabi.
