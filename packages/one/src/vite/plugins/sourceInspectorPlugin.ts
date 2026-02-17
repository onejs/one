import path from 'node:path'
import { parse } from 'oxc-parser'
import type { Plugin, ViteDevServer } from 'vite'
import { normalizePath } from 'vite'
import type { WebSocket } from 'ws'

interface JsxLocation {
  /** Position right after the tag name where we insert the attribute */
  insertOffset: number
  /** Line number for editor navigation */
  line: number
  /** Column number for editor navigation */
  column: number
}

/**
 * Parse code with oxc and find all JSX opening elements.
 */
async function findJsxElements(code: string, filename: string): Promise<JsxLocation[]> {
  const result = await parse(filename, code)

  if (result.errors.length > 0) {
    return []
  }

  const locations: JsxLocation[] = []

  function getJsxName(node: any): string | null {
    if (!node) return null
    if (node.type === 'JSXIdentifier') return node.name
    if (node.type === 'JSXMemberExpression') {
      const obj = getJsxName(node.object)
      return obj ? `${obj}.${node.property?.name}` : null
    }
    return null
  }

  function getLocation(offset: number): { line: number; column: number } {
    const before = code.slice(0, offset)
    const lines = before.split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1]!.length + 1,
    }
  }

  function walk(node: any): void {
    if (!node || typeof node !== 'object') return

    if (node.type === 'JSXOpeningElement' && node.name) {
      const tagName = getJsxName(node.name)

      // skip Fragment and already-tagged elements
      if (tagName && tagName !== 'Fragment' && !tagName.endsWith('.Fragment')) {
        const hasSourceAttr = node.attributes?.some(
          (attr: any) =>
            attr.type === 'JSXAttribute' && attr.name?.name === 'data-one-source'
        )

        if (!hasSourceAttr) {
          const nameEnd = node.name.end
          const loc = getLocation(node.start)

          locations.push({
            insertOffset: nameEnd,
            line: loc.line,
            column: loc.column,
          })
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue
      const value = node[key]
      if (Array.isArray(value)) {
        for (const child of value) {
          walk(child)
        }
      } else if (value && typeof value === 'object') {
        walk(value)
      }
    }
  }

  walk(result.program)

  return locations.sort((a, b) => b.insertOffset - a.insertOffset)
}

type TransformOut = { code: string; map?: null } | undefined

/**
 * Transforms JSX to inject data-one-source attributes using oxc-parser.
 */
async function injectSourceToJsx(code: string, id: string): Promise<TransformOut> {
  const [filePath] = id.split('?')
  if (!filePath) return

  const location = filePath.replace(normalizePath(process.cwd()), '')

  // Quick check - skip if no JSX-like content
  if (!code.includes('<') || !code.includes('>')) {
    return
  }

  const jsxLocations = await findJsxElements(code, filePath)

  if (jsxLocations.length === 0) {
    return
  }

  let result = code

  // Insert from end to start to preserve offsets
  for (const jsx of jsxLocations) {
    const sourceAttr = ` data-one-source="${location}:${jsx.line}:${jsx.column}"`
    result =
      result.slice(0, jsx.insertOffset) + sourceAttr + result.slice(jsx.insertOffset)
  }

  return { code: result, map: null }
}

async function openInEditor(
  filePath: string,
  line?: string,
  column?: string
): Promise<void> {
  try {
    const launch = (await import('launch-editor')).default
    const fullPath = path.join(process.cwd(), filePath)
    const location = `${fullPath}${line ? `:${line}` : ''}${column ? `:${column}` : ''}`

    launch(location, undefined, (filename: string, errorMessage: string | null) => {
      if (errorMessage) {
        console.warn(
          `[one:source-inspector] Failed to open ${filename} in editor:`,
          errorMessage
        )
      }
    })
  } catch (err) {
    console.warn('[one:source-inspector] Failed to launch editor:', err)
  }
}

// track connected vscode clients and browser clients
const vscodeClients = new Set<WebSocket>()

export function sourceInspectorPlugin(): Plugin[] {
  const cache = new Map<string, TransformOut>()

  return [
    // Transform plugin - injects data-one-source attributes
    {
      name: 'one:source-inspector-transform',
      enforce: 'pre',
      apply: 'serve',

      async transform(code, id) {
        const envName = this.environment?.name
        // Skip native environments only - transform both client and SSR for consistency
        if (envName === 'ios' || envName === 'android') return

        if (
          id.includes('node_modules') ||
          id.includes('?raw') ||
          id.includes('dist') ||
          id.includes('build')
        ) {
          return
        }

        if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return

        if (cache.has(code)) {
          return cache.get(code)
        }

        const out = await injectSourceToJsx(code, id)
        cache.set(code, out)

        if (cache.size > 100) {
          cache.clear()
        }

        return out
      },
    },

    // Note: Inspector UI script is now injected via DevHead.tsx for SSR compatibility

    // Server plugin - handles open-source requests and cursor WebSocket
    {
      name: 'one:source-inspector-server',
      apply: 'serve',

      configureServer(server: ViteDevServer) {
        // set up websocket server for vscode cursor position
        let wss: InstanceType<typeof import('ws').WebSocketServer> | null = null

        import('ws').then(({ WebSocketServer }) => {
          wss = new WebSocketServer({ noServer: true })

          server.httpServer?.on('upgrade', (req, socket, head) => {
            if (req.url !== '/__one/cursor') return

            wss!.handleUpgrade(req, socket, head, (ws) => {
              vscodeClients.add(ws)

              ws.on('message', (data) => {
                try {
                  const message = JSON.parse(data.toString())

                  // broadcast cursor position to browser via HMR
                  if (message.type === 'cursor-position') {
                    server.hot.send('one:cursor-highlight', {
                      file: message.file,
                      line: message.line,
                      column: message.column,
                    })
                  } else if (message.type === 'cursor-clear') {
                    server.hot.send('one:cursor-highlight', { clear: true })
                  }
                } catch {
                  // ignore parse errors
                }
              })

              ws.on('close', () => {
                vscodeClients.delete(ws)
                // clear highlight when vscode disconnects
                server.hot.send('one:cursor-highlight', { clear: true })
              })
            })
          })
        })

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/__one/open-source')) {
            return next()
          }

          try {
            const url = new URL(req.url, 'http://localhost')
            const source = url.searchParams.get('source')

            if (!source) {
              res.statusCode = 400
              res.end('Missing source parameter')
              return
            }

            // Parse the source - format is "filePath:line:column"
            const parts = source.split(':')
            const column = parts.pop()!
            const line = parts.pop()!
            const filePath = parts.join(':')

            await openInEditor(filePath, line, column)

            res.statusCode = 200
            res.end('OK')
          } catch (err) {
            console.error('[one:source-inspector] Error:', err)
            res.statusCode = 500
            res.end('Internal server error')
          }
        })
      },
    },
  ]
}
