// which names of the One api a module reads, for the ios link set. the production
// bundle's modules are parsed and every read of the `One` namespace, of `One.iOS`
// and of a `one` entry point's exports is recorded. the apps this serves use no eval
// and build no names at runtime, so a name that is read statically is the whole story
// and a computed read keeps every group.
import { parseSync } from 'oxc-parser'

export type LinkSetCatalog = {
  groups: Record<
    string,
    {
      components: string[]
      hybrids: string[]
      uses?: string[]
      modifiers?: string[]
      slots?: string[]
      values?: string[]
    }
  >
}

export type LinkSetUsage = {
  // names read off the `One` namespace, `One.iOS` or an entry point's exports
  names: Set<string>
  // modifier, slot and value keys written as a string or a property name
  keys: Set<string>
  // the namespace was used in a way the analysis cannot follow
  all: boolean
}

export const emptyUsage = (): LinkSetUsage => ({ names: new Set(), keys: new Set(), all: false })

// what a binding holds: the exports of a `one` entry point, the One object or One.iOS
type Held = 'module' | 'one' | 'ios'

type Node = { type: string; [key: string]: any }

const oneSource = /^one(?:\/.*)?$/

// ts nodes that hold values; every other ts node is a type and is not read
const valueTs = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'TSInstantiationExpression',
  'TSParameterProperty',
  'TSEnumDeclaration',
  'TSEnumBody',
  'TSEnumMember',
  'TSModuleDeclaration',
  'TSModuleBlock',
  'TSExportAssignment',
  'TSImportEqualsDeclaration',
])

// the property names a group's features are reached by, and the keys that name them
export function catalogNames(catalog: LinkSetCatalog) {
  const names = new Map<string, string[]>()
  const keys = new Map<string, string[]>()
  const add = (map: Map<string, string[]>, name: string, group: string) =>
    map.set(name, [...(map.get(name) ?? []), group])
  for (const [group, entry] of Object.entries(catalog.groups)) {
    for (const component of entry.components) add(names, component.replace(/^OneNative/, ''), group)
    for (const use of entry.uses ?? []) add(names, use, group)
    for (const key of [
      ...(entry.modifiers ?? []),
      ...(entry.slots ?? []),
      ...(entry.values ?? []),
      ...entry.hybrids,
      ...entry.components,
    ])
      add(keys, key, group)
  }
  return { names, keys }
}

// a module that names neither a `one` entry point nor a group key cannot use a group
export function mightUseGroups(code: string, keys: Iterable<string>, pattern = keyPattern(keys)) {
  return /['"]one(?:\/[^'"]*)?['"]/.test(code) || pattern.test(code)
}

export function keyPattern(keys: Iterable<string>) {
  const list = [...keys]
  return list.length ? new RegExp(`(?<![\\w$])(?:${list.join('|')})(?![\\w$])`) : /(?!)/
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'
}

