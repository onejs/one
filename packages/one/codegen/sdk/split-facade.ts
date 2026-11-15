import { parse } from '@babel/parser'
import traverse, { type NodePath } from '@babel/traverse'
import type { Statement } from '@babel/types'

// split javascript so type references cannot pull runtime classes in.
// a class and its nested declarations share a module and one registration.
export function splitFacade(
  code: string,
  selected?: ReadonlySet<string>
): Map<string, string> {
  const ast = parse(code, { sourceType: 'module' })
  const statements = ast.program.body
  const classes = new Set(
    statements.flatMap((node) =>
      node.type === 'ClassDeclaration' && node.id ? [node.id.name] : []
    )
  )
  const classNames = [...classes].sort((a, b) => a.length - b.length)
  const groupFor = (name: string): string => {
    const parent = classNames.find((owner) => name.startsWith(owner + '_'))
    return (
      parent ?? (classes.has(name) ? name : name.startsWith('$callSDK') ? '_calls' : name)
    )
  }
  const groups = new Map<string, Statement[]>()
  const owners = new Map<Statement, string>()
  const bindings = new Map<string, string>()
  const exports = new Map<string, string>()
  const add = (group: string, node: Statement) => {
    groups.set(group, [...(groups.get(group) ?? []), node])
    owners.set(node, group)
  }
  for (const node of statements) {
    if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ExportSpecifier')
          exports.set(
            specifier.local.name,
            specifier.exported.type === 'Identifier'
              ? specifier.exported.name
              : specifier.exported.value
          )
      }
    } else if (node.type === 'ClassDeclaration' || node.type === 'FunctionDeclaration') {
      if (!node.id) throw new Error('anonymous SDK declaration')
      const group = groupFor(node.id.name)
      bindings.set(node.id.name, group)
      add(group, node)
    } else if (node.type === 'VariableDeclaration') {
      if (node.declarations.length !== 1 || node.declarations[0].id.type !== 'Identifier')
        throw new Error('SDK facade must have one named binding per declaration')
      const name = node.declarations[0].id.name
      const group = groupFor(name)
      bindings.set(name, group)
      add(group, node)
    } else if (node.type === 'ExpressionStatement') {
      const call = node.expression
      if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier')
        throw new Error('unexpected SDK facade side effect')
      if (
        call.callee.name === 'registerSDKClass' &&
        call.arguments[1]?.type === 'Identifier'
      ) {
        add(groupFor(call.arguments[1].name), node)
      } else if (call.callee.name === 'registerSDKProtocol') {
        // protocols have no javascript binding; retain their runtime metadata.
        add('_protocols', node)
      } else throw new Error('unexpected SDK facade registration')
    } else if (node.type !== 'ImportDeclaration' && node.type !== 'EmptyStatement') {
      throw new Error('unexpected SDK facade statement: ' + node.type)
    }
  }
  const dependencies = new Map<string, Set<string>>()
  traverse(ast, {
    ReferencedIdentifier(path) {
      const binding = path.scope.getBinding(path.node.name)
      if (!binding || binding.scope.path.type !== 'Program') return
      let top: NodePath = path
      while (top.parentPath && top.parentPath.node.type !== 'Program')
        top = top.parentPath
      if (!top.isStatement()) return
      const owner = owners.get(top.node)
      const dependency = bindings.get(path.node.name)
      if (!owner || !dependency || owner === dependency) return
      const names = dependencies.get(owner) ?? new Set<string>()
      names.add(path.node.name)
      dependencies.set(owner, names)
    },
  })
  const imports = statements
    .filter((node) => node.type === 'ImportDeclaration')
    .map((node) => code.slice(node.start!, node.end!))
    .join('\n')
  const exportLine = (local: string, exported: string, fromFile: string) =>
    'export { ' +
    local +
    (local === exported ? '' : ' as ' + exported) +
    ' } from "./' +
    fromFile +
    '.mjs";\n'
  const localByExport = new Map<string, string>()
  for (const [local, exported] of exports) localByExport.set(exported, local)

  const splitGroups = new Set<string>()
  if (!selected) {
    for (const group of groups.keys()) splitGroups.add(group)
  } else {
    const queue: string[] = []
    for (const special of ['_calls', '_protocols']) {
      if (groups.has(special)) {
        splitGroups.add(special)
        queue.push(special)
      }
    }
    for (const symbol of selected) {
      const local = localByExport.get(symbol) ?? symbol
      const rootGroup = bindings.get(local)
      if (!rootGroup) throw new Error('unknown SDK binding: ' + symbol)
      if (!splitGroups.has(rootGroup)) {
        splitGroups.add(rootGroup)
        queue.push(rootGroup)
      }
    }
    for (let i = 0; i < queue.length; i++) {
      for (const depName of dependencies.get(queue[i]!) ?? []) {
        const depGroup = bindings.get(depName)
        if (depGroup && !splitGroups.has(depGroup)) {
          splitGroups.add(depGroup)
          queue.push(depGroup)
        }
      }
    }
  }

  const modules = new Map<string, string>()
  for (const group of splitGroups) {
    const nodes = groups.get(group)!
    let source = imports + '\n'
    if (group !== '_protocols' && groups.has('_protocols'))
      source += 'import "./_protocols.mjs";\n'
    for (const name of dependencies.get(group) ?? [])
      source += 'import { ' + name + ' } from "./' + bindings.get(name) + '.mjs";\n'
    source += nodes.map((node) => code.slice(node.start!, node.end!)).join('\n') + '\n'
    const names = [...bindings]
      .filter(([, owner]) => owner === group)
      .map(([name]) => name)
    if (names.length) source += 'export { ' + names.join(', ') + ' };\n'
    modules.set(group, source)
  }

  const barrelNodes = statements.filter((node) => {
    const owner = owners.get(node)
    return owner !== undefined && !splitGroups.has(owner)
  })
  if (barrelNodes.length > 0) {
    const barrelDeps = new Set<string>()
    for (const [group] of groups) {
      if (splitGroups.has(group)) continue
      for (const depName of dependencies.get(group) ?? []) {
        const depGroup = bindings.get(depName)
        if (depGroup && splitGroups.has(depGroup)) barrelDeps.add(depName)
      }
    }
    let rest = imports + '\n'
    if (groups.has('_protocols')) rest += 'import "./_protocols.mjs";\n'
    for (const name of barrelDeps)
      rest += 'import { ' + name + ' } from "./' + bindings.get(name) + '.mjs";\n'
    rest += barrelNodes.map((node) => code.slice(node.start!, node.end!)).join('\n') + '\n'
    const restNames = [...bindings]
      .filter(([, owner]) => !splitGroups.has(owner))
      .map(([name]) => name)
    if (restNames.length) rest += 'export { ' + restNames.join(', ') + ' };\n'
    modules.set('_barrel', rest)
  }

  let barrel = groups.has('_protocols') ? 'import "./_protocols.mjs";\n' : ''
  if (modules.has('_barrel')) barrel += 'import "./_barrel.mjs";\n'
  for (const [local, exported] of exports) {
    const owner = bindings.get(local)!
    barrel += exportLine(local, exported, splitGroups.has(owner) ? owner : '_barrel')
  }
  if (!selected) {
    for (const [local, exported] of exports) {
      const group = bindings.get(local)
      if (group && group !== exported && !modules.has(exported))
        modules.set(exported, exportLine(local, exported, group))
    }
  } else {
    for (const symbol of selected) {
      if (modules.has(symbol)) continue
      const local = localByExport.get(symbol) ?? symbol
      const group = bindings.get(local)!
      modules.set(symbol, exportLine(local, symbol, group))
    }
  }
  modules.set('index', barrel)
  return modules
}
