/**
 * File-tree style hierarchy renderer.
 */

import { TREE_CHARS } from './chars'
import type { TreeNode, TreeOptions } from './types'

export function tree(root: TreeNode, opts: TreeOptions = {}): string {
  const chars = opts.ascii ? TREE_CHARS.ascii : TREE_CHARS.unicode
  const lines: string[] = [root.label]
  renderChildren(root.children ?? [], '', lines, chars)
  return lines.join('\n')
}

type TreeCharSet = (typeof TREE_CHARS)['unicode' | 'ascii']

function renderChildren(
  children: readonly TreeNode[],
  prefix: string,
  out: string[],
  chars: TreeCharSet,
): void {
  const lastIdx = children.length - 1
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (!child) continue
    const isLast = i === lastIdx
    out.push(`${prefix}${isLast ? chars.last : chars.branch}${child.label}`)
    if (child.children && child.children.length > 0) {
      renderChildren(child.children, prefix + (isLast ? chars.space : chars.vertical), out, chars)
    }
  }
}
