/**
 * Async spinner controller. Uses `IOAdapter.writeRaw` for the CR-based redraw
 * loop. Auto-disables animation when `io.isTTY === false` or the runtime is
 * in `CLIKIT_DETERMINISTIC` mode (`io.capabilities.color === 0` is a strong
 * proxy).
 */

import { colors } from '@simtabi/cli-kit-js-ansi'
import type { IOAdapter } from '@simtabi/cli-kit-js-io'
import type { SpinnerController, SpinnerOptions, SpinnerStyle } from './types'

const FRAMES: Readonly<Record<SpinnerStyle, readonly string[]>> = Object.freeze({
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  circle: ['◐', '◓', '◑', '◒'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
})

export function createSpinner(io: IOAdapter, opts: SpinnerOptions = {}): SpinnerController {
  const frames = FRAMES[opts.style ?? 'dots']
  const interval = opts.intervalMs ?? 80
  let text = opts.text ?? ''
  let frame = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false
  // Animate only on real TTYs with color support — otherwise emit one-shot
  // status lines on start / stop transitions.
  const animated = io.isTTY && io.capabilities.color > 0
  // Pick Unicode glyphs (✔/✖/⚠/ℹ) when the terminal can render them,
  // ASCII fallbacks otherwise — terminals on `LANG=C` or stripped locales
  // would render the Unicode forms as `?`s.
  const unicode = io.capabilities.unicode
  const G = {
    check: unicode ? '✔' : 'OK',
    cross: unicode ? '✖' : 'X',
    warn: unicode ? '⚠' : '!',
    info: unicode ? 'ℹ' : 'i',
  } as const

  function clearLine(): void {
    // CR then erase-to-end-of-line.
    io.writeRaw('\r\x1b[K')
  }

  function render(): void {
    const f = frames[frame % frames.length] ?? ''
    if (animated) {
      io.writeRaw(`\r${f} ${text}\x1b[K`)
    }
    frame = (frame + 1) % frames.length
  }

  function controller(): SpinnerController {
    const c: SpinnerController = {
      get isRunning() {
        return running
      },
      start(t?: string) {
        if (t !== undefined) text = t
        if (running) return c
        running = true
        if (animated) {
          render()
          timer = setInterval(render, interval)
          // Don't keep the event loop alive for the timer alone.
          ;(timer as { unref?: () => void }).unref?.()
        } else {
          io.write(`${text}\n`)
        }
        return c
      },
      stop(finalText?: string) {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
        if (animated) {
          clearLine()
          if (finalText !== undefined) io.write(`${finalText}\n`)
        } else if (finalText !== undefined && finalText !== text) {
          io.write(`${finalText}\n`)
        }
        running = false
        return c
      },
      succeed(t?: string) {
        return c.stop(`${colors.green(G.check)} ${t ?? text}`)
      },
      fail(t?: string) {
        return c.stop(`${colors.red(G.cross)} ${t ?? text}`)
      },
      warn(t?: string) {
        return c.stop(`${colors.yellow(G.warn)} ${t ?? text}`)
      },
      info(t?: string) {
        return c.stop(`${colors.blue(G.info)} ${t ?? text}`)
      },
      update(newText: string) {
        text = newText
        if (animated && running) render()
        return c
      },
    }
    return c
  }

  return controller()
}
