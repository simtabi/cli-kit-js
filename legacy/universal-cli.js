/**
 * Universal CLI Library
 * Works in: Node.js CLI, Browser, Puter, Deno, Bun
 * ES3 compatible core with environment detection
 * 
 * Inspired by: citty, mri, commander
 */

(function(global) {
    'use strict';

    // ============================================================
    // ENVIRONMENT DETECTION
    // ============================================================
    
    var ENV = {
        isNode: typeof process !== 'undefined' && 
                process.versions != null && 
                process.versions.node != null,
        isBrowser: typeof window !== 'undefined' && 
                   typeof document !== 'undefined',
        isDeno: typeof Deno !== 'undefined',
        isBun: typeof Bun !== 'undefined',
        isPuter: typeof puter !== 'undefined',
        isWorker: typeof WorkerGlobalScope !== 'undefined'
    };
    
    ENV.isCLI = ENV.isNode || ENV.isDeno || ENV.isBun;
    ENV.hasProcess = typeof process !== 'undefined';
    ENV.hasWindow = typeof window !== 'undefined';

    // ============================================================
    // ANSI COLORS (works in CLI, stripped in browser)
    // ============================================================
    
    var ANSI = (function() {
        var ESC = '\x1b[';
        var enabled = ENV.isCLI;
        
        function wrap(open, close) {
            return function(str) {
                if (!enabled) return str;
                return ESC + open + 'm' + str + ESC + close + 'm';
            };
        }
        
        return {
            enabled: enabled,
            setEnabled: function(val) { enabled = !!val; },
            
            // Styles
            reset: wrap(0, 0),
            bold: wrap(1, 22),
            dim: wrap(2, 22),
            italic: wrap(3, 23),
            underline: wrap(4, 24),
            inverse: wrap(7, 27),
            strikethrough: wrap(9, 29),
            
            // Foreground
            black: wrap(30, 39),
            red: wrap(31, 39),
            green: wrap(32, 39),
            yellow: wrap(33, 39),
            blue: wrap(34, 39),
            magenta: wrap(35, 39),
            cyan: wrap(36, 39),
            white: wrap(37, 39),
            gray: wrap(90, 39),
            grey: wrap(90, 39),
            
            // Bright foreground
            brightRed: wrap(91, 39),
            brightGreen: wrap(92, 39),
            brightYellow: wrap(93, 39),
            brightBlue: wrap(94, 39),
            brightMagenta: wrap(95, 39),
            brightCyan: wrap(96, 39),
            brightWhite: wrap(97, 39),
            
            // Background
            bgBlack: wrap(40, 49),
            bgRed: wrap(41, 49),
            bgGreen: wrap(42, 49),
            bgYellow: wrap(43, 49),
            bgBlue: wrap(44, 49),
            bgMagenta: wrap(45, 49),
            bgCyan: wrap(46, 49),
            bgWhite: wrap(47, 49),
            
            // 256 colors
            fg256: function(n) {
                return function(str) {
                    if (!enabled) return str;
                    return ESC + '38;5;' + n + 'm' + str + ESC + '39m';
                };
            },
            bg256: function(n) {
                return function(str) {
                    if (!enabled) return str;
                    return ESC + '48;5;' + n + 'm' + str + ESC + '49m';
                };
            },
            
            // RGB/Truecolor
            rgb: function(r, g, b) {
                return function(str) {
                    if (!enabled) return str;
                    return ESC + '38;2;' + r + ';' + g + ';' + b + 'm' + str + ESC + '39m';
                };
            },
            bgRgb: function(r, g, b) {
                return function(str) {
                    if (!enabled) return str;
                    return ESC + '48;2;' + r + ';' + g + ';' + b + 'm' + str + ESC + '39m';
                };
            },
            
            // Strip ANSI codes
            strip: function(str) {
                return str.replace(/\x1b\[[0-9;]*m/g, '');
            }
        };
    })();

    // ============================================================
    // OUTPUT ABSTRACTION
    // ============================================================
    
    var Output = (function() {
        var buffer = [];
        var outputElement = null;
        
        function write(str) {
            if (ENV.isCLI && ENV.hasProcess) {
                process.stdout.write(str);
            } else if (ENV.isBrowser) {
                buffer.push(str);
                if (outputElement) {
                    outputElement.textContent += str;
                }
            }
        }
        
        function writeln(str) {
            write((str || '') + '\n');
        }
        
        function error(str) {
            if (ENV.isCLI && ENV.hasProcess) {
                process.stderr.write(str + '\n');
            } else {
                writeln(str);
            }
        }
        
        function clear() {
            buffer = [];
            if (ENV.isCLI && ENV.hasProcess) {
                process.stdout.write('\x1bc');
            } else if (outputElement) {
                outputElement.textContent = '';
            }
        }
        
        return {
            write: write,
            writeln: writeln,
            log: writeln,
            error: error,
            clear: clear,
            getBuffer: function() { return buffer.join(''); },
            clearBuffer: function() { buffer = []; },
            setElement: function(el) { outputElement = el; }
        };
    })();

    // ============================================================
    // INPUT ABSTRACTION
    // ============================================================
    
    var Input = (function() {
        // Get command line arguments
        function getArgs() {
            if (ENV.isNode && ENV.hasProcess) {
                return process.argv.slice(2);
            }
            if (ENV.isDeno) {
                return Deno.args;
            }
            if (ENV.isBun && ENV.hasProcess) {
                return process.argv.slice(2);
            }
            // Browser: check URL params or return empty
            if (ENV.isBrowser) {
                var params = new URLSearchParams(window.location.search);
                var args = params.get('args');
                return args ? args.split(' ') : [];
            }
            return [];
        }
        
        // Parse raw argument string (for browser/manual input)
        function parseRawArgs(str) {
            var args = [];
            var current = '';
            var inQuote = false;
            var quoteChar = '';
            
            for (var i = 0; i < str.length; i++) {
                var ch = str[i];
                
                if (!inQuote && (ch === '"' || ch === "'")) {
                    inQuote = true;
                    quoteChar = ch;
                } else if (inQuote && ch === quoteChar) {
                    inQuote = false;
                    quoteChar = '';
                } else if (!inQuote && ch === ' ') {
                    if (current.length > 0) {
                        args.push(current);
                        current = '';
                    }
                } else {
                    current += ch;
                }
            }
            
            if (current.length > 0) {
                args.push(current);
            }
            
            return args;
        }
        
        return {
            getArgs: getArgs,
            parseRawArgs: parseRawArgs
        };
    })();

    // ============================================================
    // ARGUMENT PARSER (mri-compatible)
    // ============================================================
    
    function parseArgs(args, options) {
        var opts = options || {};
        var result = { _: [] };
        var alias = opts.alias || {};
        var defaults = opts.default || {};
        var booleans = opts.boolean || [];
        var strings = opts.string || [];
        
        // Build reverse alias map
        var aliasMap = {};
        for (var key in alias) {
            var targets = Array.isArray(alias[key]) ? alias[key] : [alias[key]];
            for (var t = 0; t < targets.length; t++) {
                aliasMap[targets[t]] = key;
            }
            aliasMap[key] = key;
        }
        
        // Apply defaults
        for (var d in defaults) {
            result[d] = defaults[d];
        }
        
        function setArg(key, value) {
            var realKey = aliasMap[key] || key;
            
            // Type coercion
            if (booleans.indexOf(realKey) > -1) {
                value = value === 'true' || value === true || value === '1';
            } else if (strings.indexOf(realKey) === -1 && typeof value === 'string') {
                // Try to parse numbers
                if (/^-?\d+$/.test(value)) {
                    value = parseInt(value, 10);
                } else if (/^-?\d*\.\d+$/.test(value)) {
                    value = parseFloat(value);
                }
            }
            
            result[realKey] = value;
            
            // Also set aliases
            var aliases = alias[realKey];
            if (aliases) {
                var aliasList = Array.isArray(aliases) ? aliases : [aliases];
                for (var i = 0; i < aliasList.length; i++) {
                    result[aliasList[i]] = value;
                }
            }
        }
        
        var i = 0;
        while (i < args.length) {
            var arg = args[i];
            
            if (arg === '--') {
                // Everything after -- is positional
                result._ = result._.concat(args.slice(i + 1));
                break;
            }
            
            if (arg.indexOf('--no-') === 0) {
                // Negated boolean: --no-verbose
                setArg(arg.substring(5), false);
            } else if (arg.indexOf('--') === 0) {
                // Long option
                var eqIdx = arg.indexOf('=');
                var key, value;
                
                if (eqIdx > -1) {
                    key = arg.substring(2, eqIdx);
                    value = arg.substring(eqIdx + 1);
                    setArg(key, value);
                } else {
                    key = arg.substring(2);
                    var realKey = aliasMap[key] || key;
                    
                    if (booleans.indexOf(realKey) > -1) {
                        setArg(key, true);
                    } else if (i + 1 < args.length && args[i + 1].indexOf('-') !== 0) {
                        setArg(key, args[++i]);
                    } else {
                        setArg(key, true);
                    }
                }
            } else if (arg.indexOf('-') === 0 && arg.length > 1) {
                // Short option(s)
                var chars = arg.substring(1);
                
                for (var j = 0; j < chars.length; j++) {
                    var ch = chars[j];
                    var realCh = aliasMap[ch] || ch;
                    
                    if (j === chars.length - 1) {
                        // Last char can have a value
                        if (booleans.indexOf(realCh) > -1) {
                            setArg(ch, true);
                        } else if (i + 1 < args.length && args[i + 1].indexOf('-') !== 0) {
                            setArg(ch, args[++i]);
                        } else {
                            setArg(ch, true);
                        }
                    } else {
                        setArg(ch, true);
                    }
                }
            } else {
                // Positional argument
                result._.push(arg);
            }
            i++;
        }
        
        return result;
    }

    // ============================================================
    // COMMAND DEFINITION (citty-compatible)
    // ============================================================
    
    function defineCommand(config) {
        return {
            meta: config.meta || {},
            args: config.args || {},
            subCommands: config.subCommands || null,
            setup: config.setup || null,
            run: config.run || function() {},
            cleanup: config.cleanup || null
        };
    }

    // ============================================================
    // USAGE/HELP GENERATION
    // ============================================================
    
    function renderUsage(command, options) {
        var opts = options || {};
        var colors = opts.colors !== false && ANSI.enabled;
        var meta = command.meta || {};
        var args = command.args || {};
        var subCommands = command.subCommands || {};
        var lines = [];
        
        // Helper for coloring
        var c = {
            title: colors ? ANSI.bold : function(s) { return s; },
            cmd: colors ? ANSI.cyan : function(s) { return s; },
            opt: colors ? ANSI.yellow : function(s) { return s; },
            desc: colors ? ANSI.gray : function(s) { return s; },
            req: colors ? ANSI.red : function(s) { return s; }
        };
        
        // Header
        if (meta.name) {
            var header = c.title(meta.name);
            if (meta.version) header += ' ' + c.desc('v' + meta.version);
            lines.push(header);
        }
        if (meta.description) {
            lines.push(c.desc(meta.description));
        }
        lines.push('');
        
        // Usage line
        var usageLine = c.title('USAGE:') + ' ' + c.cmd(meta.name || 'command');
        
        // Check for subcommands
        var hasSubCommands = false;
        for (var k in subCommands) { hasSubCommands = true; break; }
        if (hasSubCommands) {
            usageLine += ' ' + c.opt('<command>');
        }
        
        usageLine += ' ' + c.opt('[options]');
        
        // Check for positional args
        for (var name in args) {
            if (args[name].type === 'positional') {
                var pos = args[name].required ? '<' + name + '>' : '[' + name + ']';
                usageLine += ' ' + (args[name].required ? c.req(pos) : c.opt(pos));
            }
        }
        
        lines.push(usageLine);
        lines.push('');
        
        // Subcommands
        if (hasSubCommands) {
            lines.push(c.title('COMMANDS:'));
            for (var subName in subCommands) {
                var sub = subCommands[subName];
                var subDesc = (sub.meta && sub.meta.description) || '';
                lines.push('  ' + c.cmd(subName) + '  ' + c.desc(subDesc));
            }
            lines.push('');
        }
        
        // Options
        var hasOptions = false;
        for (var o in args) {
            if (args[o].type !== 'positional') {
                hasOptions = true;
                break;
            }
        }
        
        if (hasOptions) {
            lines.push(c.title('OPTIONS:'));
            for (var argName in args) {
                var arg = args[argName];
                if (arg.type === 'positional') continue;
                
                var optLine = '  ';
                if (arg.alias) {
                    optLine += c.opt('-' + arg.alias) + ', ';
                } else {
                    optLine += '    ';
                }
                optLine += c.opt('--' + argName);
                
                if (arg.type && arg.type !== 'boolean') {
                    optLine += ' <' + (arg.valueHint || arg.type) + '>';
                }
                
                // Pad for description
                var padLen = 30 - ANSI.strip(optLine).length;
                if (padLen < 2) padLen = 2;
                for (var p = 0; p < padLen; p++) optLine += ' ';
                
                if (arg.description) {
                    optLine += c.desc(arg.description);
                }
                if (arg.default !== undefined) {
                    optLine += c.desc(' (default: ' + arg.default + ')');
                }
                if (arg.required) {
                    optLine += ' ' + c.req('[required]');
                }
                
                lines.push(optLine);
            }
            lines.push('');
        }
        
        // Positional arguments help
        var hasPositional = false;
        for (var pa in args) {
            if (args[pa].type === 'positional') {
                hasPositional = true;
                break;
            }
        }
        
        if (hasPositional) {
            lines.push(c.title('ARGUMENTS:'));
            for (var posName in args) {
                var posArg = args[posName];
                if (posArg.type !== 'positional') continue;
                
                var posLine = '  ' + c.opt(posName);
                var posPad = 28 - posName.length;
                if (posPad < 2) posPad = 2;
                for (var pp = 0; pp < posPad; pp++) posLine += ' ';
                
                if (posArg.description) {
                    posLine += c.desc(posArg.description);
                }
                if (posArg.required) {
                    posLine += ' ' + c.req('[required]');
                }
                
                lines.push(posLine);
            }
            lines.push('');
        }
        
        return lines.join('\n');
    }
    
    function showUsage(command, options) {
        Output.writeln(renderUsage(command, options));
    }

    // ============================================================
    // COMMAND EXECUTION
    // ============================================================
    
    function runCommand(command, args, options) {
        var opts = options || {};
        
        // Check for subcommands FIRST - find the subcommand and pass remaining args
        if (command.subCommands) {
            // Find first non-flag argument (the subcommand name)
            var subIdx = -1;
            var subName = null;
            
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                // Skip flags and their values
                if (arg === '--help' || arg === '-h') {
                    // Show help for this command
                    showUsage(command, opts);
                    return { type: 'help', code: 0 };
                }
                if (arg === '--version' || arg === '-V') {
                    if (command.meta && command.meta.version) {
                        Output.writeln(command.meta.version);
                        return { type: 'version', code: 0 };
                    }
                }
                if (arg.indexOf('-') !== 0) {
                    // This is a positional - check if it's a subcommand
                    if (command.subCommands[arg]) {
                        subIdx = i;
                        subName = arg;
                        break;
                    }
                }
            }
            
            if (subName && subIdx >= 0) {
                // Found a subcommand - pass all args after it to the subcommand
                var subArgs = args.slice(subIdx + 1);
                return runCommand(command.subCommands[subName], subArgs, opts);
            }
        }
        
        // Build parser options from command args definition
        var parserOpts = {
            alias: {},
            default: {},
            boolean: [],
            string: []
        };
        
        // Always support --help and --version
        parserOpts.alias.h = 'help';
        parserOpts.alias.V = 'version';
        parserOpts.boolean.push('help', 'version');
        
        for (var name in command.args) {
            var arg = command.args[name];
            if (arg.alias) {
                parserOpts.alias[arg.alias] = name;
            }
            if (arg.default !== undefined) {
                parserOpts.default[name] = arg.default;
            }
            if (arg.type === 'boolean') {
                parserOpts.boolean.push(name);
            }
            if (arg.type === 'string') {
                parserOpts.string.push(name);
            }
        }
        
        var parsed = parseArgs(args, parserOpts);
        
        // Handle --help
        if (parsed.help) {
            showUsage(command, opts);
            return { type: 'help', code: 0 };
        }
        
        // Handle --version
        if (parsed.version && command.meta && command.meta.version) {
            Output.writeln(command.meta.version);
            return { type: 'version', code: 0 };
        }
        
        // Handle unknown subcommand
        if (command.subCommands && parsed._.length > 0) {
            var unknownCmd = parsed._[0];
            Output.error(ANSI.red('Unknown command: ') + unknownCmd);
            Output.writeln('');
            showUsage(command, opts);
            return { type: 'error', code: 1, error: 'Unknown command: ' + unknownCmd };
        }
        
        // Validate required args
        var errors = [];
        var positionalIndex = 0;
        
        for (var argName in command.args) {
            var argDef = command.args[argName];
            
            if (argDef.type === 'positional') {
                if (argDef.required && parsed._[positionalIndex] === undefined) {
                    errors.push('Missing required argument: ' + argName);
                }
                // Map positional to named
                if (parsed._[positionalIndex] !== undefined) {
                    parsed[argName] = parsed._[positionalIndex];
                }
                positionalIndex++;
            } else if (argDef.required && parsed[argName] === undefined) {
                errors.push('Missing required option: --' + argName);
            }
        }
        
        if (errors.length > 0) {
            for (var e = 0; e < errors.length; e++) {
                Output.error(ANSI.red('Error: ') + errors[e]);
            }
            Output.writeln('');
            showUsage(command, opts);
            return { type: 'error', code: 1, errors: errors };
        }
        
        // Run setup hook
        if (command.setup) {
            try {
                command.setup({ args: parsed, command: command });
            } catch (err) {
                Output.error(ANSI.red('Setup error: ') + err.message);
                return { type: 'error', code: 1, error: err };
            }
        }
        
        // Run the command
        var result;
        try {
            result = command.run({ args: parsed, command: command });
        } catch (err) {
            Output.error(ANSI.red('Error: ') + err.message);
            if (command.cleanup) {
                command.cleanup({ args: parsed, command: command, error: err });
            }
            return { type: 'error', code: 1, error: err };
        }
        
        // Run cleanup hook
        if (command.cleanup) {
            command.cleanup({ args: parsed, command: command, result: result });
        }
        
        return { type: 'success', code: 0, result: result };
    }

    // ============================================================
    // MAIN ENTRY POINT (for CLI)
    // ============================================================
    
    function runMain(command, options) {
        var opts = options || {};
        var args = opts.args || Input.getArgs();
        
        var result = runCommand(command, args, opts);
        
        // Exit with code in CLI environments
        if (ENV.isCLI && ENV.hasProcess && opts.exit !== false) {
            if (result.code !== 0) {
                process.exit(result.code);
            }
        }
        
        return result;
    }
    
    // Create a main wrapper
    function createMain(command, options) {
        return function(args) {
            var opts = Object.assign({}, options || {});
            if (args) opts.args = args;
            return runMain(command, opts);
        };
    }

    // ============================================================
    // INTERACTIVE PROMPT (works in Node.js, limited in browser)
    // ============================================================
    
    var Prompt = (function() {
        // Simple sync prompt for Node.js (requires readline)
        function promptSync(question, defaultValue) {
            if (!ENV.isNode) {
                // Browser fallback
                if (ENV.isBrowser) {
                    return window.prompt(question, defaultValue || '') || defaultValue;
                }
                return defaultValue;
            }
            
            // Node.js - use readline
            var readline = require('readline');
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            return new Promise(function(resolve) {
                var prompt = question;
                if (defaultValue !== undefined) {
                    prompt += ' (' + defaultValue + ')';
                }
                prompt += ': ';
                
                rl.question(prompt, function(answer) {
                    rl.close();
                    resolve(answer || defaultValue);
                });
            });
        }
        
        // Confirm prompt
        function confirm(question, defaultValue) {
            if (!ENV.isNode) {
                if (ENV.isBrowser) {
                    return Promise.resolve(window.confirm(question));
                }
                return Promise.resolve(defaultValue !== false);
            }
            
            var defStr = defaultValue !== false ? 'Y/n' : 'y/N';
            return promptSync(question + ' [' + defStr + ']').then(function(answer) {
                if (!answer) return defaultValue !== false;
                return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
            });
        }
        
        // Select from options
        function select(question, choices, defaultIndex) {
            if (!ENV.isNode) {
                // Browser fallback - use native prompt
                var opts = choices.map(function(c, i) {
                    return (i + 1) + '. ' + (c.label || c);
                }).join('\n');
                var result = window.prompt(question + '\n' + opts + '\n\nEnter number:', (defaultIndex || 0) + 1);
                var idx = parseInt(result, 10) - 1;
                return Promise.resolve(choices[idx] ? (choices[idx].value || choices[idx]) : null);
            }
            
            Output.writeln(question);
            choices.forEach(function(choice, i) {
                var label = choice.label || choice;
                var marker = i === defaultIndex ? ANSI.cyan('> ') : '  ';
                Output.writeln(marker + (i + 1) + '. ' + label);
            });
            
            return promptSync('Select [1-' + choices.length + ']', (defaultIndex || 0) + 1).then(function(answer) {
                var idx = parseInt(answer, 10) - 1;
                if (idx >= 0 && idx < choices.length) {
                    return choices[idx].value !== undefined ? choices[idx].value : choices[idx];
                }
                return null;
            });
        }
        
        return {
            text: promptSync,
            confirm: confirm,
            select: select
        };
    })();

    // ============================================================
    // PROGRESS & SPINNERS
    // ============================================================
    
    var Progress = (function() {
        var spinnerFrames = {
            dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
            line: ['-', '\\', '|', '/'],
            arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
            circle: ['◐', '◓', '◑', '◒'],
            arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
            bounce: ['⠁', '⠂', '⠄', '⠂']
        };
        
        function repeat(ch, n) {
            var s = '';
            for (var i = 0; i < n; i++) s += ch;
            return s;
        }
        
        // Progress bar
        function bar(current, total, options) {
            var opts = options || {};
            var width = opts.width || 40;
            var complete = opts.complete || '█';
            var incomplete = opts.incomplete || '░';
            var showPercent = opts.percent !== false;
            
            var percent = Math.floor((current / total) * 100);
            var filled = Math.floor((current / total) * width);
            var empty = width - filled;
            
            var bar = repeat(complete, filled) + repeat(incomplete, empty);
            var result = '[' + bar + ']';
            
            if (showPercent) {
                result += ' ' + percent + '%';
            }
            if (opts.label) {
                result = opts.label + ' ' + result;
            }
            
            return result;
        }
        
        // Spinner (returns controller)
        function spinner(options) {
            var opts = options || {};
            var frames = spinnerFrames[opts.style] || spinnerFrames.dots;
            var interval = opts.interval || 80;
            var text = opts.text || '';
            var frame = 0;
            var timer = null;
            var isRunning = false;
            
            function render() {
                if (ENV.isCLI && ENV.hasProcess) {
                    process.stdout.write('\r' + frames[frame] + ' ' + text + '\x1b[K');
                }
                frame = (frame + 1) % frames.length;
            }
            
            return {
                start: function(msg) {
                    if (msg) text = msg;
                    if (!isRunning) {
                        isRunning = true;
                        timer = setInterval(render, interval);
                    }
                    return this;
                },
                stop: function(finalMsg) {
                    if (timer) {
                        clearInterval(timer);
                        timer = null;
                    }
                    isRunning = false;
                    if (ENV.isCLI && ENV.hasProcess) {
                        process.stdout.write('\r\x1b[K');
                        if (finalMsg) {
                            Output.writeln(finalMsg);
                        }
                    }
                    return this;
                },
                succeed: function(msg) {
                    return this.stop(ANSI.green('✔') + ' ' + (msg || text));
                },
                fail: function(msg) {
                    return this.stop(ANSI.red('✖') + ' ' + (msg || text));
                },
                warn: function(msg) {
                    return this.stop(ANSI.yellow('⚠') + ' ' + (msg || text));
                },
                info: function(msg) {
                    return this.stop(ANSI.blue('ℹ') + ' ' + (msg || text));
                },
                setText: function(msg) {
                    text = msg;
                    return this;
                }
            };
        }
        
        return {
            bar: bar,
            spinner: spinner,
            frames: spinnerFrames
        };
    })();

    // ============================================================
    // BOX & TABLE UTILITIES
    // ============================================================
    
    var Format = (function() {
        var boxChars = {
            single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
            double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
            round:  { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
            bold:   { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
            ascii:  { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }
        };
        
        function repeat(ch, n) {
            var s = '';
            for (var i = 0; i < n; i++) s += ch;
            return s;
        }
        
        function box(text, options) {
            var opts = options || {};
            var c = boxChars[opts.style] || boxChars.single;
            var padding = opts.padding !== undefined ? opts.padding : 1;
            var lines = text.split('\n');
            var maxLen = 0;
            
            for (var i = 0; i < lines.length; i++) {
                var len = ANSI.strip(lines[i]).length;
                if (len > maxLen) maxLen = len;
            }
            
            var innerWidth = maxLen + (padding * 2);
            var top = c.tl + repeat(c.h, innerWidth) + c.tr;
            var bot = c.bl + repeat(c.h, innerWidth) + c.br;
            var result = [top];
            
            for (var j = 0; j < lines.length; j++) {
                var line = lines[j];
                var lineLen = ANSI.strip(line).length;
                var rightPad = maxLen - lineLen;
                result.push(c.v + repeat(' ', padding) + line + repeat(' ', rightPad + padding) + c.v);
            }
            
            result.push(bot);
            return result.join('\n');
        }
        
        function table(headers, rows, options) {
            var opts = options || {};
            var colWidths = [];
            var i, j, row;
            
            // Calculate column widths
            for (i = 0; i < headers.length; i++) {
                colWidths[i] = ANSI.strip(String(headers[i])).length;
            }
            for (i = 0; i < rows.length; i++) {
                row = rows[i];
                for (j = 0; j < row.length; j++) {
                    var len = ANSI.strip(String(row[j])).length;
                    if (!colWidths[j] || len > colWidths[j]) {
                        colWidths[j] = len;
                    }
                }
            }
            
            var chars = {
                tl: '┌', tr: '┐', bl: '└', br: '┘',
                h: '─', v: '│',
                ml: '├', mr: '┤', mt: '┬', mb: '┴', mm: '┼'
            };
            
            function buildSep(left, mid, right) {
                var parts = [];
                for (var k = 0; k < colWidths.length; k++) {
                    parts.push(repeat(chars.h, colWidths[k] + 2));
                }
                return left + parts.join(mid) + right;
            }
            
            function buildRow(cells, bold) {
                var parts = [];
                for (var k = 0; k < colWidths.length; k++) {
                    var cell = String(cells[k] || '');
                    var cellLen = ANSI.strip(cell).length;
                    var pad = colWidths[k] - cellLen;
                    var content = ' ' + cell + repeat(' ', pad) + ' ';
                    if (bold) content = ANSI.bold(content);
                    parts.push(content);
                }
                return chars.v + parts.join(chars.v) + chars.v;
            }
            
            var lines = [];
            lines.push(buildSep(chars.tl, chars.mt, chars.tr));
            lines.push(buildRow(headers, true));
            lines.push(buildSep(chars.ml, chars.mm, chars.mr));
            for (i = 0; i < rows.length; i++) {
                lines.push(buildRow(rows[i], false));
            }
            lines.push(buildSep(chars.bl, chars.mb, chars.br));
            
            return lines.join('\n');
        }
        
        return {
            box: box,
            table: table,
            boxChars: boxChars
        };
    })();

    // ============================================================
    // SYMBOLS
    // ============================================================
    
    var Symbols = {
        tick: '✔',
        cross: '✖',
        star: '★',
        info: 'ℹ',
        warning: '⚠',
        heart: '♥',
        bullet: '●',
        pointer: '❯',
        arrowRight: '→',
        arrowLeft: '←',
        arrowUp: '↑',
        arrowDown: '↓',
        radioOn: '◉',
        radioOff: '◯',
        checkboxOn: '☑',
        checkboxOff: '☐'
    };
    
    // ASCII fallbacks
    var SymbolsASCII = {
        tick: '√',
        cross: 'x',
        star: '*',
        info: 'i',
        warning: '!',
        heart: '<3',
        bullet: '*',
        pointer: '>',
        arrowRight: '->',
        arrowLeft: '<-',
        arrowUp: '^',
        arrowDown: 'v',
        radioOn: '(*)',
        radioOff: '( )',
        checkboxOn: '[x]',
        checkboxOff: '[ ]'
    };

    // ============================================================
    // EXPORT
    // ============================================================
    
    var UniversalCLI = {
        // Environment
        env: ENV,
        
        // Core
        defineCommand: defineCommand,
        parseArgs: parseArgs,
        runCommand: runCommand,
        runMain: runMain,
        createMain: createMain,
        
        // Help/Usage
        renderUsage: renderUsage,
        showUsage: showUsage,
        
        // I/O
        input: Input,
        output: Output,
        
        // Colors
        colors: ANSI,
        c: ANSI, // shorthand
        
        // Prompts
        prompt: Prompt,
        
        // Progress
        progress: Progress,
        
        // Formatting
        format: Format,
        box: Format.box,
        table: Format.table,
        
        // Symbols
        symbols: Symbols,
        symbolsASCII: SymbolsASCII,
        
        // Version
        version: '1.0.0'
    };

    // Export for different module systems
    if (typeof module !== 'undefined' && module.exports) {
        // CommonJS (Node.js)
        module.exports = UniversalCLI;
    }
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(function() { return UniversalCLI; });
    }
    if (typeof global !== 'undefined') {
        // Global (Browser/Puter)
        global.UniversalCLI = UniversalCLI;
        global.ucli = UniversalCLI; // shorthand
    }

})(typeof globalThis !== 'undefined' ? globalThis : 
   typeof window !== 'undefined' ? window : 
   typeof global !== 'undefined' ? global : 
   typeof self !== 'undefined' ? self : this);
