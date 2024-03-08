import { Server } from '../vendor/repack/dev-server/src'
import readline from 'readline'

export function bindKeypressInput(ctx: Server.DelegateContext) {
  if (!process.stdin.setRawMode) {
    ctx.log.warn({
      msg: 'Interactive mode is not supported in this environment',
    })
    return
  }

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)

  process.stdin.on('keypress', (_key, data) => {
    const { ctrl, name } = data
    if (ctrl === true) {
      switch (name) {
        case 'c':
          process.exit()
        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP')
          break
      }
    } else if (name === 'r') {
      ctx.broadcastToMessageClients({ method: 'reload' })
      ctx.log.info({
        msg: 'Reloading app',
      })
    } else if (name === 'd') {
      ctx.broadcastToMessageClients({ method: 'devMenu' })
      ctx.log.info({
        msg: 'Opening developer menu',
      })
    }
  })
}
