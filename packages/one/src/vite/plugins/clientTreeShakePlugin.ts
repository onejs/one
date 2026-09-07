import { extname, relative } from 'node:path'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import type { Plugin } from 'vite'
import { EMPTY_LOADER_STRING, makeLoaderRouteIdStub } from '../constants'

export const clientTreeShakePlugin = (opts?: {
  // 'rolldown' when used in the native rolldown DevEngine (no vite environment context)
  runtime?: 'vite' | 'rolldown'
  // the configured router root (One.PluginOptions.router.root), relative to the
  // project root. the loader stub's routeId is built off it, so it must be the
  // real one or buildPage cannot match the stub back to the route.
  routerRoot?: string
}): Plugin => {
  const runtime = opts?.runtime ?? 'vite'
  const routerRoot = opts?.routerRoot ?? 'app'

  return {
    name: 'one-client-tree-shake',

    enforce: 'pre',

    ...(runtime === 'vite' && {
      applyToEnvironment(env: { name: string }) {
        return env.name === 'client' || env.name === 'ios' || env.name === 'android'
      },
    }),

    transform: {
      order: 'pre',
      async handler(code, id, settings) {
        if (runtime === 'vite' && this.environment?.name === 'ssr') {
          return
        }
        if (!/\.(js|jsx|ts|tsx)/.test(extname(id))) {
          return
        }
        if (/node_modules/.test(id)) {
          return
        }

        const out = await transformTreeShakeClient(code, id, process.cwd(), routerRoot)

        return out
      },
    },
  } satisfies Plugin
}

function extractPatternBindings(node: any, names: Set<string>): void {
  if (!node) return
  switch (node.type) {
    case 'Identifier':
      names.add(node.name)
      break
    case 'ObjectPattern':
      for (const prop of node.properties) {
        if (prop.type === 'Property') {
          extractPatternBindings(prop.value, names)
        } else if (prop.type === 'RestElement') {
          extractPatternBindings(prop.argument, names)
        }
      }
      break
    case 'ArrayPattern':
      for (const element of node.elements) {
        if (element) {
          extractPatternBindings(element, names)
        }
      }
      break
    case 'AssignmentPattern':
      extractPatternBindings(node.left, names)
      break
    case 'RestElement':
      extractPatternBindings(node.argument, names)
      break
    case 'TSParameterProperty':
      extractPatternBindings(node.parameter, names)
      break
  }
}

