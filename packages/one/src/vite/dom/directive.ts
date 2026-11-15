import { parseSync } from 'oxc-parser'
import { basename, relative, resolve } from 'node:path'
import micromatch from 'micromatch'

export function readDOMDirective(
  code: string,
  id: string,
  options: { root: string; routerRoot: string; ignoredRouteFiles?: string[] }
): boolean {
  if (!code.includes('use dom') || !/\.[cm]?[jt]sx?$/.test(id)) return false
  const fail = (reason: string): never => {
    throw new Error(`[one/use-dom] ${id}: ${reason}`)
  }
  const parsed = parseSync(id, code, {
    lang: /\.[cm]?tsx?$/.test(id) ? (id.endsWith('x') ? 'tsx' : 'ts') : 'jsx',
  })
  if (parsed.errors.length) fail(parsed.errors.map((error) => error.message).join('\n'))
  const body = parsed.program.body as any[]
  let directive = false
  for (const node of body) {
    if (node.type !== 'ExpressionStatement' || typeof node.directive !== 'string') break
    if (node.directive === 'use dom') directive = true
  }
  if (!directive) return false
  const route = relative(resolve(options.root, options.routerRoot), id).replaceAll(
    '\\',
    '/'
  )
  const ignored =
    options.ignoredRouteFiles?.length &&
    micromatch.isMatch(`./${route}`, options.ignoredRouteFiles, { matchBase: true })
  if (
    (!route.startsWith('../') && !ignored) ||
    /(?:^|\.)(?:server)(?:\.|$)/.test(basename(id)) ||
    /(?:^_layout\.|\+api\.|^_middleware\.)/.test(basename(id))
  ) {
    fail(
      '"use dom" is component-only; move it out of route, layout, API and server modules'
    )
  }
  let defaults = 0
  for (const node of body) {
    if (node.type === 'ImportDeclaration' && node.source.value === 'server-only') {
      fail('server-only modules cannot use the "use dom" directive')
    }
    if (node.type === 'ExportDefaultDeclaration') {
      if (/^(?:TSInterface|TSTypeAlias)/.test(node.declaration?.type)) continue
      defaults++
    }
    if (node.type === 'ExportAllDeclaration' && node.exportKind !== 'type') {
      fail(
        'export-star is unsupported; export one default component and erased types only'
      )
    }
    if (node.type !== 'ExportNamedDeclaration' || node.exportKind === 'type') continue
    if (
      node.declaration &&
      !/^(?:TSInterface|TSTypeAlias|TSDeclareFunction)/.test(node.declaration.type) &&
      !node.declaration.declare
    ) {
      fail(
        'named runtime exports are unsupported; export one default component and erased types only'
      )
    }
    for (const specifier of node.specifiers ?? []) {
      if (specifier.exportKind === 'type') continue
      if ((specifier.exported.name ?? specifier.exported.value) === 'default') defaults++
      else
        fail(
          'named runtime exports are unsupported; export one default component and erased types only'
        )
    }
  }
  if (defaults !== 1) fail('expected exactly one default runtime component export')
  return true
}
