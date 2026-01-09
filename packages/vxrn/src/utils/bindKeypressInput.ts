import readline from 'node:readline'

export function bindKeypressInput() {
  if (!process.stdin.setRawMode) {
    console.warn({
      msg: 'Interactive mode is not supported in this environment',
    })
    return
  }

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  // Allow Node.js to exit even if stdin is still listening
  process.stdin.unref()

  process.stdin.on('keypress', (_key, data) => {
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
  })
}
