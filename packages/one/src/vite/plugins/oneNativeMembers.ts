import { readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'

type Node = { type: string; [key: string]: any }
type Binding = { source: string; imported: string }

type Module = {
  path: string
  imports: Map<string, Binding>
  values: Map<string, Node>
  exports: Map<string, string>
  reexports: Map<string, Binding>
  stars: string[]
}

// resolves `One.X.Y` reads in app code to direct imports of the module that defines
// them, following one's re-export barrels and frozen namespace objects across files, so
// the bundle graph of an app reaches only the namespaces it reads.
export function nativeOneMembers(file: string, platform = 'ios') {
  const modules = new Map<string, Module | undefined>()
  const load = (path: string) => {
    if (modules.has(path)) return modules.get(path)
    let code: string
    try {
      code = readFileSync(path, 'utf8')
    } catch {
      modules.set(path, undefined)
      return
    }
    const module: Module = {
      path,
      imports: new Map(),
      values: new Map(),
      exports: new Map(),
      reexports: new Map(),
      stars: [],
    }
    modules.set(path, module)
    const from = (specifier: string) => {
      if (!specifier.startsWith('.')) return specifier
      const base = resolve(dirname(path), specifier)
      // extensionless specifiers resolve the way the native bundler picks files
      return (
        [
          '',
          `.${platform}.js`,
          '.native.js',
          '.js',
          `/index.${platform}.js`,
          '/index.native.js',
          '/index.js',
        ]
          .map((suffix) => base + suffix)
          .find((candidate) =>
            statSync(candidate, { throwIfNoEntry: false })?.isFile()
          ) ?? base
      )
    }
    const name = (node: Node) => String(node.name ?? node.value)
    for (const statement of (parseSync(path, code).program as Node).body) {
      if (statement.type === 'ExportAllDeclaration') {
        if (statement.exported)
          module.reexports.set(name(statement.exported), {
            source: from(statement.source.value),
            imported: '*',
          })
        else module.stars.push(from(statement.source.value))
        continue
      }
      if (statement.type === 'ExportNamedDeclaration') {
        for (const item of statement.specifiers ?? []) {
          if (statement.source)
            module.reexports.set(name(item.exported), {
              source: from(statement.source.value),
              imported: name(item.local),
            })
          else module.exports.set(name(item.exported), name(item.local))
        }
      }
      const node =
        statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
      if (node?.type === 'ImportDeclaration') {
        for (const item of node.specifiers) {
          module.imports.set(item.local.name, {
            source: from(node.source.value),
            imported:
              item.type === 'ImportSpecifier'
                ? name(item.imported)
                : item.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : '*',
          })
        }
      } else if (node?.type === 'VariableDeclaration') {
        for (const declaration of node.declarations)
          if (declaration.id.type === 'Identifier') {
            if (declaration.init) module.values.set(declaration.id.name, declaration.init)
            if (node !== statement)
              module.exports.set(declaration.id.name, declaration.id.name)
          }
      } else if (node && node !== statement && node.id) {
        module.exports.set(node.id.name, node.id.name)
      }
    }
    return module
  }
  // the binding of the file in one that defines export `name` of `source`, or undefined
  // when that module provably lacks it. a re-export of a package stays at the file
  // re-exporting it, since the app may not resolve that package itself.
  const resolveExport = (
    source: string,
    name: string,
    seen = new Set<string>()
  ): Binding | undefined => {
    const module = load(source)
    if (!module || seen.has(source)) return
    seen.add(source)
    const here = { source, imported: name }
    const follow = (binding: Binding) =>
      !load(binding.source)
        ? here
        : binding.imported === '*'
          ? binding
          : (resolveExport(binding.source, binding.imported, seen) ?? here)
    const reexport = module.reexports.get(name)
    if (reexport) return follow(reexport)
    const local = module.exports.get(name)
    if (local !== undefined) {
      const imported = module.imports.get(local)
      return imported && !module.values.has(local) ? follow(imported) : here
    }
    for (const star of module.stars) {
      if (!load(star)) return here
      const found = resolveExport(star, name, seen)
      if (found) return found
    }
  }
  const bind = (imported: Binding) =>
    !load(imported.source)
      ? undefined
      : imported.imported === '*'
        ? imported
        : (resolveExport(imported.source, imported.imported) ?? imported)
  type Found = { binding: Binding; consumed: number; call?: boolean; suffix?: string[] }
  // reads `path` off the value bound to `binding`, as deep as the defining modules show
  const descend = (
    binding: Binding,
    path: string[],
    consumed: number
  ): Found | undefined => {
    const target = load(binding.source)
    if (!target || !path.length) return { binding, consumed }
    if (binding.imported === '*') {
      const inner = resolveExport(binding.source, path[0])
      return inner && descend(inner, path.slice(1), consumed + 1)
    }
    const value = target.values.get(target.exports.get(binding.imported) ?? '')
    const found = value && member(target, value, path, consumed)
    if (found) return found
    // an object literal holding path[0] after any spread reads it off the binding
    const object =
      value?.type === 'CallExpression' && value.callee.property?.name === 'freeze'
        ? value.arguments[0]
        : value
    const index =
      object?.type === 'ObjectExpression'
        ? object.properties.findLastIndex(
            (property: Node) =>
              property.type === 'SpreadElement' ||
              (!property.computed &&
                (property.key.name ?? property.key.value) === path[0])
          )
        : -1
    return index >= 0 && object.properties[index].type === 'Property'
      ? { binding, consumed: consumed + 1, suffix: [path[0]] }
      : { binding, consumed }
  }
  const member = (
    module: Module,
    expression: Node,
    path: string[],
    consumed = 0
  ): Found | undefined => {
    if (expression.type === 'Identifier') {
      const imported = module.imports.get(expression.name)
      if (imported) {
        const binding = bind(imported)
        return binding && descend(binding, path, consumed)
      }
      const value = module.values.get(expression.name)
      const found = value && member(module, value, path, consumed)
      if (found || module.path === file) return found
      // an exported local the walk can't see into is imported as it is
      for (const [exported, local] of module.exports)
        if (local === expression.name)
          return { binding: { source: module.path, imported: exported }, consumed }
      return
    }
    if (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'MemberExpression' &&
      expression.callee.object.name === 'Object' &&
      expression.callee.property.name === 'freeze'
    )
      return member(module, expression.arguments[0], path, consumed)
    if (expression.type === 'MemberExpression' && !expression.computed) {
      const found = member(
        module,
        expression.object,
        [expression.property.name, ...path],
        consumed - 1
      )
      if (!found || found.consumed >= consumed) return found
      // `Open.openSettings` of a local the module doesn't export reads off `Open`
      if (found.call || found.consumed < consumed - 1) return
      return {
        ...found,
        consumed,
        suffix: [...(found.suffix ?? []), expression.property.name],
      }
    }
    if (expression.type === 'ConditionalExpression') {
      const test = expression.test
      if (
        test.type === 'BinaryExpression' &&
        test.left.type === 'MemberExpression' &&
        test.left.property.name === 'OS' &&
        typeof test.right.value === 'string' &&
        ['===', '!=='].includes(test.operator)
      )
        return member(
          module,
          (test.right.value === platform) === (test.operator === '===')
            ? expression.consequent
            : expression.alternate,
          path,
          consumed
        )
      return
    }
    if (expression.type !== 'ObjectExpression' || !path.length) return
    for (const property of expression.properties.toReversed()) {
      if (
        property.type === 'Property' &&
        !property.computed &&
        (property.key.name ?? property.key.value) === path[0]
      ) {
        if (property.kind === 'init')
          return member(module, property.value, path.slice(1), consumed + 1)
        const body = property.value.body.body
        const returned =
          body.length === 1 && body[0].type === 'ReturnStatement'
            ? body[0].argument
            : undefined
        if (
          property.kind === 'get' &&
          returned?.type === 'CallExpression' &&
          returned.callee.type === 'Identifier' &&
          !returned.arguments.length
        ) {
          const imported = module.imports.get(returned.callee.name)
          const binding = imported && bind(imported)
          if (binding) return { binding, consumed: consumed + 1, call: true }
        }
        return
      }
      // a spread provides path[0] only when its value is shown to hold it
      if (property.type === 'SpreadElement') {
        const found = member(module, property.argument, path, consumed)
        if (found && found.consumed > consumed) return found
      }
    }
  }
  const shared = load(file)!
  const one = shared.values.get('One')!
  // `escape` hears of every read of `One` the rewrite leaves in place, which keeps the
  // whole of one's platform barrel reachable from the module
  return (source: string, id: string, escape: (reason: string) => void = () => {}) => {
    if (
      /\b(require|import)\s*\(\s*["']one["']\s*\)/.test(source) ||
      /export\s*(\*|\{[^}]*\bOne\b[^}]*\})\s*from\s*["']one["']/.test(source)
    )
      escape('dynamic or re-exported one')
    const parsed = parseSync(id, source, {
      lang: /\.tsx$/.test(id) ? 'tsx' : /\.[cm]?ts$/.test(id) ? 'ts' : 'jsx',
    })
    if (parsed.errors.length) {
      escape('parse error')
      return
    }
    const app = parsed.program as Node
    // `name.<prefix>.rest` reads `One.<base>.rest`
    const roots = new Map<string, { prefix: string[]; base: string[] }>()
    for (const node of app.body) {
      if (
        node.type !== 'ImportDeclaration' ||
        node.source.value !== 'one' ||
        node.importKind === 'type'
      )
        continue
      for (const item of node.specifiers) {
        if (
          item.type === 'ImportSpecifier' &&
          item.importKind !== 'type' &&
          (item.imported.name ?? item.imported.value) === 'One'
        )
          roots.set(item.local.name, { prefix: [], base: [] })
        else if (item.type === 'ImportNamespaceSpecifier')
          roots.set(item.local.name, { prefix: ['One'], base: [] })
      }
    }
    if (!roots.size) return
    const chain = (node: Node) => {
      const path: string[] = []
      const nodes: Node[] = []
      let root = node
      while (
        (root.type === 'MemberExpression' && !root.computed) ||
        root.type === 'JSXMemberExpression'
      ) {
        path.unshift(root.property.name)
        nodes.unshift(root)
        root = root.object
      }
      const read = roots.get(root.name)
      return {
        root,
        path,
        nodes,
        read,
        // a namespace import reading another export of one leaves `One` alone
        onePath:
          read && read.prefix.every((name, index) => path[index] === name)
            ? [...read.base, ...path.slice(read.prefix.length)]
            : undefined,
      }
    }
    // a module-level `const Swift = One.iOS` naming an object the rewrite can't import
    // whole reads like One itself
    const aliases = new Set<Node>()
    for (const statement of app.body) {
      if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') continue
      for (const declaration of statement.declarations) {
        if (declaration.id.type !== 'Identifier' || !declaration.init) continue
        const { onePath } = chain(declaration.init)
        if (!onePath?.length) continue
        if (member(shared, one, onePath)?.consumed === onePath.length) continue
        roots.set(declaration.id.name, { prefix: [], base: onePath })
        aliases.add(declaration)
      }
    }
    const children = (node: Node, visit: (node: Node) => void) => {
      for (const [key, value] of Object.entries(node)) {
        if (
          key === 'typeAnnotation' ||
          key === 'returnType' ||
          key === 'typeParameters' ||
          key === 'typeArguments'
        )
          continue
        for (const child of Array.isArray(value) ? value : [value])
          if (child && typeof child === 'object' && typeof child.type === 'string')
            visit(child)
      }
    }
    const pattern = (node: Node) => {
      if (node.type === 'Identifier') roots.delete(node.name)
      else if (node.type === 'Property') pattern(node.value)
      else children(node, pattern)
    }
    const shadows = (node: Node) => {
      if (node.type === 'ImportDeclaration') return
      if (node.type === 'VariableDeclarator' && !aliases.has(node)) pattern(node.id)
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        if (node.id) pattern(node.id)
        for (const parameter of node.params) pattern(parameter)
      }
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        if (node.id) pattern(node.id)
      }
      if (node.type === 'CatchClause' && node.param) pattern(node.param)
      children(node, shadows)
    }
    const imported = roots.size
    shadows(app)
    if (roots.size < imported) escape('shadowed One')
    const output = new MagicString(source)
    const added = new Map<string, { binding: Binding; alias: string }>()
    const rootOf = (node: Node): Node =>
      node.type === 'MemberExpression' ? rootOf(node.object) : node
    const escaped = new Set<string>()
    const kept = (name: string, reason: string) => {
      escaped.add(name)
      escape(reason)
    }
    const visit = (node: Node) => {
      if (node.type === 'ImportDeclaration' || aliases.has(node)) return
      if (node.type.startsWith('TS')) {
        if (node.expression) visit(node.expression)
        return
      }
      if (node.type === 'Identifier') {
        if (roots.has(node.name)) kept(node.name, `One read at ${node.start}`)
        return
      }
      if (
        (node.type === 'Property' ||
          node.type === 'MethodDefinition' ||
          node.type === 'PropertyDefinition') &&
        !node.computed
      ) {
        if (node.value) visit(node.value)
        return
      }
      const target =
        node.type === 'AssignmentExpression'
          ? node.left
          : node.type === 'UpdateExpression' ||
              (node.type === 'UnaryExpression' && node.operator === 'delete')
            ? node.argument
            : undefined
      if (target) {
        if (roots.has(rootOf(target).name))
          kept(rootOf(target).name, `One written at ${node.start}`)
        if (node.type === 'AssignmentExpression') visit(node.right)
        return
      }
      if (node.type === 'MemberExpression' || node.type === 'JSXMemberExpression') {
        const { root, nodes, read, onePath } = chain(node)
        if (read) {
          if (!onePath) return
          const found = member(shared, one, onePath)
          const consumed = (found?.consumed ?? 0) - read.base.length
          if (
            !found ||
            consumed < 1 ||
            (found.call && node.type === 'JSXMemberExpression')
          ) {
            kept(root.name, `One.${onePath.join('.')}`)
            return
          }
          const key = `${found.binding.source}\0${found.binding.imported}`
          let alias = added.get(key)?.alias
          if (!alias) {
            alias = `__one_member_${added.size}`
            while (new RegExp(`\\b${alias}\\b`).test(source)) alias += '_'
            added.set(key, { binding: found.binding, alias })
          }
          output.overwrite(
            root.start,
            nodes[read.prefix.length + consumed - 1].end,
            found.call
              ? `(${alias}())`
              : alias + (found.suffix ?? []).map((name) => `.${name}`).join('')
          )
          return
        }
        if (nodes.length) {
          visit(root)
          return
        }
      }
      children(node, visit)
    }
    visit(app)
    // an alias whose every read became an import no longer needs One
    for (const declaration of [...aliases].toReversed()) {
      if (escaped.has(declaration.id.name)) escaped.add(chain(declaration.init).root.name)
      else output.overwrite(declaration.init.start, declaration.init.end, 'void 0')
    }
    if (!added.size && !aliases.size) return
    const lastImport = app.body
      .filter((node: Node) => node.type === 'ImportDeclaration')
      .at(-1)
    output.appendLeft(
      lastImport.end,
      '\n' +
        [...added.values()]
          .map(
            ({ binding, alias }) =>
              `import ${binding.imported === '*' ? `* as ${alias}` : `{ ${binding.imported} as ${alias} }`} from ${JSON.stringify(binding.source)};\n`
          )
          .join('')
    )
    return {
      code: output.toString(),
      map: output.generateMap({ source: id, includeContent: true, hires: true }),
    }
  }
}
