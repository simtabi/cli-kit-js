/**
 * Bulleted / numbered / nested lists.
 */

import type { ListItem, ListOptions } from './types'

export function list(items: readonly ListItem[], opts: ListOptions = {}): string {
  const ordered = opts.ordered ?? false
  const bullet = opts.bullet ?? '•'
  const indent = opts.indent ?? 2
  const lines: string[] = []
  renderItems(items, lines, ordered, bullet, indent, 0)
  return lines.join('\n')
}

function renderItems(
  items: readonly ListItem[],
  out: string[],
  ordered: boolean,
  bullet: string,
  indent: number,
  depth: number,
): void {
  let idx = 1
  for (const raw of items) {
    const item = typeof raw === 'string' ? { text: raw } : raw
    const prefix = ' '.repeat(depth * indent) + (ordered ? `${idx}.` : bullet)
    out.push(`${prefix} ${item.text}`)
    if (item.children && item.children.length > 0) {
      renderItems(item.children, out, ordered, bullet, indent, depth + 1)
    }
    idx++
  }
}
