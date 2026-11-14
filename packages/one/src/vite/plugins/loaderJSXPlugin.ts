import { readFileSync } from 'node:fs'
import { extname, relative, sep } from 'node:path'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import type { Plugin } from 'vite'

// wires loader jsx for the client: tags `use client` exports with a stable id, and keeps client
// islands a loader references in the client registry even though clientTreeShakePlugin strips the
// loader (and the imports only it used). the registry is plain modules, no extra vite environment.

const CLIENT_PREFIX = 'virtual:one-loader-jsx-client:'
const UNIVERSAL_ID = 'virtual:one-loader-jsx-universal'
const RESOLVED = '\0'

const USE_CLIENT_RE = /(['"])use client\1/
const LOADER_JSX_RE = /use client|renderJSX|ServerJSX/

// tamagui primitives that render the same everywhere, so a loader can reference them directly
const TAMAGUI_PRIMITIVES = [
  'View',
  'Text',
  'Stack',
  'XStack',
  'YStack',
  'ZStack',
  'Paragraph',
  'SizableText',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'Image',
  'Spacer',
  'Separator',
]

const toPosix = (path: string) => path.split(sep).join('/')

function hasUseClientDirective(program: any): boolean {
  for (const node of program.body) {
    if (node.type !== 'ExpressionStatement' || typeof node.directive !== 'string') break
    if (node.directive === 'use client') return true
  }
  return false
}

type ClientExport = { local: string; exported: string }

function collectClientExports(program: any): ClientExport[] {
  const out: ClientExport[] = []
  for (const node of program.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration
      if (decl.type === 'Identifier') out.push({ local: decl.name, exported: 'default' })
      else if (decl.id?.name) out.push({ local: decl.id.name, exported: 'default' })
    } else if (node.type === 'ExportNamedDeclaration') {
      const decl = node.declaration
      if (decl) {
        if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier') out.push({ local: d.id.name, exported: d.id.name })
          }
        } else if (decl.id?.name) {
          out.push({ local: decl.id.name, exported: decl.id.name })
        }
      } else if (!node.source) {
        for (const spec of node.specifiers) {
          out.push({
            local: spec.local.name ?? spec.local.value,
            exported: spec.exported.name ?? spec.exported.value,
          })
        }
      }
    }
  }
  // hooks and helpers are not components
  return out.filter((e) => e.exported === 'default' || /^[A-Z]/.test(e.exported))
}

export function transformUseClient(code: string, id: string, root: string) {
  if (!USE_CLIENT_RE.test(code)) return
  const parsed = parseSync(id, code)
  if (parsed.errors.length || !hasUseClientDirective(parsed.program)) return
  const exports = collectClientExports(parsed.program)
  if (!exports.length) return

  const path = toPosix(relative(root, id))
  const s = new MagicString(code)
  const tags = exports
    .map(
      ({ local, exported }) =>
        `if ((typeof ${local} === 'function' || (typeof ${local} === 'object' && ${local} !== null)) && !${local}.__oneClientId) ${local}.__oneClientId = ${JSON.stringify(`${path}#${exported}`)}`
    )
    .join('\n')
  const entries = exports.map(({ local, exported }) => `${JSON.stringify(exported)}: ${local}`)
  s.append(
    `\nimport { registerLoaderClientModule as __oneRegisterClient } from 'one'\n${tags}\n__oneRegisterClient(${JSON.stringify(path)}, { ${entries.join(', ')} })\n`
  )
  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}

export function loaderJSXPlugin(opts?: {
  routerRoot?: string
  root?: string
}): Plugin {
  const routerRoot = opts?.routerRoot ?? 'app'
  let root = opts?.root ?? process.cwd()
  const routeDir = () => `${toPosix(root)}/${routerRoot}/`

  const isClientFile = (file: string) => {
    try {
      return USE_CLIENT_RE.test(readFileSync(file, 'utf8').slice(0, 200))
    } catch {
      return false
    }
  }

  return {
    name: 'one-loader-jsx',

    enforce: 'pre',

    configResolved(config: { root: string }) {
      root = opts?.root ?? config.root
    },

    resolveId: {
      filter: { id: /^virtual:one-loader-jsx-/ },
      handler(source) {
        return RESOLVED + source
      },
    },

    load: {
      filter: { id: /^\0virtual:one-loader-jsx-/ },
      async handler(id) {
        const name = id.slice(RESOLVED.length)

        if (name === UNIVERSAL_ID) {
          const tamagui = await this.resolve('tamagui', `${root}/package.json`)
          const lines = [
            `import { Link, registerLoaderClient } from 'one'`,
            `registerLoaderClient('one#Link', Link)`,
          ]
          if (tamagui && !tamagui.external) {
            lines.push(`import * as __tamagui from 'tamagui'`)
            for (const primitive of TAMAGUI_PRIMITIVES) {
              lines.push(
                `if (__tamagui.${primitive}) registerLoaderClient('tamagui#${primitive}', __tamagui.${primitive})`
              )
            }
          }
          return lines.join('\n')
        }

        if (name.startsWith(CLIENT_PREFIX)) {
          const file = name.slice(CLIENT_PREFIX.length)
          const path = toPosix(relative(root, file))
          // web code-splits islands, native and ssr evaluate them eagerly
          const lazy = (this as any).environment?.name === 'client'
          return lazy
            ? `import { registerLoaderClientModule } from 'one'\nregisterLoaderClientModule(${JSON.stringify(path)}, () => import(${JSON.stringify(file)}))`
            : `import { registerLoaderClientModule } from 'one'\nimport * as mod from ${JSON.stringify(file)}\nregisterLoaderClientModule(${JSON.stringify(path)}, mod)`
        }
      },
    },

    transform: {
      order: 'pre',
      filter: { code: LOADER_JSX_RE },
      async handler(code, rawId) {
        const id = rawId.split('?')[0]
        if (!/\.(js|jsx|ts|tsx)$/.test(extname(id)) || /node_modules/.test(id)) return
        if (id.includes('/packages/one/')) return

        const tagged = transformUseClient(code, id, root)
        if (tagged) return tagged

        // a route that renders loader jsx must register the universal preset and every client
        // island it imports, since the loader (and its imports) are stripped from the client bundle
        if (!toPosix(id).startsWith(routeDir()) || !/renderJSX|ServerJSX/.test(code)) return
        const parsed = parseSync(id, code)
        if (parsed.errors.length) return

        const imports = [`import '${UNIVERSAL_ID}'`]
        const seen = new Set<string>()
        for (const node of parsed.program.body as any[]) {
          if (node.type !== 'ImportDeclaration' || node.importKind === 'type') continue
          const resolved = await this.resolve(node.source.value, id)
          if (!resolved || resolved.external || /node_modules/.test(resolved.id)) continue
          const file = resolved.id.split('?')[0]
          if (seen.has(file) || !isClientFile(file)) continue
          seen.add(file)
          imports.push(`import '${CLIENT_PREFIX}${file}'`)
        }

        const s = new MagicString(code)
        s.append(`\n${imports.join('\n')}\n`)
        return { code: s.toString(), map: s.generateMap({ hires: true }) }
      },
    },

  } satisfies Plugin
}