// reads one module into the usage. a module that does not parse counts every group
// when it names a `one` entry point, and otherwise only its textual keys.
export function analyzeModule(
  code: string,
  filename: string,
  keys: ReadonlySet<string>,
  usage: LinkSetUsage
) {
  const lang = /\.tsx$/.test(filename) ? 'tsx' : /\.[cm]?ts$/.test(filename) ? 'ts' : 'jsx'
  let program: Node
  try {
    const parsed = parseSync(filename, code, { lang, sourceType: 'unambiguous' })
    if (parsed.errors.length) throw new Error(parsed.errors[0].message)
    program = parsed.program as Node
  } catch {
    if (/['"]one(?:\/[^'"]*)?['"]/.test(code)) usage.all = true
    for (const key of keys) if (new RegExp(`(?<![\\w$])${key}(?![\\w$])`).test(code)) usage.keys.add(key)
    return
  }

  const bindings = new Map<string, Held>()

  const unwrap = (node: Node): Node => {
    let current = node
    while (
      current.type === 'ParenthesizedExpression' ||
      current.type === 'ChainExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TSTypeAssertion'
    )
      current = current.expression
    return current
  }

  const staticName = (node: Node): string | undefined => {
    if (node.computed) {
      if (node.property.type === 'Literal' && typeof node.property.value === 'string') return node.property.value
      if (node.property.type === 'TemplateLiteral' && !node.property.expressions.length)
        return node.property.quasis[0].value.cooked
      return undefined
    }
    return node.property.name
  }

  // the move one read makes: One.iOS enters the iOS object, a read of the module's
  // `One` enters One, and any other name is a feature that is recorded elsewhere
  const step = (held: Held, name: string): Held | undefined =>
    held === 'module' && name === 'One' ? 'one' : held === 'one' && name === 'iOS' ? 'ios' : undefined

  const heldBy = (raw: Node): Held | undefined => {
    const node = unwrap(raw)
    switch (node.type) {
      case 'Identifier':
        return bindings.get(node.name)
      case 'MemberExpression': {
        const object = heldBy(node.object)
        const name = staticName(node)
        return object && name !== undefined ? step(object, name) : undefined
      }
      case 'AwaitExpression':
        return node.argument.type === 'ImportExpression' && importedOne(node.argument) ? 'module' : undefined
      case 'ImportExpression':
        return undefined
      case 'CallExpression': {
        const callee = unwrap(node.callee)
        return callee.type === 'Identifier' &&
          callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          oneSource.test(String(node.arguments[0].value))
          ? 'module'
          : undefined
      }
      default:
        return undefined
    }
  }

  const importedOne = (node: Node) =>
    node.source.type === 'Literal' && oneSource.test(String(node.source.value))

  // a destructuring pattern against something that holds a namespace
  const bindPattern = (pattern: Node, held: Held, record: boolean) => {
    switch (pattern.type) {
      case 'Identifier':
        bindings.set(pattern.name, held)
        return
      case 'AssignmentPattern':
        bindPattern(pattern.left, held, record)
        return
      case 'ObjectPattern':
        for (const property of pattern.properties) {
          if (property.type === 'RestElement') {
            bindPattern(property.argument, held, record)
            continue
          }
          let name: string | undefined
          if (!property.computed && property.key.type === 'Identifier') name = property.key.name
          else if (property.key.type === 'Literal') name = String(property.key.value)
          if (name === undefined) {
            if (record) usage.all = true
            continue
          }
          if (record) usage.names.add(name)
          const next = step(held, name)
          if (next) bindPattern(property.value, next, record)
        }
        return
      default:
        // an array pattern or anything else cannot take apart a namespace
        if (record) usage.all = true
    }
  }

  // aliases first, until none are left to find: a use can precede its declaration
  const sites: Node[] = []
  const collect = (node: Node) => {
    if (node.type === 'ImportDeclaration' && importedOne(node)) {
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') bindings.set(specifier.local.name, 'module')
        else if (specifier.type === 'ImportDefaultSpecifier') bindings.set(specifier.local.name, 'one')
        else {
          const imported = specifier.imported.name ?? String(specifier.imported.value)
          if (imported === 'One') bindings.set(specifier.local.name, 'one')
          else usage.names.add(imported)
        }
      }
    } else if (
      (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
      node.source &&
      importedOne(node)
    ) {
      if (node.type === 'ExportAllDeclaration') usage.all = true
      else for (const specifier of node.specifiers) usage.names.add(specifier.local.name ?? String(specifier.local.value))
    } else if (node.type === 'VariableDeclarator' && node.init) sites.push(node)
    else if (node.type === 'AssignmentExpression' && node.operator === '=') sites.push(node)
  }
  const visitAll = (node: Node, enter: (node: Node) => void) => {
    enter(node)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'typeAnnotation' || key === 'returnType' || key === 'typeParameters' || key === 'typeArguments')
        continue
      for (const child of Array.isArray(value) ? value : [value])
        if (isNode(child) && (!child.type.startsWith('TS') || valueTs.has(child.type))) visitAll(child, enter)
    }
  }
  visitAll(program, collect)
  for (let size = -1; size !== bindings.size; ) {
    size = bindings.size
    for (const site of sites) {
      const target = site.type === 'VariableDeclarator' ? site.id : site.left
      const source = site.type === 'VariableDeclarator' ? site.init : site.right
      const held = heldBy(source)
      if (!held) continue
      if (target.type === 'Identifier') bindings.set(target.name, held)
      else bindPattern(target, held, false)
    }
  }

  // what stands between a namespace and the code that holds it
  const safeParent = (node: Node, parent: Node | undefined, key: string) =>
    !parent ||
    parent.type === 'ParenthesizedExpression' ||
    parent.type === 'ChainExpression' ||
    parent.type === 'TSAsExpression' ||
    parent.type === 'TSSatisfiesExpression' ||
    parent.type === 'TSNonNullExpression' ||
    parent.type === 'TSTypeAssertion' ||
    parent.type === 'AwaitExpression' ||
    (parent.type === 'MemberExpression' && key === 'object') ||
    (parent.type === 'VariableDeclarator' && key === 'init') ||
    (parent.type === 'AssignmentExpression' && key === 'right' && parent.operator === '=' && unwrap(parent.left).type === 'Identifier') ||
    (parent.type === 'ExpressionStatement' && key === 'expression')

  const visit = (node: Node, parent: Node | undefined, key: string) => {
    if (node.type.startsWith('TS') && !valueTs.has(node.type)) return
    switch (node.type) {
      case 'ImportDeclaration':
        return
      case 'ExportNamedDeclaration':
        if (node.source) return
        break
      case 'ExportSpecifier':
        // `export { One }` hands the namespace to whoever imports this module
        if (bindings.has(node.local.name)) usage.all = true
        return
      case 'ExportAllDeclaration':
        return
      case 'VariableDeclarator': {
        const held = node.init ? heldBy(node.init) : undefined
        if (held && node.id.type !== 'Identifier') bindPattern(node.id, held, true)
        else visitPattern(node.id)
        if (node.init) visit(node.init, node, 'init')
        return
      }
      case 'AssignmentExpression': {
        const held = heldBy(node.right)
        if (held && node.operator === '=' && node.left.type !== 'Identifier' && node.left.type !== 'MemberExpression')
          bindPattern(node.left, held, true)
        else visitPattern(node.left)
        visit(node.right, node, 'right')
        return
      }
      case 'MemberExpression': {
        const object = heldBy(node.object)
        const name = staticName(node)
        if (object) {
          if (name === undefined) usage.all = true
          else usage.names.add(name)
        }
        if (!node.computed) {
          visit(node.object, node, 'object')
          return
        }
        break
      }
      case 'JSXOpeningElement': {
        let name = node.name
        const path: string[] = []
        while (name.type === 'JSXMemberExpression') {
          path.unshift(name.property.name)
          name = name.object
        }
        let held = name.type === 'JSXIdentifier' ? bindings.get(name.name) : undefined
        for (const part of path) {
          if (!held) break
          usage.names.add(part)
          held = step(held, part)
        }
        for (const attribute of node.attributes) visit(attribute, node, 'attributes')
        return
      }
      case 'JSXAttribute':
        if (node.name.type === 'JSXIdentifier' && keys.has(node.name.name)) usage.keys.add(node.name.name)
        if (node.value) visit(node.value, node, 'value')
        return
      case 'JSXMemberExpression':
      case 'JSXIdentifier':
      case 'JSXNamespacedName':
        return
      case 'Property':
      case 'PropertyDefinition':
      case 'MethodDefinition':
      case 'TSAbstractPropertyDefinition': {
        if (!node.computed) {
          const name = node.key.type === 'Identifier' ? node.key.name : node.key.type === 'Literal' ? String(node.key.value) : undefined
          if (name !== undefined && keys.has(name)) usage.keys.add(name)
        } else visit(node.key, node, 'key')
        if (node.value) visit(node.value, node, 'value')
        return
      }
      case 'Literal':
        if (typeof node.value === 'string' && keys.has(node.value)) usage.keys.add(node.value)
        break
      case 'TemplateLiteral':
        if (!node.expressions.length && keys.has(node.quasis[0].value.cooked)) usage.keys.add(node.quasis[0].value.cooked)
        break
      case 'Identifier':
        // a use that is neither a read nor an alias hands the namespace elsewhere
        if (bindings.has(node.name) && !safeParent(node, parent, key)) usage.all = true
        return
      case 'ImportExpression':
        if (importedOne(node) && !(parent?.type === 'AwaitExpression')) usage.all = true
        break
      case 'CallExpression':
        if (heldBy(node) && !safeParent(node, parent, key)) usage.all = true
        break
    }
    if (node.type === 'MemberExpression' && !node.computed) return
    for (const [childKey, value] of Object.entries(node)) {
      if (childKey === 'typeAnnotation' || childKey === 'returnType' || childKey === 'typeParameters' || childKey === 'typeArguments')
        continue
      for (const child of Array.isArray(value) ? value : [value])
        if (isNode(child)) visit(child, node, childKey)
    }
  }

  // binding positions hold no reads, but a default value or a computed key can
  function visitPattern(pattern: Node) {
    switch (pattern.type) {
      case 'AssignmentPattern':
        visitPattern(pattern.left)
        visit(pattern.right, pattern, 'right')
        return
      case 'ObjectPattern':
        for (const property of pattern.properties) {
          if (property.type === 'RestElement') visitPattern(property.argument)
          else {
            if (property.computed) visit(property.key, property, 'key')
            else if (property.key.type === 'Identifier' && keys.has(property.key.name)) usage.keys.add(property.key.name)
            visitPattern(property.value)
          }
        }
        return
      case 'ArrayPattern':
        for (const element of pattern.elements) if (element) visitPattern(element)
        return
      case 'RestElement':
        visitPattern(pattern.argument)
        return
      case 'MemberExpression':
        visit(pattern, undefined, '')
        return
    }
  }

  visit(program, undefined, '')
}

// the groups whose features a usage reaches
export function groupsForUsage(usage: LinkSetUsage, catalog: LinkSetCatalog): string[] {
  if (usage.all) return Object.keys(catalog.groups)
  const { names, keys } = catalogNames(catalog)
  const reached = new Set<string>()
  for (const name of usage.names) for (const group of names.get(name) ?? []) reached.add(group)
  for (const key of usage.keys) for (const group of keys.get(key) ?? []) reached.add(group)
  return Object.keys(catalog.groups).filter((group) => reached.has(group))
}
