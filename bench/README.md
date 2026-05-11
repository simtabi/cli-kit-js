# bench

Performance benchmarks for `cli-kit-js`. Not published.

## Run

```bash
pnpm install              # installs tinybench via the catalog
pnpm --filter @simtabi/cli-kit-js-bench bench           # all suites
pnpm --filter @simtabi/cli-kit-js-bench bench:parser    # one at a time
pnpm --filter @simtabi/cli-kit-js-bench bench:text
pnpm --filter @simtabi/cli-kit-js-bench bench:render
pnpm --filter @simtabi/cli-kit-js-bench bench:html
pnpm --filter @simtabi/cli-kit-js-bench bench:config
```

Each suite runs for 500 ms per case and prints a table with mean, p99, ops/sec, and standard deviation.

## What's covered

| Suite     | Tasks                                                                  |
| --------- | ---------------------------------------------------------------------- |
| parser    | small / medium / large argv parsing                                    |
| text      | `width` on ASCII / CJK / emoji / ANSI; `truncate`, `pad`, `wrap`       |
| render    | `box`, `table` (3-row + 500-row), `tree`, `list`                       |
| html      | `ansiToHtml` on plain / SGR / truecolor / adversarial XSS              |
| config    | `safeParse` small + large; `createConfigFromLayers` with validation    |

## Indicative numbers (M1 Mac, Node 22)

Recorded `2026-05-11` as rough orders of magnitude. They are regression indicators, not gates. Compare against these when a PR touches a hot path.

| Task                                          | ops/sec   |
| --------------------------------------------- | --------: |
| `parse` small argv (4 tokens)                 |  ~360 000 |
| `parse` medium argv (~10 tokens)              |  ~210 000 |
| `parse` 200-token argv (non-strict)           |   ~14 000 |
| `width` ASCII (280 cols)                      |    ~8 700 |
| `width` CJK (300 cols)                        |   ~11 000 |
| `width` emoji+ZWJ (~150 cols)                 |   ~23 000 |
| `pad` ASCII to 80 cols                        |  ~230 000 |
| `wrap` 280-col → 40-col                       |    ~1 500 |
| `ansiToHtml` plain text                       |  ~970 000 |
| `ansiToHtml` SGR (20 runs)                    |   ~11 000 |
| `ansiToHtml` adversarial XSS payload          |   ~22 000 |

`width` is dominated by `Intl.Segmenter` grapheme breaks — counterintuitively, CJK is faster than ASCII because the average grapheme cluster contains more visible chars. `wrap` is slow because it calls `width` per word; can be optimised in M2 of Phase 2 if it becomes a bottleneck for a real consumer.

Failing these isn't a build failure — they're regression indicators only.
