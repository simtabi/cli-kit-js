/**
 * Universal CLI - ES3 Minimal Version
 * For: Puter, IE9+, legacy JavaScript environments
 * 
 * Features:
 * - Argument parsing (mri-compatible)
 * - Command definition (citty-style)
 * - Colors (ANSI escape codes)
 * - Box/Table formatting
 * - Progress bars
 * - Environment detection
 * 
 * No dependencies. No modern JS features.
 */

(function(root) {

    // ============================================
    // POLYFILLS
    // ============================================
    
    // Array.isArray polyfill
    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }
    
    // String.prototype.trim polyfill
    if (!String.prototype.trim) {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    // ============================================
    // ENVIRONMENT
    // ============================================
    
    var ENV = {};
    
    try { ENV.isNode = typeof process !== 'undefined' && process.versions && process.versions.node; } catch(e) { ENV.isNode = false; }
    try { ENV.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'; } catch(e) { ENV.isBrowser = false; }
    try { ENV.isDeno = typeof Deno !== 'undefined'; } catch(e) { ENV.isDeno = false; }
    try { ENV.isPuter = typeof puter !== 'undefined'; } catch(e) { ENV.isPuter = false; }
    
    ENV.isCLI = ENV.isNode || ENV.isDeno;
    ENV.hasProcess = typeof process !== 'undefined';

    // ============================================
    // HELPERS
    // ============================================
    
    function repeat(str, n) {
        var result = '';
        for (var i = 0; i < n; i++) {
            result += str;
        }
        return result;
    }
    
    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }
    
    function indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    // ============================================
    // COLORS
    // ============================================
    
    var Colors = (function() {
        var ESC = '\x1b[';
        var enabled = ENV.isCLI;
        
        function wrap(open, close) {
            return function(str) {
                if (!enabled) return str;
                return ESC + open + 'm' + str + ESC + close + 'm';
            };
        }
        
        var colors = {
            // Control
            enabled: enabled,
            setEnabled: function(val) { enabled = !!val; colors.enabled = enabled; },
            
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
            
            // Bright
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
            
            // 256 color
            fg256: function(n) {
                return function(str) {
                    if (!enabled) return str;
                    return ESC + '38;5;' + n + 'm' + str + ESC + '39m';
                };
            },
            
            // RGB
            rgb: function(r, g, b) {
                return function(str) {
                    if (!enabled) return str;
                    return ESC + '38;2;' + r + ';' + g + ';' + b + 'm' + str + ESC + '39m';
                };
            },
            
            // Strip ANSI
            strip: function(str) {
                return str.replace(/\x1b\[[0-9;]*m/g, '');
            }
        };
        
        return colors;
    })();

    // ============================================
    // OUTPUT
    // ============================================
    
    var Output = {
        buffer: [],
        element: null,
        
        write: function(str) {
            if (ENV.isCLI && ENV.hasProcess) {
                process.stdout.write(str);
            } else {
                this.buffer.push(str);
                if (this.element) {
                    this.element.textContent += str;
                }
            }
        },
        
        writeln: function(str) {
            this.write((str || '') + '\n');
        },
        
        error: function(str) {
            if (ENV.isCLI && ENV.hasProcess) {
                process.stderr.write(str + '\n');
            } else {
                this.writeln(str);
            }
        },
        
        getBuffer: function() {
            return this.buffer.join('');
        },
        
        clearBuffer: function() {
            this.buffer = [];
        },
        
        setElement: function(el) {
            this.element = el;
        }
    };

    // ============================================
    // INPUT
    // ============================================
    
    var Input = {
        getArgs: function() {
            if (ENV.isNode && ENV.hasProcess) {
                return process.argv.slice(2);
            }
            if (ENV.isDeno) {
                return Deno.args;
            }
            return [];
        },
        
        parseRawArgs: function(str) {
            var args = [];
            var current = '';
            var inQuote = false;
            var quoteChar = '';
            
            for (var i = 0; i < str.length; i++) {
                var ch = str.charAt(i);
                
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
    };

    // ============================================
    // ARGUMENT PARSER
    // ============================================
    
    function parseArgs(args, options) {
        var opts = options || {};
        var result = { _: [] };
        var alias = opts.alias || {};
        var defaults = opts['default'] || {};
        var booleans = opts['boolean'] || [];
        var strings = opts.string || [];
        
        // Build alias map
        var aliasMap = {};
        for (var key in alias) {
            if (alias.hasOwnProperty(key)) {
                var targets = Array.isArray(alias[key]) ? alias[key] : [alias[key]];
                for (var t = 0; t < targets.length; t++) {
                    aliasMap[targets[t]] = key;
                }
                aliasMap[key] = key;
            }
        }
        
        // Apply defaults
        for (var d in defaults) {
            if (defaults.hasOwnProperty(d)) {
                result[d] = defaults[d];
            }
        }
        
        function setArg(key, value) {
            var realKey = aliasMap[key] || key;
            
            // Type coercion
            if (indexOf(booleans, realKey) > -1) {
                value = value === 'true' || value === true || value === '1';
            } else if (indexOf(strings, realKey) === -1 && typeof value === 'string') {
                if (/^-?\d+$/.test(value)) {
                    value = parseInt(value, 10);
                } else if (/^-?\d*\.\d+$/.test(value)) {
                    value = parseFloat(value);
                }
            }
            
            result[realKey] = value;
            
            // Set aliases
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
                result._ = result._.concat(args.slice(i + 1));
                break;
            }
            
            if (arg.indexOf('--no-') === 0) {
                setArg(arg.substring(5), false);
            } else if (arg.indexOf('--') === 0) {
                var eqIdx = arg.indexOf('=');
                var key, value;
                
                if (eqIdx > -1) {
                    key = arg.substring(2, eqIdx);
                    value = arg.substring(eqIdx + 1);
                    setArg(key, value);
                } else {
                    key = arg.substring(2);
                    var realKey = aliasMap[key] || key;
                    
                    if (indexOf(booleans, realKey) > -1) {
                        setArg(key, true);
                    } else if (i + 1 < args.length && args[i + 1].indexOf('-') !== 0) {
                        i++;
                        setArg(key, args[i]);
                    } else {
                        setArg(key, true);
                    }
                }
            } else if (arg.indexOf('-') === 0 && arg.length > 1) {
                var chars = arg.substring(1);
                
                for (var j = 0; j < chars.length; j++) {
                    var ch = chars.charAt(j);
                    var realCh = aliasMap[ch] || ch;
                    
                    if (j === chars.length - 1) {
                        if (indexOf(booleans, realCh) > -1) {
                            setArg(ch, true);
                        } else if (i + 1 < args.length && args[i + 1].indexOf('-') !== 0) {
                            i++;
                            setArg(ch, args[i]);
                        } else {
                            setArg(ch, true);
                        }
                    } else {
                        setArg(ch, true);
                    }
                }
            } else {
                result._.push(arg);
            }
            i++;
        }
        
        return result;
    }

    // ============================================
    // COMMAND DEFINITION
    // ============================================
    
    function defineCommand(config) {
        return {
            meta: config.meta || {},
            args: config.args || {},
            subCommands: config.subCommands || null,
            run: config.run || function() {}
        };
    }

    // ============================================
    // USAGE GENERATION
    // ============================================
    
    function renderUsage(command, options) {
        var opts = options || {};
        var useColors = opts.colors !== false && Colors.enabled;
        var meta = command.meta || {};
        var args = command.args || {};
        var subCommands = command.subCommands || {};
        var lines = [];
        
        // Color helpers
        var c = {
            title: useColors ? Colors.bold : function(s) { return s; },
            cmd: useColors ? Colors.cyan : function(s) { return s; },
            opt: useColors ? Colors.yellow : function(s) { return s; },
            desc: useColors ? Colors.gray : function(s) { return s; },
            req: useColors ? Colors.red : function(s) { return s; }
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
        
        // Usage
        var usageLine = c.title('USAGE:') + ' ' + c.cmd(meta.name || 'command');
        
        var hasSubCommands = false;
        for (var k in subCommands) {
            if (subCommands.hasOwnProperty(k)) {
                hasSubCommands = true;
                break;
            }
        }
        
        if (hasSubCommands) {
            usageLine += ' ' + c.opt('<command>');
        }
        usageLine += ' ' + c.opt('[options]');
        
        lines.push(usageLine);
        lines.push('');
        
        // Subcommands
        if (hasSubCommands) {
            lines.push(c.title('COMMANDS:'));
            for (var subName in subCommands) {
                if (subCommands.hasOwnProperty(subName)) {
                    var sub = subCommands[subName];
                    var subDesc = (sub.meta && sub.meta.description) || '';
                    lines.push('  ' + c.cmd(subName) + '  ' + c.desc(subDesc));
                }
            }
            lines.push('');
        }
        
        // Options
        var hasOptions = false;
        for (var o in args) {
            if (args.hasOwnProperty(o) && args[o].type !== 'positional') {
                hasOptions = true;
                break;
            }
        }
        
        if (hasOptions) {
            lines.push(c.title('OPTIONS:'));
            for (var argName in args) {
                if (!args.hasOwnProperty(argName)) continue;
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
                    optLine += ' <' + arg.type + '>';
                }
                
                var stripped = Colors.strip(optLine);
                var padLen = 28 - stripped.length;
                if (padLen < 2) padLen = 2;
                optLine += repeat(' ', padLen);
                
                if (arg.description) {
                    optLine += c.desc(arg.description);
                }
                if (arg['default'] !== undefined) {
                    optLine += c.desc(' (default: ' + arg['default'] + ')');
                }
                
                lines.push(optLine);
            }
            lines.push('');
        }
        
        return lines.join('\n');
    }
    
    function showUsage(command, options) {
        Output.writeln(renderUsage(command, options));
    }

    // ============================================
    // COMMAND EXECUTION
    // ============================================
    
    function runCommand(command, args, options) {
        var opts = options || {};
        
        // Check for subcommands FIRST - find the subcommand and pass remaining args
        if (command.subCommands) {
            var subIdx = -1;
            var subName = null;
            
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                // Skip help/version flags
                if (arg === '--help' || arg === '-h') {
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
                    // Check if it's a subcommand
                    if (command.subCommands[arg]) {
                        subIdx = i;
                        subName = arg;
                        break;
                    }
                }
            }
            
            if (subName && subIdx >= 0) {
                var subArgs = args.slice(subIdx + 1);
                return runCommand(command.subCommands[subName], subArgs, opts);
            }
        }
        
        // Build parser options
        var parserOpts = {
            alias: { h: 'help', V: 'version' },
            'default': {},
            'boolean': ['help', 'version'],
            string: []
        };
        
        for (var name in command.args) {
            if (!command.args.hasOwnProperty(name)) continue;
            var arg = command.args[name];
            
            if (arg.alias) {
                parserOpts.alias[arg.alias] = name;
            }
            if (arg['default'] !== undefined) {
                parserOpts['default'][name] = arg['default'];
            }
            if (arg.type === 'boolean') {
                parserOpts['boolean'].push(name);
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
            Output.error(Colors.red('Error: Unknown command: ') + unknownCmd);
            return { type: 'error', code: 1 };
        }
        
        // Map positional args
        var positionalIndex = 0;
        for (var argName in command.args) {
            if (!command.args.hasOwnProperty(argName)) continue;
            if (command.args[argName].type === 'positional') {
                if (parsed._[positionalIndex] !== undefined) {
                    parsed[argName] = parsed._[positionalIndex];
                }
                positionalIndex++;
            }
        }
        
        // Run command
        var result;
        try {
            result = command.run({ args: parsed, command: command });
        } catch (err) {
            Output.error(Colors.red('Error: ') + err.message);
            return { type: 'error', code: 1, error: err };
        }
        
        return { type: 'success', code: 0, result: result };
    }

    // ============================================
    // MAIN ENTRY
    // ============================================
    
    function runMain(command, options) {
        var opts = options || {};
        var args = opts.args || Input.getArgs();
        
        var result = runCommand(command, args, opts);
        
        if (ENV.isCLI && ENV.hasProcess && opts.exit !== false) {
            if (result.code !== 0) {
                process.exit(result.code);
            }
        }
        
        return result;
    }

    // ============================================
    // FORMATTING UTILITIES
    // ============================================
    
    var Format = {
        box: function(text, options) {
            var opts = options || {};
            var chars = {
                single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
                double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
                round:  { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
                ascii:  { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }
            };
            
            var c = chars[opts.style] || chars.single;
            var padding = opts.padding !== undefined ? opts.padding : 1;
            var lines = text.split('\n');
            var maxLen = 0;
            
            for (var i = 0; i < lines.length; i++) {
                var len = Colors.strip(lines[i]).length;
                if (len > maxLen) maxLen = len;
            }
            
            var innerWidth = maxLen + (padding * 2);
            var result = [c.tl + repeat(c.h, innerWidth) + c.tr];
            
            for (var j = 0; j < lines.length; j++) {
                var line = lines[j];
                var lineLen = Colors.strip(line).length;
                var rightPad = maxLen - lineLen;
                result.push(c.v + repeat(' ', padding) + line + repeat(' ', rightPad + padding) + c.v);
            }
            
            result.push(c.bl + repeat(c.h, innerWidth) + c.br);
            return result.join('\n');
        },
        
        table: function(headers, rows) {
            var colWidths = [];
            var i, j, row;
            
            for (i = 0; i < headers.length; i++) {
                colWidths[i] = Colors.strip(String(headers[i])).length;
            }
            
            for (i = 0; i < rows.length; i++) {
                row = rows[i];
                for (j = 0; j < row.length; j++) {
                    var len = Colors.strip(String(row[j])).length;
                    if (!colWidths[j] || len > colWidths[j]) {
                        colWidths[j] = len;
                    }
                }
            }
            
            var chars = { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', ml: '├', mr: '┤', mt: '┬', mb: '┴', mm: '┼' };
            
            function buildSep(left, mid, right) {
                var parts = [];
                for (var k = 0; k < colWidths.length; k++) {
                    parts.push(repeat(chars.h, colWidths[k] + 2));
                }
                return left + parts.join(mid) + right;
            }
            
            function buildRow(cells) {
                var parts = [];
                for (var k = 0; k < colWidths.length; k++) {
                    var cell = String(cells[k] || '');
                    var cellLen = Colors.strip(cell).length;
                    var pad = colWidths[k] - cellLen;
                    parts.push(' ' + cell + repeat(' ', pad) + ' ');
                }
                return chars.v + parts.join(chars.v) + chars.v;
            }
            
            var lines = [];
            lines.push(buildSep(chars.tl, chars.mt, chars.tr));
            lines.push(buildRow(headers));
            lines.push(buildSep(chars.ml, chars.mm, chars.mr));
            
            for (i = 0; i < rows.length; i++) {
                lines.push(buildRow(rows[i]));
            }
            
            lines.push(buildSep(chars.bl, chars.mb, chars.br));
            return lines.join('\n');
        },
        
        progressBar: function(current, total, options) {
            var opts = options || {};
            var width = opts.width || 40;
            var complete = opts.complete || '█';
            var incomplete = opts.incomplete || '░';
            
            var percent = Math.floor((current / total) * 100);
            var filled = Math.floor((current / total) * width);
            
            var bar = repeat(complete, filled) + repeat(incomplete, width - filled);
            var result = '[' + bar + '] ' + percent + '%';
            
            if (opts.label) {
                result = opts.label + ' ' + result;
            }
            
            return result;
        }
    };

    // ============================================
    // SYMBOLS
    // ============================================
    
    var Symbols = {
        tick: '✔', cross: '✖', star: '★', info: 'ℹ', warning: '⚠',
        heart: '♥', bullet: '●', pointer: '❯',
        arrowRight: '→', arrowLeft: '←', arrowUp: '↑', arrowDown: '↓'
    };
    
    var SymbolsASCII = {
        tick: 'v', cross: 'x', star: '*', info: 'i', warning: '!',
        heart: '<3', bullet: '*', pointer: '>',
        arrowRight: '->', arrowLeft: '<-', arrowUp: '^', arrowDown: 'v'
    };

    // ============================================
    // EXPORT
    // ============================================
    
    var UCLI = {
        env: ENV,
        defineCommand: defineCommand,
        parseArgs: parseArgs,
        runCommand: runCommand,
        runMain: runMain,
        renderUsage: renderUsage,
        showUsage: showUsage,
        input: Input,
        output: Output,
        colors: Colors,
        c: Colors,
        format: Format,
        box: Format.box,
        table: Format.table,
        progressBar: Format.progressBar,
        symbols: Symbols,
        symbolsASCII: SymbolsASCII,
        version: '1.0.0-es3'
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = UCLI;
    }
    if (typeof define === 'function' && define.amd) {
        define(function() { return UCLI; });
    }
    root.UCLI = UCLI;
    root.UniversalCLI = UCLI;

})(this);
