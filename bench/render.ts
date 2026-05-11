import { box, list, table, tree } from '@simtabi/cli-kit-js-render'
import { Bench } from 'tinybench'

const SMALL_TABLE_ROWS = [
  ['alice', '30', 'NYC'],
  ['bob', '25', 'LA'],
  ['carol', '40', 'SF'],
]
const LARGE_TABLE_ROWS = Array.from({ length: 500 }, (_, i) => [
  `name-${i}`,
  String(i),
  `city-${i % 10}`,
])

const DEEP_TREE = {
  label: 'root',
  children: Array.from({ length: 20 }, (_, i) => ({
    label: `child-${i}`,
    children: Array.from({ length: 5 }, (_, j) => ({ label: `gc-${i}-${j}` })),
  })),
}

const bench = new Bench({ time: 500 })

bench
  .add('box: 3-line content, round style', () => {
    box('Hello\nWorld\n!', { style: 'round', padding: { x: 2, y: 1 } })
  })
  .add('table: 3 rows × 3 cols', () => {
    table(SMALL_TABLE_ROWS, { headers: ['Name', 'Age', 'City'] })
  })
  .add('table: 500 rows × 3 cols', () => {
    table(LARGE_TABLE_ROWS, { headers: ['Name', 'Age', 'City'] })
  })
  .add('tree: 1 root + 20 children + 100 grandchildren', () => {
    tree(DEEP_TREE)
  })
  .add('list: nested ordered list of 50 items', () => {
    list(
      Array.from({ length: 50 }, (_, i) => `item ${i}`),
      { ordered: true },
    )
  })

await bench.run()

console.table(bench.table())
