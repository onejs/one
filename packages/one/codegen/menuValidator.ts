import { enumTypes, fields, nodes } from './catalog'

const enumTypeSet = new Set<string>(enumTypes)
const fieldEntries = Object.entries(fields) as [
  keyof typeof fields,
  (typeof fields)[keyof typeof fields],
][]

const ident = (name: string) =>
  name === 'disabled' || name === 'hidden' ? `${name}Value` : name

function emitField(name: string, required: boolean): string {
  const field = fields[name as keyof typeof fields]
  const value = ident(name)
  const lines = [
    `          const ${value} = input.${name} ?? ${JSON.stringify(field.default)}`,
  ]
  if (required) {
    lines.push(
      `          if (input.${name} == null) throw new Error('Swift.Menu ' + item.type + ' requires ${name}')`
    )
  }
  if (field.type === 'boolean[]') {
    lines.push(
      `          if (!Array.isArray(${value}) || !${value}.length || ${value}.some(v => typeof v !== 'boolean')) throw new Error('Swift.Menu toggle values must be a nonempty boolean array')`
    )
  } else if (enumTypeSet.has(field.type)) {
    lines.push(
      `          if (typeof ${value} !== 'string') throw new Error('Invalid Swift.Menu ${name}')`
    )
    lines.push(
      field.default === ''
        ? `          if (${value} !== '') assertSwiftUIValue('${field.type}', ${value}, iosVersion)`
        : `          assertSwiftUIValue('${field.type}', ${value}, iosVersion)`
    )
  } else {
    lines.push(
      `          if (typeof ${value} !== '${field.type}') throw new Error('Invalid Swift.Menu ${name}')`
    )
  }
  return lines.join('\n')
}

function emitKind(node: (typeof nodes)[number]): string {
  const required = new Set<string>(node.required)
  const onNode = new Set<string>(node.fields)
  const allowed = ['type', ...node.fields, ...(node.children ? ['children'] : [])]
    .map((name) => `name !== '${name}'`)
    .join(' && ')
  const inheritedDisabled = onNode.has('disabled')
    ? 'disabled || disabledValue'
    : 'disabled || false'
  const inheritedHidden = onNode.has('hidden')
    ? 'hidden || hiddenValue'
    : 'hidden || false'
  const payload = fieldEntries
    .map(([name, field]) => {
      if (name === 'disabled') return `            disabled: ${inheritedDisabled},`
      if (name === 'hidden') return `            hidden: ${inheritedHidden},`
      if (onNode.has(name))
        return `            ${ident(name) === name ? name : `${name}: ${ident(name)}`},`
      return `            ${name}: ${JSON.stringify(field.default)},`
    })
    .join('\n')
  const children = node.children
    ? `
          if (!Array.isArray(input.children)) throw new Error('Swift.Menu ' + item.type + ' requires children')
          append(input.children, item.id, Boolean(${inheritedDisabled}), Boolean(${inheritedHidden}))`
    : ''
  return `        case '${node.kind}': {
          for (const name of Object.keys(input)) {
            if (${allowed}) throw new Error('Unsupported Swift.Menu ' + item.type + ' property: ' + name)
          }
${node.fields.map((name) => emitField(name, required.has(name))).join('\n')}
          if (!item.id || ids.has(item.id)) throw new Error('Swift.Menu requires unique, nonempty item ids: "' + item.id + '"')
          ids.add(item.id)
          result.push({
${payload}
            parentId,
            type: item.type,
          })${children}
          break
        }`
}

export function emitMenuValidator(header: string, minimumIOS: number): string {
  return (
    header +
    `import type { NativeMenuItem } from './specs/OneNativeMenuNativeComponent'
import type { MenuItem } from './types'
import { assertSwiftUIValue } from './generated/swiftui'
export function flattenMenuItems(items: readonly MenuItem[], iosVersion = ${minimumIOS}): NativeMenuItem[] {
  const result: NativeMenuItem[] = []
  const ids = new Set<string>()
  const append = (items: readonly MenuItem[], parentId: string, disabled: boolean, hidden: boolean) => {
    for (const item of items) {
      const input = item as unknown as Record<string, unknown>
      switch (item.type) {
${nodes.map(emitKind).join('\n')}
        default:
          throw new Error('Unknown Swift.Menu item type: ' + input.type)
      }
    }
  }
  append(items, '', false, false)
  return result
}
`
  )
}
