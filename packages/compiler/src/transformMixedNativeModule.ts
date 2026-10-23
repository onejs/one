import { parseSync } from 'oxc-parser'
import MagicString from 'magic-string'
import remapping from '@jridgewell/remapping'

// collect scopes before inspecting references so hoisted and later declarations
// shadow the commonjs wrapper just as earlier declarations do.
type Node = any
type Scope = { parent?: Scope; bindings: Set<string>; function: boolean }

function analyze(program: Node) {
  const scopes = new WeakMap<object, Scope>()
  const bindings = new WeakSet<object>()
  const root: Scope = { bindings: new Set(), function: true }
  function bind(pattern: Node, scope: Scope) {
    if (!pattern) return
    if (pattern.type === 'Identifier') {
      scope.bindings.add(pattern.name)
      bindings.add(pattern)
    } else if (pattern.type === 'RestElement') bind(pattern.argument, scope)
    else if (pattern.type === 'AssignmentPattern') bind(pattern.left, scope)
    else if (pattern.type === 'ArrayPattern') {
      for (const item of pattern.elements) bind(item, scope)
    } else if (pattern.type === 'ObjectPattern') {
      for (const item of pattern.properties)
        bind(item.type === 'RestElement' ? item.argument : item.value, scope)
    }
  }
  function visit(node: Node, parentScope: Scope) {
    let scope = parentScope
    const fn =
      /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(
        node.type
      )
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration')
      bind(node.id, parentScope)
    if (
      fn ||
      /^(?:BlockStatement|CatchClause|ForStatement|ForInStatement|ForOfStatement|SwitchStatement|ClassExpression|ClassDeclaration|StaticBlock)$/.test(
        node.type
      )
    ) {
      scope = {
        parent: parentScope,
        bindings: new Set(),
        function: fn || node.type === 'StaticBlock',
      }
    }
    scopes.set(node, scope)
    if (fn) {
      if (node.type === 'FunctionExpression') bind(node.id, scope)
      for (const param of node.params) bind(param, scope)
    }
    if (node.type === 'ClassExpression' || node.type === 'ClassDeclaration')
      bind(node.id, scope)
    if (node.type === 'CatchClause') bind(node.param, scope)
    if (node.type === 'VariableDeclaration') {
      let target = scope
      if (node.kind === 'var') while (!target.function) target = target.parent!
      for (const declaration of node.declarations) bind(declaration.id, target)
    }
    if (node.type === 'ImportDeclaration')
      for (const specifier of node.specifiers) bind(specifier.local, scope)
    children(node, (child) => visit(child, scope))
    if (
      (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') &&
      node.id
    )
      scopes.set(node.id, parentScope)
  }
  visit(program, root)
  function binding(node: Node): Scope | undefined {
    let scope = scopes.get(node)
    while (scope && !scope.bindings.has(node.name)) scope = scope.parent
    return scope
  }
  return { bindings, binding, rootBindings: root.bindings }
}

function children(node: Node, visit: (child: Node, key: string) => void) {
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) visit(child, key)
    } else if (value?.type) visit(value, key)
  }
}

