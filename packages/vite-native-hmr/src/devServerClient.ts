import prettyFormat from 'pretty-format'

import { getDevServerLocation } from './getDevServerLocation'
import { loadHMRClient } from './hmr-client'

// force import hmr client hacky
loadHMRClient()

/**
 * With Webpack we don't use built-in metro-specific HMR client,
 * so the module `react-native/Libraries/Utilities/HMRClient.js` should be replaced with this one.
 *
 * Most of the code is noop apart from the `log` function which handles sending logs from client
 * application to the dev server.
 *
 * The console gets "polyfilled" here:
 * https://github.com/facebook/react-native/blob/v0.63.4/Libraries/Core/setUpDeveloperTools.js#L51-L69
 */

class DevServerClient {
  socket?: WebSocket
  buffer: Array<{ level: string; data: any[] }> = []

  constructor() {
    const initSocket = () => {
      const address = `ws://${getDevServerLocation().host}/__client`
      this.socket = new WebSocket(address)

      const onClose = (event: Event) => {
        console.warn(
          'Disconnected from the Dev Server:',
          (event as unknown as { message: string | null }).message
        )
        this.socket = undefined
      }

      this.socket.onclose = onClose
      this.socket.onerror = onClose
      this.socket.onopen = () => {
        this.flushBuffer()
      }
    }

    if (process.env.NODE_ENV === 'development') {
      initSocket()
    }
  }

  send(level: string, data: any[]) {
    try {
      this.socket?.send(
        JSON.stringify({
          type: 'client-log',
          level,
          data: data.map((item: any) =>
            typeof item === 'string'
              ? item
              : prettyFormat(item, {
                  escapeString: true,
                  highlight: true,
                  maxDepth: 3,
                  min: true,
                  plugins: [
                    // @ts-expect-error
                    prettyFormat.plugins.ReactElement,
                  ],
                })
          ),
        })
      )
    } catch {
      try {
        this.socket?.send(
          JSON.stringify({
            type: 'client-log',
            level,
            data: data.map((item: any, index) => {
              try {
                return typeof item === 'string' ? item : JSON.stringify(item)
              } catch (err) {
                return `Error stringifying item at index ${index} - ${item} - ${err}`
              }
            }),
          })
        )
      } catch (err) {
        try {
          this.socket?.send(
            JSON.stringify({
              type: 'client-log',
              level: 'error',
              data: ['error sending client log: ' + err],
            })
          )
        } catch {
          // final err
        }
      }
      // Ignore error
    }
  }

  flushBuffer() {
    if (globalThis['__vxrnTmpLogs']) {
      globalThis['__vxrnTmpLogs'].forEach(({ level, data }) => {
        this.buffer.push({ level, data })
      })
      delete globalThis['__vxrnTmpLogs']
    }

    for (const { level, data } of this.buffer) {
      this.send(level, data)
    }
    this.buffer = []
  }

  log(level: string, data: any[]) {
    if (level === 'groupEnd') {
      return
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.flushBuffer()
      this.send(level, data)
    } else {
      if (globalThis['__vxrnTmpLogs']) return
      this.buffer.push({ level, data })
    }
  }

  // Mock for React Native 0.79 to prevent native error "getPropertyAsObject: property 'setup' is undefined, expected an Object"
  setup() {
    // noop
  }
}

export const client = new DevServerClient()

export const setup = () => {}
export const enable = () => {}
export const disable = () => {}
export const registerBundle = () => {}
export const log = (level: string, data: any[]) => {
  client.log(level, data)
}
