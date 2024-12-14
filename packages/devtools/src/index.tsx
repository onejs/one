import ipc from 'node-ipc'

function promiseWithResolvers<T>() {
  let a
  let b
  let c = new Promise<T>((resolve, reject) => {
    a = resolve
    b = reject
  })
  return { resolve: a, reject: b, promise: c }
}

Promise.withResolvers ||
  // @ts-ignore
  (Promise.withResolvers = promiseWithResolvers)

const serverId = 'one-devtools'
const messageKey = 'message'

type ClientMessages = {
  type: 'add-devtool'
  id: string
  name: string
}

type ServerMessages = {
  type: ''
}

export function startServer() {
  console.info(`Starting dev tools server`)

  const messageListeners = new Set<(data: any) => void>()

  ipc.config.id = serverId
  ipc.config.retry = 1500

  ipc.serveNet(() => {
    ipc.server.on(messageKey, (data, socket) => {
      console.info('got message', data)
      messageListeners.forEach((cb) => cb(data))
      // ipc.server.emit(socket, messageKey, data + ' world!')
    })

    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {})
  })

  ipc.server.start()

  return {
    onMessage(cb: (message: ClientMessages) => void) {
      messageListeners.add(cb)
    },

    sendMessage(message: ServerMessages) {},
  }
}

export function startClient() {
  console.info(`Starting dev tools client`)

  let connecting = Promise.withResolvers<void>()

  ipc.connectTo(serverId, () => {
    connecting.resolve()
  })

  return {
    async onMessage(cb: (message: ServerMessages) => void) {
      await connecting.promise
      ipc.of[serverId].on(messageKey, (data) => {
        console.info('client got message', data)
      })
    },

    async sendMessage(message: ClientMessages) {
      await connecting.promise
      ipc.of[serverId].emit(messageKey, message)
    },
  }
}
