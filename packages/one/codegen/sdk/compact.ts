// lower generated facades to tables without changing their declarations or ids.
import { parse } from '@babel/parser'
import type { ClassMethod, ObjectMethod, ObjectExpression } from '@babel/types'

type BackgroundMethod = { id: number; args?: (number | null)[]; hints?: unknown[] }

export function compactFacade(source: string): string {
  const file = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const edits: { start: number; end: number; text: string }[] = []
  let changed = false
  const modules = new Map<string, string>()
  const registrations = new Map<
    string,
    {
      node: ObjectExpression
      properties: Record<string, number>
      methods: Record<string, BackgroundMethod>
    }
  >()
  for (const statement of file.program.body) {
    if (
      statement.type !== 'ExpressionStatement' ||
      statement.expression.type !== 'CallExpression'
    )
      continue
    const call = statement.expression
    if (call.callee.type !== 'Identifier' || call.callee.name !== 'registerSDKClass')
      continue
    const [, name, table] = call.arguments
    if (name?.type !== 'Identifier' || table?.type !== 'ObjectExpression') continue
    const fields = new Map(
      table.properties.flatMap((p) =>
        p.type === 'ObjectProperty' && p.key.type === 'Identifier'
          ? [[p.key.name, p.value] as const]
          : []
      )
    )
    const properties = fields.get('properties'),
      methods = fields.get('methods')
    registrations.set(name.name, {
      node: table,
      properties: properties
        ? JSON.parse(source.slice(properties.start!, properties.end!))
        : {},
      methods: methods ? JSON.parse(source.slice(methods.start!, methods.end!)) : {},
    })
  }
  function lower(
    name: string,
    methods: (ClassMethod | ObjectMethod)[],
    end: number,
    value: boolean
  ) {
    const members: unknown[][] = []
    let module: string | undefined
    let compacted = 0
    const registration = value ? undefined : registrations.get(name)
    for (const member of methods) {
      if (
        member.computed ||
        member.key.type !== 'Identifier' ||
        member.body.body.length !== 1
      )
        continue
      const body = member.body.body[0]
      const expression =
        body.type === 'ReturnStatement'
          ? body.argument
          : body.type === 'ExpressionStatement'
            ? body.expression
            : undefined
      if (
        expression?.type !== 'CallExpression' ||
        expression.callee.type !== 'Identifier'
      )
        continue
      const call = expression.callee.name
      if (call !== 'callSDK' && call !== 'callSDKAsync') continue
      const [framework, id, receiver, args, hints, sync] = expression.arguments
      if (
        framework?.type !== 'StringLiteral' ||
        id?.type !== 'NumericLiteral' ||
        args?.type !== 'ArrayExpression'
      )
        continue
      const firstSelf =
        value && receiver?.type === 'Identifier' && receiver.name === '$self'
      const isStatic = member.type === 'ClassMethod' ? member.static : !firstSelf
      if (
        firstSelf
          ? member.params[0]?.type !== 'Identifier' || member.params[0].name !== '$self'
          : isStatic
            ? receiver?.type !== 'Identifier' || receiver.name !== 'undefined'
            : receiver?.type !== 'ThisExpression'
      )
        continue
      const params = firstSelf ? member.params.slice(1) : member.params
      // out-pointer slots and unusual signatures retain their generated bodies.
      if (
        member.params.length > 8 ||
        args.elements.length !== params.length ||
        params.some(
          (p, i) =>
            p.type !== 'Identifier' ||
            args.elements[i]?.type !== 'Identifier' ||
            args.elements[i]?.name !== p.name
        )
      ) {
        const background = registration?.methods[member.key.name]
        members.push(
          background
            ? [
                member.key.name,
                background.id,
                Number(isStatic) | 32 | 256,
                0,
                background.hints ?? null,
                background.args ?? null,
              ]
            : [member.key.name, 0, Number(isStatic) | 32, 0]
        )
        continue
      }
      if (module && module !== framework.value) throw new Error('mixed framework class')
      module = framework.value
      const flags =
        Number(isStatic) |
        (member.kind === 'get' ? 2 : member.kind === 'set' ? 4 : 0) |
        (call === 'callSDKAsync' ? 8 : 0) |
        (sync?.type === 'BooleanLiteral' && sync.value && call === 'callSDK' ? 16 : 0) |
        (firstSelf ? 64 : 0) |
        (registration?.properties[member.key.name] === id.value ? 128 : 0) |
        (registration?.methods[member.key.name]?.id === id.value ? 256 : 0)
      const row: unknown[] = [member.key.name, id.value, flags, member.params.length]
      if (hints) row.push(JSON.parse(source.slice(hints.start!, hints.end!)))
      else if (member.params.length === 0) {
        row.pop()
        if (flags === 0) row.pop()
      }
      members.push(row)
      compacted++
      edits.push({
        start: member.start!,
        end: member.end! + Number(value && source[member.end!] === ','),
        text: '',
      })
    }
    if (compacted) {
      changed = true
      if (!modules.has(module!)) modules.set(module!, `$SDKmodule${modules.size}`)
      const table = `$SDKtable_${name}`
      edits.push({
        start: end,
        end,
        text: `\n${registration ? `const ${table} = ` : ''}defineSDKMembers(${name}, ${JSON.stringify(module)}, ${JSON.stringify(members)}${value ? ', true' : ''});`,
      })
      if (registration)
        edits.push({
          start: registration.node.start!,
          end: registration.node.end!,
          text: table,
        })
    }
  }
  for (const statement of file.program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type === 'ClassDeclaration' && declaration.id)
      lower(
        declaration.id.name,
        declaration.body.body.filter(
          (member): member is ClassMethod => member.type === 'ClassMethod'
        ),
        statement.end!,
        false
      )
    else if (declaration?.type === 'VariableDeclaration') {
      for (const variable of declaration.declarations) {
        if (
          variable.id.type === 'Identifier' &&
          variable.init?.type === 'ObjectExpression'
        )
          lower(
            variable.id.name,
            variable.init.properties.filter(
              (member): member is ObjectMethod => member.type === 'ObjectMethod'
            ),
            statement.end!,
            true
          )
      }
    }
  }
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  if (!changed) return source
  for (const [module, name] of modules)
    source = source.split(JSON.stringify(module)).join(name)
  const constants = [...modules]
    .map(([module, name]) => `const ${name} = ${JSON.stringify(module)};`)
    .join('\n')
  return `import { defineSDKMembers } from 'one/ios-runtime';\n${constants}\n${source}`
}
