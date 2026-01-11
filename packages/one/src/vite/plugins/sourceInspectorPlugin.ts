import path from 'node:path'
import { parseSync } from 'oxc-parser'
import { normalizePath } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'

interface JsxLocation {
  /** Position right after the tag name where we insert the attribute */
  insertOffset: number
  line: number
  column: number
}

/**
 * Parse code with oxc and find all JSX opening elements.
 * Returns insertion points sorted by offset (descending for safe insertion).
 */
function findJsxElements(code: string, filename: string): JsxLocation[] {
  const result = parseSync(filename, code)

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

      // Skip Fragment and already-tagged elements
      if (tagName && tagName !== 'Fragment') {
        // Check if already has data-one-source
        const hasSourceAttr = node.attributes?.some(
          (attr: any) =>
            attr.type === 'JSXAttribute' && attr.name?.name === 'data-one-source'
        )

        if (!hasSourceAttr) {
          // Insert position is right after the tag name
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

    // Walk all child nodes
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

  // Sort by offset descending so we can insert from end to start without shifting positions
  return locations.sort((a, b) => b.insertOffset - a.insertOffset)
}

/**
 * Transforms JSX to inject data-one-source attributes using oxc-parser.
 */
function injectSourceToJsx(
  code: string,
  id: string
): { code: string; map?: null } | undefined {
  const [filePath] = id.split('?')
  if (!filePath) return

  const location = filePath.replace(normalizePath(process.cwd()), '')

  // Quick check - skip if no JSX-like content
  if (!code.includes('<') || !code.includes('>')) {
    return
  }

  const jsxLocations = findJsxElements(code, filePath)

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

export function sourceInspectorPlugin(): Plugin[] {
  return [
    // Transform plugin - injects data-one-source attributes
    {
      name: 'one:source-inspector-transform',
      enforce: 'pre',
      apply: 'serve',

      transform(code, id) {
        const envName = this.environment?.name
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

        return injectSourceToJsx(code, id)
      },
    },

    // Note: Inspector UI script is now injected via DevHead.tsx for SSR compatibility

    // Server plugin - handles open-source requests
    {
      name: 'one:source-inspector-server',
      apply: 'serve',

      configureServer(server: ViteDevServer) {
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

            const parts = source.split(':')
            const filePath = parts.slice(0, -2).join(':') || parts[0]
            const line = parts.length >= 2 ? parts[parts.length - 2] : undefined
            const column = parts.length >= 3 ? parts[parts.length - 1] : undefined

            await openInEditor(filePath!, line, column)

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
