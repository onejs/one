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
const UNIVERSAL_PREFIX = 'virtual:one-loader-jsx-universal:'
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
            if (d.id.type === 'Identifier')
              out.push({ local: d.id.name, exported: d.id.name })
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

export type LoaderJSXUniversalUse = {
  link: boolean
  primitives: Set<string>
  allPrimitives: boolean
}

export function createLoaderJSXUniversalUse(): LoaderJSXUniversalUse {
  return { link: false, primitives: new Set(), allPrimitives: false }
}

function importedName(specifier: any): string | undefined {
  return specifier?.imported?.name ?? specifier?.imported?.value
}

export function collectLoaderJSXUniversalImports(
  program: any,
  used: LoaderJSXUniversalUse
) {
  for (const node of program.body as any[]) {
    if (!node.source) continue
    const source = node.source.value
    const isTamagui = source === 'tamagui' || source.startsWith('@tamagui/')

    if (node.type === 'ImportDeclaration' && node.importKind !== 'type') {
      for (const specifier of node.specifiers ?? []) {
        if (specifier.importKind === 'type') continue
        if (isTamagui) {
          if (specifier.type === 'ImportNamespaceSpecifier') used.allPrimitives = true
          const name = importedName(specifier)
          if (name && TAMAGUI_PRIMITIVES.includes(name)) used.primitives.add(name)
        }
        if (source === 'one') {
          if (specifier.type === 'ImportNamespaceSpecifier') used.link = true
          if (importedName(specifier) === 'Link') used.link = true
        }
      }
      continue
    }

    if (node.type === 'ExportAllDeclaration' && node.exportKind !== 'type' && isTamagui) {
      used.allPrimitives = true
      continue
    }

    if (node.type === 'ExportNamedDeclaration' && node.exportKind !== 'type') {
      for (const specifier of node.specifiers ?? []) {
        if (specifier.exportKind === 'type') continue
        const name = specifier.local?.name ?? specifier.local?.value
        if (isTamagui && name && TAMAGUI_PRIMITIVES.includes(name)) {
          used.primitives.add(name)
        }
        if (source === 'one' && name === 'Link') used.link = true
      }
    }
  }
  return used
}

export function loaderJSXUniversalSelection(used: LoaderJSXUniversalUse): string[] {
  return [
    ...(used.link ? ['Link'] : []),
    ...(used.allPrimitives
      ? ['all']
      : TAMAGUI_PRIMITIVES.filter((primitive) => used.primitives.has(primitive))),
  ]
}

export function createLoaderJSXUniversalModule(
  selection: readonly string[],
  hasTamagui: boolean
) {
  const link = selection.includes('Link')
  const allPrimitives = selection.includes('all')
  const primitives = TAMAGUI_PRIMITIVES.filter((primitive) =>
    selection.includes(primitive)
  )
  if (!link && !allPrimitives && primitives.length === 0) return 'export {}'

  const oneImports = ['registerLoaderClient', ...(link ? ['Link'] : [])]
  const lines = [`import { ${oneImports.join(', ')} } from 'one'`]
  if (link) lines.push(`registerLoaderClient('one#Link', Link)`)

  if (hasTamagui && allPrimitives) {
    lines.push(`import * as __tamagui from 'tamagui'`)
    for (const primitive of TAMAGUI_PRIMITIVES) {
      lines.push(
        `if (__tamagui.${primitive}) registerLoaderClient('tamagui#${primitive}', __tamagui.${primitive})`
      )
    }
  } else if (hasTamagui && primitives.length > 0) {
    lines.push(`import { ${primitives.join(', ')} } from 'tamagui'`)
    for (const primitive of primitives) {
      lines.push(
        `if (${primitive}) registerLoaderClient('tamagui#${primitive}', ${primitive})`
      )
    }
  }

  return lines.join('\n')
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
  const entries = exports.map(
    ({ local, exported }) => `${JSON.stringify(exported)}: ${local}`
  )
  s.append(
    `\nimport { registerLoaderClientModule as __oneRegisterClient } from 'one'\n${tags}\n__oneRegisterClient(${JSON.stringify(path)}, { ${entries.join(', ')} })\n`
  )
  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}

