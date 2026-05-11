# cli-kit-js examples

Four runnable Node CLIs that exercise the kit end-to-end. Not published — these are documentation by execution.

| Example       | Demonstrates                                                                          |
| ------------- | ------------------------------------------------------------------------------------- |
| `hello.ts`    | Basic typed args, aliases, defaults, integer with min/max, colored output.            |
| `calc.ts`     | Subcommand tree with required positionals, per-leaf validation, error to stderr.      |
| `demo.ts`     | Every renderer: banner, box, table, list, tree, progress, spinner. `--only` filter.    |
| `wizard.ts`   | Every prompt: text+validate, password (SecureString), confirm, select, multiselect. Falls back to readLine when piped. |

## Run them

After `pnpm install` + `pnpm build` at the repo root:

```bash
# Direct from TS source (Node 22 has native --experimental-strip-types):
node --experimental-strip-types apps/examples/src/hello.ts --name Claude

# Through the dev runtime if you've wired tsx / ts-node / bun:
pnpm tsx apps/examples/src/calc.ts add 5 3
```

Each example can be inspected as a standalone program — its source is short enough to read top-to-bottom.

## Pipe-friendly

The wizard reads prompt input from stdin when not on a TTY, so piping works:

```bash
printf 'myproj\nhunter2\ny\n1\n1,3' | node --experimental-strip-types apps/examples/src/wizard.ts
```

Useful for CI demos or screenshots.
