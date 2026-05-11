/**
 * `@simtabi/cli-kit-js-testing`
 *
 * Test harness for cli-kit-js apps:
 *
 *   - `MemoryIOAdapter`         — buffered I/O for assertions
 *   - `answer(...keys)`          — scripted keystrokes for prompts
 *   - `expectStdout(/re/)`       — output assertions
 *   - `expectExitCode(n)`        — runner-result assertions
 *   - `snapshotHelp(command)`    — stable help-text snapshot
 *   - `freezeTime(date)`         — deterministic timestamps
 *   - `withEnv({...}, fn)`       — scoped env-var override
 *
 * Implementation lands in M3.
 */

export const __version = '0.0.0'