type LoaderJSXResolver = (
  source: string,
  importer: string
) => Promise<{ id: string; external?: boolean | 'absolute' } | null | undefined>

export async function collectLoaderJSXRegistrationImports(
  program: any,
  importer: string,
  resolve: LoaderJSXResolver
): Promise<string[]> {
  const used = createLoaderJSXUniversalUse()
  const clientImports: string[] = []
  const seen = new Set<string>()

  const visit = async (program: any, importer: string): Promise<void> => {
    collectLoaderJSXUniversalImports(program, used)

    for (const node of program.body as any[]) {
      if (
        (node.type !== 'ImportDeclaration' &&
          node.type !== 'ExportNamedDeclaration' &&
          node.type !== 'ExportAllDeclaration') ||
        !node.source ||
        node.importKind === 'type' ||
        node.exportKind === 'type'
      )
        continue

      const source = node.source.value as string
      // the framework and universal preset have their own registration paths.
      // crawling their package graphs registers unrelated internal components.
      if (
        source === 'one' ||
        source.startsWith('one/') ||
        source === 'tamagui' ||
        source.startsWith('@tamagui/')
      )
        continue

      const resolved = await resolve(source, importer)
      if (!resolved || resolved.external || /node_modules/.test(resolved.id)) continue
      const file = resolved.id.split('?')[0]!
      const posixFile = toPosix(file)
      if (posixFile.includes('/packages/one/')) continue
      if (seen.has(file)) continue
      seen.add(file)
      if (!/\.(js|jsx|ts|tsx)$/.test(file)) continue

      let sourceCode: string
      try {
        sourceCode = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      const child = parseSync(file, sourceCode)
      if (child.errors.length) continue
      if (hasUseClientDirective(child.program)) {
        clientImports.push(`import '${CLIENT_PREFIX}${file}'`)
      } else {
        await visit(child.program, file)
      }
    }
  }

  await visit(program, importer)
  const selection = loaderJSXUniversalSelection(used)
  return [
    ...(selection.length ? [`import '${UNIVERSAL_PREFIX}${selection.join(',')}'`] : []),
    ...clientImports,
  ]
}

export function loaderJSXPlugin(opts?: { routerRoot?: string; root?: string }): Plugin {
  const routerRoot = opts?.routerRoot ?? 'app'
  let root = opts?.root ?? process.cwd()
  const routeDir = () => `${toPosix(root)}/${routerRoot}/`

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

        if (name === UNIVERSAL_ID || name.startsWith(UNIVERSAL_PREFIX)) {
          const selection =
            name === UNIVERSAL_ID
              ? ['Link', 'all']
              : name
                  .slice(UNIVERSAL_PREFIX.length)
                  .split(',')
                  .filter(
                    (item) =>
                      item === 'Link' || item === 'all' || TAMAGUI_PRIMITIVES.includes(item)
                  )
          const needsTamagui = selection.some((item) => item !== 'Link')
          const tamagui = needsTamagui
            ? await this.resolve('tamagui', `${root}/package.json`)
            : null
          return createLoaderJSXUniversalModule(
            selection,
            Boolean(tamagui && !tamagui.external)
          )
        }

        if (name.startsWith(CLIENT_PREFIX)) {
          const file = name.slice(CLIENT_PREFIX.length)
          const path = toPosix(relative(root, file))
          return `import { registerLoaderClientModule } from 'one'\nimport * as mod from ${JSON.stringify(file)}\nregisterLoaderClientModule(${JSON.stringify(path)}, mod)`
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
        if (!toPosix(id).startsWith(routeDir()) || !/renderJSX|ServerJSX/.test(code))
          return
        const parsed = parseSync(id, code)
        if (parsed.errors.length) return

        const imports = await collectLoaderJSXRegistrationImports(
          parsed.program,
          id,
          (source, importer) => this.resolve(source, importer)
        )
        if (!imports.length) return

        const s = new MagicString(code)
        s.append(`\n${imports.join('\n')}\n`)
        return { code: s.toString(), map: s.generateMap({ hires: true }) }
      },
    },
  } satisfies Plugin
}
