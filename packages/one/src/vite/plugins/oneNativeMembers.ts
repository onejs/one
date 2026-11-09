import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'

type Node = { type: string; [key: string]: any }
type Binding = { source: string; imported: string }

export function nativeOneMembers(file: string) {
  const imports = new Map<string, Binding>()
  const values = new Map<string, Node>()
  const program = parseSync(file, readFileSync(file, 'utf8')).program as Node
  for (const statement of program.body) {
    const node =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (node?.type === 'ImportDeclaration') {
      for (const item of node.specifiers) {
        imports.set(item.local.name, {
          source: node.source.value.startsWith('.')
            ? resolve(dirname(file), node.source.value)
            : node.source.value,
          imported:
            item.type === 'ImportSpecifier'
              ? String(item.imported.name ?? item.imported.value)
              : item.type === 'ImportDefaultSpecifier'
                ? 'default'
                : '*',
        })
      }
    } else if (node?.type === 'VariableDeclaration') {
      for (const declaration of node.declarations)
        if (declaration.id.type === 'Identifier' && declaration.init)
          values.set(declaration.id.name, declaration.init)
    }
  }
  const member = (
    expression: Node,
    path: string[],
    consumed = 0
  ): { binding: Binding; consumed: number; call?: boolean } | undefined => {
    if (expression.type === 'Identifier') {
      const binding = imports.get(expression.name)
      if (binding) return { binding, consumed }
      const value = values.get(expression.name)
      return value ? member(value, path, consumed) : undefined
    }
    if (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'MemberExpression' &&
      expression.callee.object.name === 'Object' &&
      expression.callee.property.name === 'freeze'
    )
      return member(expression.arguments[0], path, consumed)
    if (expression.type !== 'ObjectExpression' || !path.length) return
    for (const property of expression.properties.toReversed()) {
      if (
        property.type === 'Property' &&
        !property.computed &&
        (property.key.name ?? property.key.value) === path[0]
      ) {
        if (property.kind === 'init')
          return member(property.value, path.slice(1), consumed + 1)
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
          const binding = imports.get(returned.callee.name)
          if (binding) return { binding, consumed: consumed + 1, call: true }
        }
        return
      }
      if (property.type === 'SpreadElement') {
        const found = member(property.argument, path, consumed)
        if (found) return found
      }
    }
  }
  return (source: string, id: string) => {
    const parsed = parseSync(id, source, {
      lang: /\.tsx$/.test(id) ? 'tsx' : /\.[cm]?ts$/.test(id) ? 'ts' : 'jsx',
    })
    if (parsed.errors.length) return
    const app = parsed.program as Node
    const roots = new Map<string, string[]>()
    for (const node of app.body) {
      if (node.type !== 'ImportDeclaration' || node.source.value !== 'one') continue
      for (const item of node.specifiers) {
        if (
          item.type === 'ImportSpecifier' &&
          (item.imported.name ?? item.imported.value) === 'One'
        )
          roots.set(item.local.name, [])
        else if (item.type === 'ImportNamespaceSpecifier')
          roots.set(item.local.name, ['One'])
      }
    }
    if (!roots.size) return
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
      if (node.type === 'VariableDeclarator') pattern(node.id)
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
    shadows(app)
    const output = new MagicString(source)
    const added = new Map<Binding, string>()
    const visit = (node: Node) => {
      if (node.type === 'ImportDeclaration' || node.type.startsWith('TS')) return
      if (node.type === 'AssignmentExpression') {
        visit(node.right)
        return
      }
      if (
        node.type === 'UpdateExpression' ||
        (node.type === 'UnaryExpression' && node.operator === 'delete')
      )
        return
      if (node.type === 'MemberExpression' || node.type === 'JSXMemberExpression') {
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
        const prefix = roots.get(root.name)
        if (prefix && prefix.every((name, index) => path[index] === name)) {
          const found = member(values.get('One')!, path.slice(prefix.length))
          if (
            found &&
            found.consumed &&
            !(found.call && node.type === 'JSXMemberExpression')
          ) {
            let alias = added.get(found.binding)
            if (!alias) {
              alias = `__one_member_${added.size}`
              while (new RegExp(`\\b${alias}\\b`).test(source)) alias += '_'
              added.set(found.binding, alias)
            }
            output.overwrite(
              root.start,
              nodes[prefix.length + found.consumed - 1].end,
              found.call ? `(${alias}())` : alias
            )
            return
          }
        }
      }
      children(node, visit)
    }
    visit(app)
    if (!added.size) return
    const lastImport = app.body
      .filter((node: Node) => node.type === 'ImportDeclaration')
      .at(-1)
    output.appendLeft(
      lastImport.end,
      '\n' +
        [...added]
          .map(
            ([binding, alias]) =>
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
