#!/usr/bin/env node
/**
 * Example: Node.js CLI Application
 * Run: node example-node-cli.js --help
 * Run: node example-node-cli.js greet --name "World" --friendly
 * Run: node example-node-cli.js calc add 5 3
 */

const cli = require('./universal-cli.js');
const { defineCommand, runMain, colors: c, progress, format } = cli;

// Define subcommand: greet
const greetCommand = defineCommand({
    meta: {
        name: 'greet',
        description: 'Greet someone'
    },
    args: {
        name: {
            type: 'string',
            alias: 'n',
            description: 'Name to greet',
            default: 'World'
        },
        friendly: {
            type: 'boolean',
            alias: 'f',
            description: 'Use friendly greeting'
        },
        times: {
            type: 'string',
            alias: 't',
            description: 'Number of times to greet',
            default: '1'
        }
    },
    run({ args }) {
        const greeting = args.friendly ? 'Hi' : 'Hello';
        const times = parseInt(args.times, 10);
        
        for (let i = 0; i < times; i++) {
            console.log(c.green(`${greeting}, ${args.name}!`));
        }
        
        return { greeting, name: args.name, times };
    }
});

// Define subcommand: calc
const calcCommand = defineCommand({
    meta: {
        name: 'calc',
        description: 'Simple calculator'
    },
    subCommands: {
        add: defineCommand({
            meta: { name: 'add', description: 'Add two numbers' },
            args: {
                a: { type: 'positional', description: 'First number', required: true },
                b: { type: 'positional', description: 'Second number', required: true }
            },
            run({ args }) {
                const result = parseFloat(args.a) + parseFloat(args.b);
                console.log(c.cyan(`${args.a} + ${args.b} = `) + c.bold(c.yellow(result)));
                return result;
            }
        }),
        sub: defineCommand({
            meta: { name: 'sub', description: 'Subtract two numbers' },
            args: {
                a: { type: 'positional', description: 'First number', required: true },
                b: { type: 'positional', description: 'Second number', required: true }
            },
            run({ args }) {
                const result = parseFloat(args.a) - parseFloat(args.b);
                console.log(c.cyan(`${args.a} - ${args.b} = `) + c.bold(c.yellow(result)));
                return result;
            }
        }),
        mul: defineCommand({
            meta: { name: 'mul', description: 'Multiply two numbers' },
            args: {
                a: { type: 'positional', description: 'First number', required: true },
                b: { type: 'positional', description: 'Second number', required: true }
            },
            run({ args }) {
                const result = parseFloat(args.a) * parseFloat(args.b);
                console.log(c.cyan(`${args.a} × ${args.b} = `) + c.bold(c.yellow(result)));
                return result;
            }
        })
    },
    run({ args }) {
        // Show calc help if no subcommand
        cli.showUsage(calcCommand);
    }
});

// Define subcommand: demo
const demoCommand = defineCommand({
    meta: {
        name: 'demo',
        description: 'Demonstrate CLI features'
    },
    args: {
        feature: {
            type: 'positional',
            description: 'Feature to demo: colors, box, table, progress, spinner'
        }
    },
    run({ args }) {
        const feature = args.feature || 'all';
        
        if (feature === 'colors' || feature === 'all') {
            console.log('\n' + c.bold('=== Colors Demo ==='));
            console.log(c.red('Red') + ' ' + c.green('Green') + ' ' + c.blue('Blue'));
            console.log(c.yellow('Yellow') + ' ' + c.magenta('Magenta') + ' ' + c.cyan('Cyan'));
            console.log(c.bold('Bold') + ' ' + c.dim('Dim') + ' ' + c.italic('Italic'));
            console.log(c.underline('Underline') + ' ' + c.strikethrough('Strike'));
            console.log(c.bgRed(c.white(' White on Red ')) + ' ' + c.bgGreen(c.black(' Black on Green ')));
            console.log(c.fg256(208)('256 Color Orange') + ' ' + c.rgb(128, 0, 255)('RGB Purple'));
        }
        
        if (feature === 'box' || feature === 'all') {
            console.log('\n' + c.bold('=== Box Demo ==='));
            console.log(format.box('Hello World!\nThis is a box.', { style: 'round' }));
            console.log(format.box(c.green('Success!'), { style: 'double', padding: 2 }));
        }
        
        if (feature === 'table' || feature === 'all') {
            console.log('\n' + c.bold('=== Table Demo ==='));
            console.log(format.table(
                ['Name', 'Language', 'Stars'],
                [
                    ['citty', 'TypeScript', '1k'],
                    ['universal-cli', 'JavaScript', 'New!'],
                    ['commander', 'JavaScript', '25k']
                ]
            ));
        }
        
        if (feature === 'progress' || feature === 'all') {
            console.log('\n' + c.bold('=== Progress Bar Demo ==='));
            for (let i = 0; i <= 100; i += 20) {
                console.log(progress.bar(i, 100, { label: 'Loading' }));
            }
        }
        
        if (feature === 'spinner' || feature === 'all') {
            console.log('\n' + c.bold('=== Spinner Demo ==='));
            const spinner = progress.spinner({ text: 'Processing...' });
            spinner.start();
            
            setTimeout(() => {
                spinner.succeed('Done!');
            }, 2000);
            
            return new Promise(resolve => setTimeout(resolve, 2100));
        }
    }
});

// Main command
const mainCommand = defineCommand({
    meta: {
        name: 'mycli',
        version: '1.0.0',
        description: 'Example CLI application built with Universal CLI'
    },
    args: {
        verbose: {
            type: 'boolean',
            alias: 'v',
            description: 'Enable verbose output'
        }
    },
    subCommands: {
        greet: greetCommand,
        calc: calcCommand,
        demo: demoCommand
    },
    run({ args }) {
        // Show help if no subcommand
        cli.showUsage(mainCommand);
    }
});

// Run the CLI
runMain(mainCommand);
