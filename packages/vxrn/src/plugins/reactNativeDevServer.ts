import type { Connect, Plugin, ViteDevServer } from 'vite'
import { WebSocketServer } from 'ws'
import {
  addConnectedNativeClient,
  removeConnectedNativeClient,
} from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'
import { clearCachedBundle, getReactNativeBundle } from '../utils/getReactNativeBundle'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { URL } from 'node:url'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createDevMiddleware } from '@react-native/dev-middleware'

type ClientMessage = {
  type: 'client-log'
  level: 'log' | 'error' | 'info' | 'debug' | 'warn'
  data: string[]
}

let reactNativeDevToolsUrl = ''

export function openReactNativeDevTools() {
  if (!reactNativeDevToolsUrl) {
    console.error(`Server not running`)
    return
  }

  const url = new URL('/open-debugger', reactNativeDevToolsUrl)

  // TODO: Seems to need these if multiple devices are connected, but haven't figured out how to pass these yet
  // Currently will just launch DevTools for most recently connected device
  // url.searchParams.set('appId', );
  // url.searchParams.set('device', );
  // url.searchParams.set('target', );

  // The `/open-debugger` endpoint may not respond, so we don't wait for it and will ignore timeout errors
  ;(async () => {
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    }).catch((error) => {
      if (error.name === 'TimeoutError') {
        return null
      }

      throw error
    })

    if (!response) {
      // This is common for now, so don't log it
      // console.info(`No response received from the React Native DevTools.`)
    } else if (response.ok === false) {
      const responseText = await response.text()

      if (responseText.includes('Unable to find debugger target')) {
        // Will already print "No compatible apps connected. React Native DevTools can only be used with the Hermes engine.", so no need to warn again
        return
      }

      console.warn(
        `Failed to open React Native DevTools, ${url} returns ${response.status}: ${responseText}.`
      )
    }
  })()
}

export function createReactNativeDevServerPlugin(options: VXRNOptionsFilled): Plugin {
  let hmrSocket: WebSocket | null = null

  return {
    name: 'vite-plugin-react-native-server',

    configureServer(server: ViteDevServer) {
      const hmrWSS = new WebSocketServer({ noServer: true })
      const clientWSS = new WebSocketServer({ noServer: true })

      const devToolsSocketEndpoints = ['/inspector/device', '/inspector/debug']
      reactNativeDevToolsUrl = `http://${options.server.host}:${options.server.port}`
      const { middleware, websocketEndpoints } = createDevMiddleware({
        projectRoot: options.root,
        serverBaseUrl: reactNativeDevToolsUrl,
        logger: console,
      })

      server.middlewares.use(middleware)

      // link up sockets
      server.httpServer?.on('upgrade', (req, socket, head) => {
        // devtools sockets
        for (const endpoint of devToolsSocketEndpoints) {
          if (req.url.startsWith(endpoint)) {
            const wss = websocketEndpoints[endpoint]
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit('connection', ws, req)
            })
          }
        }

        // hmr socket
        if (
          req.url.startsWith(
            '/__hmr'
          ) /* TODO: handle '/__hmr?platform=ios' and android differently */
        ) {
          hmrWSS.handleUpgrade(req, socket, head, (ws) => {
            hmrWSS.emit('connection', ws, req)
          })
        }

        // client socket
        if (req.url === '/__client') {
          clientWSS.handleUpgrade(req, socket, head, (ws) => {
            clientWSS.emit('connection', ws, req)
          })
        }
      })

      hmrWSS.on('connection', (socket) => {
        addConnectedNativeClient()

        socket.on('message', (message) => {
          if (message.toString().includes('ping')) {
            socket.send('pong')
          }
        })

        socket.on('close', () => {
          removeConnectedNativeClient()
        })

        socket.on('error', (error) => {
          console.error('[hmr] error', error)
        })
      })

      clientWSS.on('connection', (socket) => {
        socket.on('message', (messageRaw) => {
          const message = JSON.parse(messageRaw.toString()) as any as ClientMessage

          switch (message.type) {
            case 'client-log': {
              // TODO temp
              if (
                message.level === 'warn' &&
                message.data[0]?.startsWith(
                  'Sending `appearanceChanged` with no listeners registered.'
                )
              ) {
                return
              }

              console.info(
                ` ①  ${message.level === 'info' ? '' : ` [${message.level}]`}`,
                ...message.data
              )
              return
            }

            default: {
              console.warn(` ①  Unknown message type`, message)
            }
          }
        })
      })

      const validPlatforms: Record<string, 'ios' | 'android' | undefined> = {
        ios: 'ios',
        android: 'android',
      }

      // Handle React Native endpoints
      server.middlewares.use('/file', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)
        const file = url.searchParams.get('file')

        if (file) {
          const source = hotUpdateCache.get(file)
          if (!source) {
            console.warn(`No hot source found for`, file)
            res.writeHead(200, { 'Content-Type': 'text/javascript' })
            res.end('')
            return
          }

          console.log('send', source)

          res.writeHead(200, { 'Content-Type': 'text/javascript' })
          res.end(source)
        }
      })

      // React Native bundle handler
      const handleRNBundle: Connect.NextHandleFunction = async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)
        const platformString = url.searchParams.get('platform') || ''
        const platform = validPlatforms[platformString]

        if (!platform) {
          return
        }

        try {
          const bundle = await (async () => {
            if (options.debugBundle) {
              const path = options.debugBundlePaths[platform]
              if (existsSync(path)) {
                console.info(`  !!! - serving debug bundle from`, path)
                return await readFile(path, 'utf-8')
              }
            }

            const outBundle = await getReactNativeBundle(options, platform)

            if (options.debugBundle) {
              const path = options.debugBundlePaths[platform]
              console.info(`  !!! - writing debug bundle to`, path)
              await writeFile(path, outBundle)
            }

            return outBundle
          })()

          res.writeHead(200, { 'Content-Type': 'text/javascript' })
          res.end(bundle)
        } catch (err) {
          console.error(` Error building React Native bundle`)
          console.error(err)
          console.error(
            `\n\n  Note, some errors may happen due to a stale Vite cache, you may want to try re-running with the "--clean" flag`
          )
          res.writeHead(500)
          res.end()
        }
      }

      server.middlewares.use('/index.bundle', handleRNBundle)
      server.middlewares.use('/.expo/.virtual-metro-entry.bundle', handleRNBundle)

      // Status endpoint
      server.middlewares.use('/status', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('packager-status:running')
      })

      // Symbolicate endpoint
      server.middlewares.use('/symbolicate', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('TODO')
      })

      // Clear bundle cache on file changes
      server.watcher.on('change', () => {
        clearCachedBundle()
      })
    },
  }
}