function getReferencedIdentifiers(
  rootNode: any,
  candidateNames: Set<string>
): Set<string> {
  const referenced = new Set<string>()
  const scopeStack: Set<string>[] = []

  function isShadowed(name: string): boolean {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      if (scopeStack[i]!.has(name)) return true
    }
    return false
  }

  function checkIdentifier(name: string): void {
    if (!isShadowed(name) && candidateNames.has(name)) {
      referenced.add(name)
    }
  }

  function walk(node: any): void {
    if (!node || typeof node !== 'object') return

    // Skip TypeScript type declarations and annotations
    if (
      node.type === 'TSTypeAnnotation' ||
      node.type === 'TSTypeReference' ||
      node.type === 'TSTypeAliasDeclaration' ||
      node.type === 'TSInterfaceDeclaration' ||
      node.type === 'TSTypeParameterDeclaration' ||
      node.type === 'TSTypeParameterInstantiation'
    ) {
      return
    }

    if (
      node.type === 'TSAsExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'TSSatisfiesExpression' ||
      node.type === 'TSNonNullExpression'
    ) {
      walk(node.expression)
      return
    }

    function walkPatternExpressions(pat: any): void {
      if (!pat || typeof pat !== 'object') return
      switch (pat.type) {
        case 'AssignmentPattern':
          walk(pat.right)
          walkPatternExpressions(pat.left)
          break
        case 'ObjectPattern':
          for (const prop of pat.properties) {
            if (prop.type === 'Property') {
              if (prop.computed) {
                walk(prop.key)
              }
              walkPatternExpressions(prop.value)
            } else if (prop.type === 'RestElement') {
              walkPatternExpressions(prop.argument)
            }
          }
          break
        case 'ArrayPattern':
          for (const element of pat.elements) {
            if (element) {
              walkPatternExpressions(element)
            }
          }
          break
        case 'RestElement':
          walkPatternExpressions(pat.argument)
          break
        case 'TSParameterProperty':
          walkPatternExpressions(pat.parameter)
          break
      }
    }

    // Function scopes
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      const scope = new Set<string>()
      if (node.type === 'FunctionExpression' && node.id) {
        scope.add(node.id.name)
      }
      if (node.params) {
        for (const param of node.params) {
          walkPatternExpressions(param)
          extractPatternBindings(param, scope)
        }
      }
      // Add var declarations hoisted in function
      function addVars(n: any): void {
        if (!n || typeof n !== 'object') return
        if (
          n.type === 'FunctionDeclaration' ||
          n.type === 'FunctionExpression' ||
          n.type === 'ArrowFunctionExpression'
        ) {
          return // do not cross into inner functions
        }
        if (n.type === 'VariableDeclaration' && n.kind === 'var') {
          for (const d of n.declarations) {
            extractPatternBindings(d.id, scope)
          }
        }
        for (const k of Object.keys(n)) {
          if (k === 'parent') continue
          const val = n[k]
          if (Array.isArray(val)) {
            for (const item of val) addVars(item)
          } else if (val && typeof val === 'object') {
            addVars(val)
          }
        }
      }
      addVars(node.body)

      scopeStack.push(scope)
      walk(node.body)
      scopeStack.pop()
      return
    }

    // Block scopes
    if (node.type === 'BlockStatement') {
      const scope = new Set<string>()
      for (const stmt of node.body) {
        if (
          stmt.type === 'VariableDeclaration' &&
          (stmt.kind === 'let' || stmt.kind === 'const')
        ) {
          for (const decl of stmt.declarations) {
            extractPatternBindings(decl.id, scope)
          }
        } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
          scope.add(stmt.id.name)
        } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
          scope.add(stmt.id.name)
        }
      }
      scopeStack.push(scope)
      for (const stmt of node.body) {
        walk(stmt)
      }
      scopeStack.pop()
      return
    }

    // CatchClause
    if (node.type === 'CatchClause') {
      const scope = new Set<string>()
      if (node.param) {
        extractPatternBindings(node.param, scope)
      }
      scopeStack.push(scope)
      walk(node.body)
      scopeStack.pop()
      return
    }

    // Loop scopes
    if (
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement'
    ) {
      const scope = new Set<string>()
      const initOrLeft = node.init || node.left
      if (
        initOrLeft &&
        initOrLeft.type === 'VariableDeclaration' &&
        initOrLeft.kind !== 'var'
      ) {
        for (const decl of initOrLeft.declarations) {
          extractPatternBindings(decl.id, scope)
        }
      }
      scopeStack.push(scope)
      if (node.init) walk(node.init)
      if (node.left) walk(node.left)
      if (node.right) walk(node.right)
      if (node.test) walk(node.test)
      if (node.update) walk(node.update)
      walk(node.body)
      scopeStack.pop()
      return
    }

    // Identifiers
    if (node.type === 'Identifier') {
      checkIdentifier(node.name)
      return
    }

    // JSX
    if (node.type === 'JSXOpeningElement') {
      if (node.name) {
        if (node.name.type === 'JSXIdentifier') {
          if (node.name.name && /^[A-Z]/.test(node.name.name)) {
            checkIdentifier(node.name.name)
          }
        } else if (node.name.type === 'JSXMemberExpression') {
          let rootObj = node.name.object
          while (rootObj && rootObj.type === 'JSXMemberExpression') {
            rootObj = rootObj.object
          }
          if (rootObj && rootObj.type === 'JSXIdentifier') {
            checkIdentifier(rootObj.name)
          }
        }
      }
      if (node.attributes) {
        for (const attr of node.attributes) {
          walk(attr)
        }
      }
      return
    }

    if (node.type === 'JSXAttribute') {
      if (node.value) walk(node.value)
      return
    }

    if (node.type === 'JSXClosingElement') {
      return
    }

    // Property in ObjectExpression
    if (node.type === 'Property') {
      if (node.computed) {
        walk(node.key)
      }
      walk(node.value)
      return
    }

    // MemberExpression
    if (node.type === 'MemberExpression') {
      walk(node.object)
      if (node.computed) {
        walk(node.property)
      }
      return
    }

    // VariableDeclarator
    if (node.type === 'VariableDeclarator') {
      walkPatternExpressions(node.id)
      if (node.init) {
        walk(node.init)
      }
      return
    }

    // ExportSpecifier
    if (node.type === 'ExportSpecifier') {
      if (node.local && node.local.type === 'Identifier') {
        checkIdentifier(node.local.name)
      }
      return
    }

    // Generic recursive walk
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object') walk(item)
        }
      } else if (child && typeof child === 'object') {
        walk(child)
      }
    }
  }

  walk(rootNode)
  return referenced
}