function isReference(node: Node, parent: Node, key: string, bindings: WeakSet<object>) {
  if (bindings.has(node)) return false
  if (
    (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') &&
    key === 'property' &&
    !parent.computed
  )
    return false
  if (
    /^(?:Property|MethodDefinition|PropertyDefinition)$/.test(parent.type) &&
    key === 'key' &&
    !parent.computed
  )
    return false
  if (
    /^(?:Import.*Specifier|ExportSpecifier|LabeledStatement|BreakStatement|ContinueStatement|MetaProperty)$/.test(
      parent.type
    )
  )
    return false
  return true
}

// swc exposes local exports through getters. metro uses writable properties and
// updates them when the local binding changes. lower those assignments before
// swc handles imports, re-exports, and typescript.
function lowerLocalExports(
  program: Node,
  code: string,
  analysis: ReturnType<typeof analyze>
) {
  const edited = new MagicString(code)
  let exportAccess = '__mixedExports'
  while (code.includes(exportAccess)) exportAccess += '_'
  // capture the wrapper binding outside source scopes, including functions whose
  // parameters shadow exports. reading through a closure also honors a source
  // assignment to the wrapper's exports variable.
  const exportBinding = analysis.rootBindings.has('exports')
    ? `const ${exportAccess} = module.exports;`
    : `const ${exportAccess} = () => exports;`
  const exportObject = analysis.rootBindings.has('exports')
    ? exportAccess
    : `${exportAccess}()`
  const exported = new Map<string, { scope: Scope | undefined; names: string[] }>()
  const imported = new Set<string>()
  for (const node of program.body)
    if (node.type === 'ImportDeclaration')
      for (const specifier of node.specifiers) imported.add(specifier.local.name)
  const hoisted: string[] = []
  const defaultFunctions: string[] = []
  function names(pattern: Node): Node[] {
    if (!pattern) return []
    if (pattern.type === 'Identifier') return [pattern]
    if (pattern.type === 'RestElement') return names(pattern.argument)
    if (pattern.type === 'AssignmentPattern') return names(pattern.left)
    if (pattern.type === 'ArrayPattern') return pattern.elements.flatMap(names)
    if (pattern.type === 'ObjectPattern')
      return pattern.properties.flatMap((item: Node) =>
        names(item.type === 'RestElement' ? item.argument : item.value)
      )
    return []
  }
  function add(id: Node, name: string) {
    const entry = exported.get(id.name) || {
      scope: analysis.binding(id),
      names: [],
    }
    entry.names.push(name)
    exported.set(id.name, entry)
  }
  const assignments = (id: string) =>
    exported
      .get(id)!
      .names.map((name) => `${exportObject}[${JSON.stringify(name)}] = `)
      .join('') + id
  for (const node of program.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      const declaration = node.declaration
      if (
        declaration.type === 'FunctionDeclaration' ||
        (declaration.type === 'ClassDeclaration' && declaration.id)
      ) {
        edited.remove(node.start, declaration.start)
        if (declaration.id) {
          add(declaration.id, 'default')
          if (declaration.type === 'FunctionDeclaration')
            hoisted.push(declaration.id.name)
          else
            edited.appendLeft(
              node.end,
              `;${exportObject}.default = ${declaration.id.name};`
            )
        } else {
          let name = '__mixedDefault'
          while (code.includes(name)) name += '_'
          const prefix = code
            .slice(declaration.start, declaration.body.start)
            .match(/^(?:async\s+)?function\s*\*?/)![0]
          edited.prependRight(declaration.start + prefix.length, ` ${name}`)
          defaultFunctions.push(`${exportObject}.default = ${name};`)
        }
      } else if (declaration.type !== 'TSInterfaceDeclaration') {
        edited.overwrite(node.start, declaration.start, `${exportObject}.default = (`)
        edited.appendLeft(declaration.end, ')')
      }
    }
    if (
      node.type === 'ExportNamedDeclaration' &&
      !node.source &&
      node.exportKind !== 'type'
    ) {
      const declaration = node.declaration
      if (declaration) {
        if (/^(?:TS|Interface|Type)/.test(declaration.type)) continue
        const ids =
          declaration.type === 'VariableDeclaration'
            ? declaration.declarations.flatMap((item: Node) => names(item.id))
            : names(declaration.id)
        for (const id of ids) add(id, id.name)
        edited.remove(node.start, declaration.start)
        if (declaration.type === 'FunctionDeclaration')
          hoisted.push(...ids.map((id: Node) => id.name))
      } else {
        // imported re-exports retain swc's live getters.
        const locals = node.specifiers.filter(
          (item: Node) => item.exportKind !== 'type' && !imported.has(item.local.name)
        )
        for (const item of locals)
          add(item.local, item.exported.name ?? item.exported.value)
        if (locals.length === node.specifiers.length) edited.remove(node.start, node.end)
        else if (locals.length) {
          // preserve the remaining specifiers without overlapping edits.
          const retained = node.specifiers.filter(
            (other: Node) => !locals.includes(other)
          )
          edited.overwrite(
            node.start,
            node.end,
            `export { ${retained.map((other: Node) => code.slice(other.start, other.end)).join(', ')} };`
          )
        }
      }
    }
  }
  // export lists may precede their declaration or add aliases after it.
  for (const node of program.body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    if (!declaration) continue
    if (declaration.type === 'VariableDeclaration') {
      for (const item of declaration.declarations)
        for (const id of names(item.id)) {
          if (exported.has(id.name)) {
            if (item.id.type === 'Identifier' && item.init) {
              const prefix = exported
                .get(id.name)!
                .names.map((name) => `${exportObject}[${JSON.stringify(name)}] = `)
                .join('')
              edited.prependRight(item.init.start, prefix + '(')
              edited.appendLeft(item.init.end, ')')
            } else if (item.id.type !== 'Identifier')
              edited.appendLeft(node.end, `;${assignments(id.name)};`)
          }
        }
    } else if (
      declaration.type === 'FunctionDeclaration' &&
      exported.has(declaration.id?.name)
    ) {
      if (!hoisted.includes(declaration.id.name)) hoisted.push(declaration.id.name)
    } else if (
      declaration.type === 'ClassDeclaration' &&
      exported.has(declaration.id?.name)
    ) {
      edited.appendLeft(node.end, `;${assignments(declaration.id.name)};`)
    }
  }
  let temporary = '__mixedExportResult'
  while (code.includes(temporary)) temporary += '_'
  // use paired inserts so nested assignment expressions retain their mappings.
  function mutations(node: Node) {
    if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
      const ids = (
        node.left.type === 'VariableDeclaration'
          ? node.left.declarations.flatMap((item: Node) => names(item.id))
          : names(node.left)
      ).filter(
        (id: Node) =>
          exported.has(id.name) && analysis.binding(id) === exported.get(id.name)!.scope
      )
      if (ids.length) {
        const publish = ids.map((id: Node) => assignments(id.name) + ';').join('')
        if (node.body.type === 'BlockStatement')
          edited.prependRight(node.body.start + 1, publish)
        else {
          edited.prependRight(node.body.start, '{' + publish)
          edited.appendLeft(node.body.end, '}')
        }
      }
    }
    if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
      const ids = names(
        node.type === 'AssignmentExpression' ? node.left : node.argument
      ).filter(
        (id: Node) =>
          exported.has(id.name) && analysis.binding(id) === exported.get(id.name)!.scope
      )
      if (ids.length) {
        edited.prependRight(
          node.start,
          `((${temporary}) => (${ids.map((id: Node) => assignments(id.name)).join(', ')}, ${temporary}))(`
        )
        edited.appendLeft(node.end, ')')
      }
    }
    children(node, (child) => mutations(child))
  }
  mutations(program)
  // leave directives first, including an explicit use strict from the author.
  const first = program.body.find(
    (node: Node) => !(node.type === 'ExpressionStatement' && node.directive)
  )
  const initialization = [...exported.values()]
    .flatMap((entry) => entry.names)
    .map((name) => `${exportObject}[${JSON.stringify(name)}] = void 0;`)
    .join('')
  edited.prependRight(
    first?.start ?? code.length,
    `export {};${exportBinding}${initialization}${hoisted.map((id) => assignments(id) + ';').join('')}${defaultFunctions.join('')}`
  )
  return edited
}

