/**
 * Prompt-input scripting for tests.
 *
 *   answer(io, 'h', 'i', 'enter')      — queue three keystrokes
 *   answer.text(io, 'hello')           — queue a full text line as readLine input
 *   answer.line(io, 'y')               — alias for .text
 *
 * Each call appends to the existing queue — order matters.
 */

import type { KeyEvent, MemoryAdapter } from '@simtabi/cli-kit-js-io'

type Key = string | Partial<KeyEvent> & { readonly name: string }

interface AnswerFn {
  (io: MemoryAdapter, ...keys: readonly Key[]): void
  text(io: MemoryAdapter, line: string): void
  line(io: MemoryAdapter, line: string): void
}

function queueKeys(io: MemoryAdapter, keys: readonly Key[]): void {
  for (const k of keys) {
    if (typeof k === 'string') {
      io.queueKey({ name: k, raw: k.length === 1 ? k : '' })
    } else {
      io.queueKey(k)
    }
  }
}

export const answer: AnswerFn = Object.assign(
  function (io: MemoryAdapter, ...keys: readonly Key[]): void {
    queueKeys(io, keys)
  },
  {
    text(io: MemoryAdapter, line: string): void {
      io.queueLine(line)
    },
    line(io: MemoryAdapter, line: string): void {
      io.queueLine(line)
    },
  },
)
