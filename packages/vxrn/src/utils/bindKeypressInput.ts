import readline from 'node:readline'

function restoreTerminal() {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(false)
    } catch {}
  }
  process.stdout.write('\x1b[0m')
}

function supportsKeypressInput() {
  return Boolean(process.stdin.isTTY && process.stdin.setRawMode)
}

export function bindKeypressInput() {
  if (!supportsKeypressInput()) {
    return
  }

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  // Allow Node.js to exit even if stdin is still listening
  process.stdin.unref()

  // restore terminal on exit
  process.on('exit', restoreTerminal)
  process.on('SIGINT', () => {
    restoreTerminal()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    restoreTerminal()
    process.exit(0)
  })

  // ONLY ctrl chords are bound, deliberately. a plain `c` used to clear the
  // screen, and that fired on bytes the user never typed: terminal capability
  // replies (`ESC[?1;2c`, `ESC[>0;95;0c`) end in the letter `c`, and
  // emitKeypressEvents turns that trailing byte into a plain `c` keypress. so
  // did pasting any text containing a `c`, since raw mode delivers a paste as
  // ordinary keystrokes. the result was a dev server that wiped the terminal
  // at apparently random moments, with no way to switch it off — vite's
  // `clearScreen: false` does not cover it, because this never goes through
  // vite's logger. vite gates its own single-key shortcuts behind an explicit
  // `bindCLIShortcuts()` opt-in for exactly this reason.
  //
  // stdin here is very often not a human at a prompt: it is one pane of a
  // process runner, a tmux split, or an editor terminal, so anything that
  // reads a bare letter as a command will misfire.
  process.stdin.on('keypress', (_key, data) => {
    const { ctrl, name } = data
    if (ctrl !== true) return
    switch (name) {
      // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
      case 'c':
        restoreTerminal()
        process.exit()
      case 'z':
        process.emit('SIGTSTP', 'SIGTSTP')
        break
    }
  })
}
