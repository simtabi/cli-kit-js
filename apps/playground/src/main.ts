/**
 * Browser playground entry point. Real demo lands in M6 when the DOM adapter
 * is implemented. For now this just verifies the build pipeline resolves
 * `@simtabi/cli-kit-js` cleanly from a Vite app.
 */

import { __version } from '@simtabi/cli-kit-js/ansi'

const terminal = document.querySelector('#terminal')
if (terminal) {
  terminal.textContent = `cli-kit-js ansi pkg version stub: ${__version}`
}