export async function transformMixedNativeModule(
  code: string,
  filename: string,
  sourceMaps = false
): Promise<{ code: string; map?: any } | undefined> {
  if (!/\b(?:module|exports)\b/.test(code) || !/\b(?:import|export)\b/.test(code)) return
  const typescript = /\.[cm]?tsx?$/.test(filename)
  const parsed = parseSync(filename, code, {
    lang: typescript ? (filename.endsWith('tsx') ? 'tsx' : 'ts') : 'jsx',
  })
  if (parsed.errors.length) throw new Error(parsed.errors[0]!.message)
  let program = parsed.program
  if (!program.body.some((node) => /^(?:Import|Export)/.test(node.type))) return
  let analysis = analyze(program)
  let mixed = false
  function inspect(node: Node, parent: Node, key: string) {
    // types do not reference the runtime commonjs wrapper.
    if (
      node.declare ||
      node.importKind === 'type' ||
      node.exportKind === 'type' ||
      /^(?:TSTypeAliasDeclaration|TSInterfaceDeclaration)$/.test(node.type) ||
      /^(?:typeAnnotation|typeArguments|typeParameters|returnType|superTypeArguments|implements)$/.test(
        key
      )
    )
      return
    if (
      node.type === 'Identifier' &&
      /^(?:module|exports)$/.test(node.name) &&
      isReference(node, parent, key, analysis.bindings) &&
      !analysis.binding(node)
    )
      mixed = true
    children(node, (child, key) => inspect(child, node, key))
  }
  inspect(program, program, '')
  if (!mixed) return

  const { transform } = await import('@swc/core')
  let typeMap: any
  if (typescript) {
    // lower runtime typescript declarations before assigning writable exports.
    // otherwise enums and namespaces retain swc's getter-only module exports.
    const stripped = await transform(code, {
      filename,
      swcrc: false,
      configFile: false,
      sourceMaps,
      jsc: {
        target: 'esnext',
        parser: { syntax: 'typescript', tsx: filename.endsWith('.tsx') },
        transform: { react: { runtime: 'preserve' } },
      },
      module: { type: 'es6' },
    })
    code = stripped.code
    typeMap = stripped.map ? JSON.parse(stripped.map) : undefined
    const javascript = parseSync(filename, code, { lang: 'jsx' })
    if (javascript.errors.length) throw new Error(javascript.errors[0]!.message)
    program = javascript.program
    analysis = analyze(program)
  }
  const edited = lowerLocalExports(program, code, analysis)
  const result = await transform(edited.toString(), {
    filename,
    swcrc: false,
    configFile: false,
    sourceMaps,
    jsc: {
      target: 'esnext',
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'classic' } },
    },
    module: { type: 'commonjs', strictMode: false, allowTopLevelThis: true },
  })
  return {
    code: result.code,
    map: result.map
      ? remapping(
          [
            JSON.parse(result.map),
            edited.generateMap({
              source: filename,
              includeContent: true,
              hires: true,
            }),
            ...(typeMap ? [typeMap] : []),
          ],
          () => null
        )
      : undefined,
  }
}
