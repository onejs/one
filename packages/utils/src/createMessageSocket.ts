import { WebSocketServer } from 'ws'

// metro parity: the packager message socket, mirroring
// @react-native-community/cli-server-api createMessageSocketEndpoint (protocol v2:
// broadcast / request / response routing, getid + getpeers server methods). RN's
// packager connection dials /message on launch; an unanswered upgrade leaves the
// socket dangling forever, and chromium then queues every later websocket handshake
// to the same host:port behind it (blocking e.g. zero /sync in sootsim standalone).
export function createMessageSocket() {
  const PROTOCOL_VERSION = 2
  const wss = new WebSocketServer({ noServer: true })
  const clients = new Map<
    string,
    { ws: import('ws').WebSocket; query: Record<string, string> }
  >()
  let nextClientId = 0

  function broadcast(
    broadcasterId: string | null,
    message: { method: string; params?: unknown }
  ) {
    const forwarded = JSON.stringify({
      version: PROTOCOL_VERSION,
      method: message.method,
      params: message.params,
    })
    for (const [otherId, other] of clients) {
      if (otherId !== broadcasterId) {
        try {
          other.ws.send(forwarded)
        } catch {}
      }
    }
  }

  wss.on('connection', (clientWs, req) => {
    const clientId = `client#${nextClientId++}`
    const query = Object.fromEntries(
      new URL(req?.url || '/', 'http://localhost').searchParams
    )
    clients.set(clientId, { ws: clientWs, query })
    const remove = () => clients.delete(clientId)
    clientWs.on('close', remove)
    clientWs.on('error', remove)
    clientWs.on('message', (data, isBinary) => {
      if (isBinary) return
      let message: any
      try {
        message = JSON.parse(data.toString())
      } catch {
        return
      }
      if (message?.version !== PROTOCOL_VERSION) return
      try {
        const isBroadcastMsg =
          typeof message.method === 'string' &&
          message.id === undefined &&
          message.target === undefined
        const isRequest =
          typeof message.method === 'string' && typeof message.target === 'string'
        const isResponse =
          typeof message.id === 'object' &&
          message.id?.requestId !== undefined &&
          typeof message.id?.clientId === 'string' &&
          (message.result !== undefined || message.error !== undefined)

        if (isBroadcastMsg) {
          broadcast(clientId, message)
        } else if (isRequest) {
          if (message.target === 'server') {
            let result: unknown
            if (message.method === 'getid') {
              result = clientId
            } else if (message.method === 'getpeers') {
              const peers: Record<string, Record<string, string>> = {}
              for (const [otherId, other] of clients) {
                if (otherId !== clientId) peers[otherId] = other.query
              }
              result = peers
            } else {
              throw new Error(`unknown method: ${message.method}`)
            }
            clientWs.send(
              JSON.stringify({ version: PROTOCOL_VERSION, result, id: message.id })
            )
          } else {
            const target = clients.get(message.target)
            if (!target) {
              throw new Error(
                `could not find id "${message.target}" while forwarding request`
              )
            }
            target.ws.send(
              JSON.stringify({
                version: PROTOCOL_VERSION,
                method: message.method,
                params: message.params,
                id:
                  message.id === undefined
                    ? undefined
                    : { requestId: message.id, clientId },
              })
            )
          }
        } else if (isResponse) {
          if (!message.id) return
          const target = clients.get(message.id.clientId)
          target?.ws.send(
            JSON.stringify({
              version: PROTOCOL_VERSION,
              result: message.result,
              error: message.error,
              id: message.id.requestId,
            })
          )
        }
      } catch (err) {
        if (message.id !== undefined) {
          try {
            clientWs.send(
              JSON.stringify({
                version: PROTOCOL_VERSION,
                error: String(err),
                id: message.id,
              })
            )
          } catch {}
        }
      }
    })
  })

  return wss
}
