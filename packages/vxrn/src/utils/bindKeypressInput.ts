import readline from 'node:readline'

let keypressListener: ((_key: string, data: { ctrl: boolean; name: string }) => void) | null = null
let stdinWasRaw = false

export function bindKeypressInput() {
  if (!process.stdin.setRawMode) {
    console.warn({
      msg: 'Interactive mode is not supported in this environment',
    })
    return
  }

  readline.emitKeypressEvents(process.stdin)
  stdinWasRaw = process.stdin.isRaw ?? false
  process.stdin.setRawMode(true)

  keypressListener = (_key, data) => {
    const { ctrl, name } = data
    if (ctrl === true) {
      switch (name) {
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
        case 'c':
          process.exit()
        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP')
          break
      }
    } else {
      switch (name) {
        case 'r':
          // ctx.broadcastToMessageClients({ method: 'reload' })
          // ctx.log.info({
          //   msg: 'Reloading app',
          // })
          break
        case 'd':
          // ctx.broadcastToMessageClients({ method: 'devMenu' })
          // ctx.log.info({
          //   msg: 'Opening developer menu',
          // })
          break
        case 'c':
          process.stdout.write('\u001b[2J\u001b[0;0H')
          // TODO: after logging we should print information about port and host
          break
      }
    }
  }

  process.stdin.on('keypress', keypressListener)
}

/**
 * Cleanup stdin listeners and restore raw mode.
 * Must be called before process exit to prevent hanging.
 */
export function cleanupKeypressInput() {
  if (keypressListener) {
    process.stdin.off('keypress', keypressListener)
    keypressListener = null
  }

  // Remove all listeners that readline may have added
  process.stdin.removeAllListeners('keypress')

  if (process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(stdinWasRaw)
    } catch {
      // stdin may already be closed
    }
  }

  // Pause and unref stdin so it doesn't keep the process alive
  try {
    process.stdin.pause()
    process.stdin.unref()
  } catch {
    // ignore
  }
}