export async function transformTreeShakeClient(
  code: string,
  id: string,
  root?: string,
  routerRoot = 'app'
) {
  if (!/generateStaticParams|loader/.test(code)) {
    return
  }

  const isProd = process.env.NODE_ENV === 'production'
  const filename = (id || 'file.tsx').split('?')[0]!.split('#')[0]!

  let parseResult: any
  try {
    parseResult = parseSync(filename, code)
    if (parseResult.errors && parseResult.errors.length > 0) {
      const errorMessage = parseResult.errors.map((e: any) => e.message).join('\n')
      if (isProd) {
        throw new Error(
          `[one] Failed to parse ${id} with server exports:\n${errorMessage}`
        )
      }
      console.warn(
        `[one] Skipping tree shaking for ${id} due to syntax error:`,
        errorMessage
      )
      return
    }
  } catch (error) {
    if (isProd) {
      throw error instanceof Error ? error : new Error(String(error))
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(
      `[one] Skipping tree shaking for ${id} due to syntax error:`,
      errorMessage
    )
    return
  }

  const ast = parseResult.program

  try {
    return doTreeShakeClient(code, id, root, ast, routerRoot)
  } catch (error) {
    if (isProd) {
      throw error instanceof Error ? error : new Error(String(error))
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(
      `[one] Skipping tree shaking for ${id} due to analysis error:`,
      errorMessage
    )
    return
  }
}

function doTreeShakeClient(
  code: string,
  id: string,
  root: string | undefined,
  ast: any,
  routerRoot: string
) {
  const removed: Record<string, boolean> = {
    loader: false,
    generateStaticParams: false,
  }

  const serverExportStmts = new Map<
    any,
    { names: Set<string>; replaceAll: boolean; declaratorsToRemove: Set<any> }
  >()

  for (const stmt of ast.body) {
    if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      if (stmt.declaration.type === 'FunctionDeclaration') {
        const fnName = stmt.declaration.id?.name
        if (fnName === 'loader' || fnName === 'generateStaticParams') {
          removed[fnName] = true
          serverExportStmts.set(stmt, {
            names: new Set([fnName]),
            replaceAll: true,
            declaratorsToRemove: new Set(),
          })
        }
      } else if (stmt.declaration.type === 'VariableDeclaration') {
        const found: any[] = []
        for (const d of stmt.declaration.declarations) {
          if (
            d.id?.type === 'Identifier' &&
            (d.id.name === 'loader' || d.id.name === 'generateStaticParams')
          ) {
            found.push(d)
            removed[d.id.name] = true
          }
        }
        if (found.length > 0) {
          serverExportStmts.set(stmt, {
            names: new Set(found.map((d) => d.id.name)),
            replaceAll: found.length === stmt.declaration.declarations.length,
            declaratorsToRemove: new Set(found),
          })
        }
      }
    }
  }

  const removedFunctions = Object.keys(removed).filter((k) => removed[k])
  if (removedFunctions.length === 0) {
    return
  }

  // Collect all module bindings
  const moduleBindings = new Map<
    string,
    {
      kind: 'import' | 'function' | 'variable' | 'class' | 'enum'
      stmt: any
      node: any
      isType?: boolean
    }
  >()

  for (const stmt of ast.body) {
    if (stmt.type === 'ImportDeclaration') {
      const isDeclType = stmt.importKind === 'type'
      for (const sp of stmt.specifiers) {
        const isType = isDeclType || sp.importKind === 'type'
        moduleBindings.set(sp.local.name, {
          kind: 'import',
          stmt,
          node: sp,
          isType,
        })
      }
    } else if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      const decl = stmt.declaration
      if (decl.type === 'FunctionDeclaration' && decl.id) {
        moduleBindings.set(decl.id.name, { kind: 'function', stmt, node: decl })
      } else if (decl.type === 'VariableDeclaration') {
        for (const d of decl.declarations) {
          const names = new Set<string>()
          extractPatternBindings(d.id, names)
          for (const name of names) {
            moduleBindings.set(name, { kind: 'variable', stmt, node: d })
          }
        }
      } else if (decl.type === 'ClassDeclaration' && decl.id) {
        moduleBindings.set(decl.id.name, { kind: 'class', stmt, node: decl })
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      moduleBindings.set(stmt.id.name, { kind: 'function', stmt, node: stmt })
    } else if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        const names = new Set<string>()
        extractPatternBindings(d.id, names)
        for (const name of names) {
          moduleBindings.set(name, { kind: 'variable', stmt, node: d })
        }
      }
    } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
      moduleBindings.set(stmt.id.name, { kind: 'class', stmt, node: stmt })
    } else if (stmt.type === 'TSEnumDeclaration' && stmt.id) {
      moduleBindings.set(stmt.id.name, { kind: 'enum', stmt, node: stmt })
    }
  }

  const allBindingNames = new Set(moduleBindings.keys())
  const topLevelDeps = new Map<string, Set<string>>()
  const clientRootDeps = new Set<string>()

  // Compute dependencies of all module declarations
  for (const [name, info] of moduleBindings) {
    if (info.kind === 'import') {
      topLevelDeps.set(name, new Set())
    } else if (info.kind === 'function') {
      topLevelDeps.set(name, getReferencedIdentifiers(info.node, allBindingNames))
    } else if (info.kind === 'variable') {
      const deps = getReferencedIdentifiers(info.node, allBindingNames)
      deps.delete(name)
      topLevelDeps.set(name, deps)
    } else if (info.kind === 'class') {
      topLevelDeps.set(name, getReferencedIdentifiers(info.node, allBindingNames))
    } else if (info.kind === 'enum') {
      topLevelDeps.set(name, getReferencedIdentifiers(info.node, allBindingNames))
    }
  }

  // 1. BFS for server needed (transitive closure of loader and generateStaticParams)
  const serverNeeded = new Set<string>()
  const serverQueue: string[] = []
  for (const fn of removedFunctions) {
    const deps = topLevelDeps.get(fn)
    if (deps) {
      for (const dep of deps) serverQueue.push(dep)
    }
  }
  while (serverQueue.length > 0) {
    const name = serverQueue.shift()!
    if (serverNeeded.has(name)) continue
    serverNeeded.add(name)
    const deps = topLevelDeps.get(name)
    if (deps) {
      for (const dep of deps) {
        if (!serverNeeded.has(dep)) serverQueue.push(dep)
      }
    }
  }

  // 2. Compute client root dependencies from all retained statements
  for (const stmt of ast.body) {
    if (stmt.type === 'ImportDeclaration') {
      continue
    }

    if (serverExportStmts.has(stmt)) {
      const info = serverExportStmts.get(stmt)!
      if (!info.replaceAll && stmt.declaration?.declarations) {
        for (const d of stmt.declaration.declarations) {
          if (!info.declaratorsToRemove.has(d)) {
            const deps = getReferencedIdentifiers(d, allBindingNames)
            for (const dep of deps) clientRootDeps.add(dep)
          }
        }
      }
      continue
    }

    if (stmt.type === 'VariableDeclaration') {
      const allInServer = stmt.declarations.every((d: any) => {
        const names = new Set<string>()
        extractPatternBindings(d.id, names)
        return names.size > 0 && Array.from(names).every((n) => serverNeeded.has(n))
      })
      if (!allInServer) {
        // Retained on client!
        for (const d of stmt.declarations) {
          const names = new Set<string>()
          extractPatternBindings(d.id, names)
          const inServer =
            names.size > 0 && Array.from(names).every((n) => serverNeeded.has(n))
          if (!inServer) {
            const deps = getReferencedIdentifiers(d, allBindingNames)
            for (const dep of deps) clientRootDeps.add(dep)
          }
        }
      }
      continue
    }

    if (
      (stmt.type === 'FunctionDeclaration' ||
        stmt.type === 'ClassDeclaration' ||
        stmt.type === 'TSEnumDeclaration') &&
      stmt.id &&
      serverNeeded.has(stmt.id.name)
    ) {
      // Local server declaration, do not treat as client root
      continue
    }

    // All other top-level statements (ExportDefaultDeclaration, ExportNamedDeclaration,
    // ExpressionStatement, IfStatement, ForStatement, WhileStatement, TryStatement, BlockStatement, etc.)
    const deps = getReferencedIdentifiers(stmt, allBindingNames)
    for (const dep of deps) clientRootDeps.add(dep)
  }

  // 3. BFS for client needed
  const clientNeeded = new Set<string>()
  const clientQueue = Array.from(clientRootDeps)
  while (clientQueue.length > 0) {
    const name = clientQueue.shift()!
    if (clientNeeded.has(name)) continue
    clientNeeded.add(name)
    // Do NOT expand server stub exports into server dependencies
    if (name === 'loader' || name === 'generateStaticParams') continue
    const deps = topLevelDeps.get(name)
    if (deps) {
      for (const dep of deps) {
        if (!clientNeeded.has(dep)) clientQueue.push(dep)
      }
    }
  }

  // 4. Exclusive server bindings
  const exclusiveServerBindings = new Set<string>()
  for (const name of serverNeeded) {
    if (!clientNeeded.has(name)) {
      exclusiveServerBindings.add(name)
    }
  }

  // Use MagicString to apply modifications
  const s = new MagicString(code)

  // 1. Replace server export declarations with stubs
  for (const [stmt, info] of serverExportStmts) {
    const stubs: string[] = []
    if (info.names.has('loader')) {
      if (root) {
        // compute routeId relative to the router root so it matches the
        // route contextKey format buildPage looks the stub up by.
        // contextKeys are like "./_layout.tsx", "./matches-test/page1+ssg.tsx"
        const fromRoot = relative(root, id).replace(/\\/g, '/')
        const prefix = routerRoot.replace(/^\.\//, '').replace(/\/$/, '') + '/'
        const routeId =
          './' + (fromRoot.startsWith(prefix) ? fromRoot.slice(prefix.length) : fromRoot)
        stubs.push(makeLoaderRouteIdStub(routeId))
      } else {
        stubs.push(EMPTY_LOADER_STRING)
      }
    }
    if (info.names.has('generateStaticParams')) {
      stubs.push('export function generateStaticParams() {};')
    }

    if (info.replaceAll) {
      s.overwrite(stmt.start, stmt.end, stubs.join('\n'))
    } else {
      // Remove only the server declarators
      const decl = stmt.declaration
      for (let i = decl.declarations.length - 1; i >= 0; i--) {
        const d = decl.declarations[i]
        if (info.declaratorsToRemove.has(d)) {
          if (i === 0) {
            const next = decl.declarations[1]
            s.remove(d.start, next.start)
          } else {
            const prev = decl.declarations[i - 1]
            s.remove(prev.end, d.end)
          }
        }
      }
      s.appendRight(stmt.end, '\n' + stubs.join('\n'))
    }
  }

  // 2. Remove exclusive local declarations (functions, variables, classes)
  for (const stmt of ast.body) {
    if (serverExportStmts.has(stmt) || stmt.type === 'ImportDeclaration') continue

    if (
      (stmt.type === 'FunctionDeclaration' ||
        stmt.type === 'ClassDeclaration' ||
        stmt.type === 'TSEnumDeclaration') &&
      stmt.id &&
      exclusiveServerBindings.has(stmt.id.name)
    ) {
      let end = stmt.end
      if (code[end] === ';') end++
      if (code[end] === '\r' && code[end + 1] === '\n') end += 2
      else if (code[end] === '\n') end += 1
      s.remove(stmt.start, end)
    } else if (stmt.type === 'VariableDeclaration') {
      const allExclusive = stmt.declarations.every((d: any) => {
        const names = new Set<string>()
        extractPatternBindings(d.id, names)
        return Array.from(names).every((n) => exclusiveServerBindings.has(n))
      })
      if (allExclusive) {
        let end = stmt.end
        if (code[end] === ';') end++
        if (code[end] === '\r' && code[end + 1] === '\n') end += 2
        else if (code[end] === '\n') end += 1
        s.remove(stmt.start, end)
      } else {
        // Check if any individual declarators should be removed
        for (let i = stmt.declarations.length - 1; i >= 0; i--) {
          const d = stmt.declarations[i]
          const names = new Set<string>()
          extractPatternBindings(d.id, names)
          if (Array.from(names).every((n) => exclusiveServerBindings.has(n))) {
            if (i === 0) {
              const next = stmt.declarations[1]
              s.remove(d.start, next.start)
            } else {
              const prev = stmt.declarations[i - 1]
              s.remove(prev.end, d.end)
            }
          }
        }
      }
    } else if (
      stmt.type === 'ClassDeclaration' &&
      stmt.id &&
      exclusiveServerBindings.has(stmt.id.name)
    ) {
      let end = stmt.end
      if (code[end] === ';') end++
      if (code[end] === '\r' && code[end + 1] === '\n') end += 2
      else if (code[end] === '\n') end += 1
      s.remove(stmt.start, end)
    }
  }

  // 3. Remove unused import specifiers / declarations
  for (const stmt of ast.body) {
    if (stmt.type !== 'ImportDeclaration') continue
    if (stmt.importKind === 'type') continue // Preserve type-only imports
    if (!stmt.specifiers || stmt.specifiers.length === 0) continue // Preserve side-effect imports

    const kept = stmt.specifiers.filter((sp: any) => {
      if (sp.importKind === 'type') return true
      return !exclusiveServerBindings.has(sp.local.name)
    })

    if (kept.length === 0) {
      let end = stmt.end
      if (code[end] === ';') end++
      if (code[end] === '\r' && code[end + 1] === '\n') end += 2
      else if (code[end] === '\n') end += 1
      s.remove(stmt.start, end)
    } else if (kept.length < stmt.specifiers.length) {
      const declCode = code.slice(stmt.start, stmt.source.start)
      const prefixMatch = declCode.match(/^import\s+/)
      const prefixEnd = stmt.start + (prefixMatch ? prefixMatch[0].length : 7)

      let pos = stmt.source.start - 1
      while (pos >= 0 && /\s/.test(code[pos]!)) pos--
      const fromStart = pos - 3 // 'from' keyword start

      const defaultSpec = kept.find((sp: any) => sp.type === 'ImportDefaultSpecifier')
      const namespaceSpec = kept.find((sp: any) => sp.type === 'ImportNamespaceSpecifier')
      const namedSpecs = kept.filter((sp: any) => sp.type === 'ImportSpecifier')

      const parts: string[] = []
      if (defaultSpec) parts.push(defaultSpec.local.name)
      if (namespaceSpec) parts.push('* as ' + namespaceSpec.local.name)
      if (namedSpecs.length > 0) {
        const namedStr = namedSpecs
          .map((sp: any) => {
            const typePrefix = sp.importKind === 'type' ? 'type ' : ''
            const importedName = sp.imported.raw || sp.imported.name
            if (importedName === sp.local.name) {
              return typePrefix + sp.local.name
            }
            return typePrefix + importedName + ' as ' + sp.local.name
          })
          .join(', ')
        parts.push('{ ' + namedStr + ' }')
      }
      s.overwrite(prefixEnd, fromStart, parts.join(', ') + ' ')
    }
  }

  console.info(
    ` 🧹 [one]      ${relative(process.cwd(), id)} removed ${removedFunctions.length} server-only exports`
  )

  return {
    code: s.toString(),
    map: s.generateMap({ hires: 'boundary', source: id, includeContent: true }),
  }
}
