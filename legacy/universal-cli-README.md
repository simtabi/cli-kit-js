# Universal CLI

A pure JavaScript CLI library that works in **Node.js**, **Browser**, **Deno**, **Bun**, and **Puter** environments.

**No dependencies. ES3 compatible. ~15KB minified.**

Inspired by [citty](https://github.com/unjs/citty), [mri](https://github.com/lukeed/mri), and [commander](https://github.com/tj/commander.js).

## Features

- ✅ **Universal** - Works in Node.js CLI, Browser, Deno, Bun, Puter
- ✅ **Zero dependencies** - Pure JavaScript, no external packages
- ✅ **ES3 compatible** - Works in legacy environments (IE9+)
- ✅ **Argument parsing** - mri-compatible parser with aliases, defaults, type coercion
- ✅ **Subcommands** - Nested command structure (like citty)
- ✅ **Auto-generated help** - Beautiful usage and help text
- ✅ **Colors** - ANSI colors with auto-detection (disabled in browser)
- ✅ **Progress bars & spinners** - CLI progress indicators
- ✅ **Box & Table formatting** - Pretty output formatting
- ✅ **Environment detection** - Automatically adapts to runtime

## Installation

### Node.js / npm
```bash
npm install universal-cli
# or just copy universal-cli.js to your project
```

### Browser
```html
<script src="universal-cli.js"></script>
<script>
  const cli = window.UniversalCLI;
</script>
```

### Puter / ES3
```javascript
// Use universal-cli-es3.js for maximum compatibility
```

## Quick Start

### Node.js CLI

```javascript
#!/usr/bin/env node
const { defineCommand, runMain, colors: c } = require('./universal-cli.js');

const main = defineCommand({
    meta: {
        name: 'myapp',
        version: '1.0.0',
        description: 'My awesome CLI app'
    },
    args: {
        name: {
            type: 'string',
            alias: 'n',
            description: 'Your name',
            default: 'World'
        },
        verbose: {
            type: 'boolean',
            alias: 'v',
            description: 'Enable verbose output'
        }
    },
    run({ args }) {
        console.log(c.green(`Hello, ${args.name}!`));
        if (args.verbose) {
            console.log(c.gray('Verbose mode enabled'));
        }
    }
});

runMain(main);
```

```bash
$ node myapp.js --help
$ node myapp.js --name Claude
$ node myapp.js -n Claude -v
```

### Subcommands

```javascript
const greetCommand = defineCommand({
    meta: { name: 'greet', description: 'Greet someone' },
    args: {
        name: { type: 'positional', required: true }
    },
    run({ args }) {
        console.log(`Hello, ${args.name}!`);
    }
});

const main = defineCommand({
    meta: { name: 'mycli', version: '1.0.0' },
    subCommands: {
        greet: greetCommand,
        // Add more subcommands...
    }
});

runMain(main);
```

```bash
$ node mycli.js greet World
Hello, World!
```

### Browser Usage

```javascript
const cli = window.UniversalCLI;

const command = cli.defineCommand({
    meta: { name: 'demo' },
    args: {
        message: { type: 'positional', default: 'Hello' }
    },
    run({ args }) {
        document.body.innerHTML += `<p>${args.message}</p>`;
    }
});

// Parse args from string (browser doesn't have process.argv)
const args = cli.input.parseRawArgs('--message "Hello Browser!"');
cli.runCommand(command, args);
```

## API Reference

### `defineCommand(config)`

Define a command with metadata, arguments, and run handler.

```javascript
const command = defineCommand({
    meta: {
        name: 'mycommand',
        version: '1.0.0',
        description: 'Command description'
    },
    args: {
        // Positional argument
        filename: {
            type: 'positional',
            description: 'Input file',
            required: true
        },
        // String option
        output: {
            type: 'string',
            alias: 'o',
            description: 'Output file',
            default: 'output.txt'
        },
        // Boolean flag
        force: {
            type: 'boolean',
            alias: 'f',
            description: 'Force overwrite'
        }
    },
    subCommands: {
        // Nested commands...
    },
    setup({ args }) {
        // Called before run (optional)
    },
    run({ args, command }) {
        // Main command logic
        return result;
    },
    cleanup({ args, result, error }) {
        // Called after run (optional)
    }
});
```

### `runMain(command, options?)`

Run a command as the main entry point (CLI mode).

```javascript
runMain(command);
runMain(command, { exit: false }); // Don't call process.exit
runMain(command, { args: ['custom', 'args'] }); // Override args
```

### `runCommand(command, args, options?)`

Run a command with specific arguments (programmatic).

```javascript
const result = runCommand(command, ['--name', 'World']);
// result = { type: 'success', code: 0, result: ... }
```

### `parseArgs(args, options?)`

Parse arguments array (mri-compatible).

```javascript
const parsed = parseArgs(['--name', 'John', '-v', 'file.txt'], {
    alias: { n: 'name', v: 'verbose' },
    boolean: ['verbose'],
    default: { name: 'World' }
});
// { _: ['file.txt'], name: 'John', verbose: true, n: 'John', v: true }
```

### `renderUsage(command)` / `showUsage(command)`

Generate or display help text.

```javascript
const helpText = renderUsage(command);
showUsage(command); // Prints to stdout
```

## Colors

```javascript
const { colors: c } = require('./universal-cli.js');

console.log(c.red('Error!'));
console.log(c.green('Success!'));
console.log(c.bold(c.blue('Bold blue')));
console.log(c.bgYellow(c.black('Black on yellow')));

// 256 colors
console.log(c.fg256(208)('Orange'));

// RGB (Truecolor)
console.log(c.rgb(255, 100, 50)('Custom color'));

// Strip ANSI codes
const plain = c.strip(c.red('colored'));

// Disable colors
c.setEnabled(false);
```

## Formatting

### Box

```javascript
const { format } = require('./universal-cli.js');

console.log(format.box('Hello World!', { style: 'round' }));
// ╭──────────────╮
// │ Hello World! │
// ╰──────────────╯

console.log(format.box('Error!', { style: 'double', padding: 2 }));
// ╔══════════════╗
// ║    Error!    ║
// ╚══════════════╝
```

Styles: `single`, `double`, `round`, `bold`, `ascii`

### Table

```javascript
console.log(format.table(
    ['Name', 'Age', 'City'],
    [
        ['Alice', '30', 'NYC'],
        ['Bob', '25', 'LA'],
        ['Charlie', '35', 'Chicago']
    ]
));
// ┌─────────┬─────┬─────────┐
// │ Name    │ Age │ City    │
// ├─────────┼─────┼─────────┤
// │ Alice   │ 30  │ NYC     │
// │ Bob     │ 25  │ LA      │
// │ Charlie │ 35  │ Chicago │
// └─────────┴─────┴─────────┘
```

## Progress

### Progress Bar

```javascript
const { progress } = require('./universal-cli.js');

for (let i = 0; i <= 100; i += 10) {
    console.log(progress.bar(i, 100, { label: 'Loading' }));
}
// Loading [████████████████████░░░░░░░░░░░░░░░░░░░░] 50%
```

### Spinner

```javascript
const spinner = progress.spinner({ text: 'Processing...' });
spinner.start();

// Later...
spinner.succeed('Done!');   // ✔ Done!
spinner.fail('Failed!');    // ✖ Failed!
spinner.warn('Warning!');   // ⚠ Warning!
spinner.info('Info!');      // ℹ Info!
```

## Symbols

```javascript
const { symbols } = require('./universal-cli.js');

console.log(symbols.tick);      // ✔
console.log(symbols.cross);     // ✖
console.log(symbols.star);      // ★
console.log(symbols.info);      // ℹ
console.log(symbols.warning);   // ⚠
console.log(symbols.pointer);   // ❯
```

## Environment Detection

```javascript
const { env } = require('./universal-cli.js');

console.log(env.isNode);    // true in Node.js
console.log(env.isBrowser); // true in browser
console.log(env.isDeno);    // true in Deno
console.log(env.isBun);     // true in Bun
console.log(env.isPuter);   // true in Puter
console.log(env.isCLI);     // true if Node/Deno/Bun
```

## Files

| File | Size | ES Version | Description |
|------|------|------------|-------------|
| `universal-cli.js` | ~15KB | ES6 | Full-featured version |
| `universal-cli-es3.js` | ~12KB | ES3 | Legacy/Puter compatible |
| `example-node-cli.js` | ~4KB | ES6 | Node.js example |
| `example-browser.html` | ~8KB | ES6 | Browser example |

## Comparison with citty

| Feature | citty | Universal CLI |
|---------|-------|---------------|
| Node.js support | ✅ | ✅ |
| Browser support | ❌ | ✅ |
| ES3 compatible | ❌ | ✅ |
| Dependencies | consola | **None** |
| Subcommands | ✅ | ✅ |
| Auto help | ✅ | ✅ |
| Colors | via consola | Built-in |
| Progress/Spinners | ❌ | ✅ |
| Box/Table | ❌ | ✅ |

## License

MIT
