import { ios, present, type Declaration } from './inventory'
import type { StyleField } from './catalog'
import type { Control } from './controlTypes'

export type DerivedModifier = {
  name: string
  kind: 'boolean' | 'number' | 'string'
  ios: number
  type: string
  cases?: readonly { name: string; ios: number }[]
}

// a one-argument View method with a bridge scalar or a static-case value has
// enough information in the SDK to generate its prop and its Swift call.
export function deriveModifiers(
  inventory: readonly Declaration[],
  ceiling: number,
  reserved: readonly StyleField[]
): DerivedModifier[] {
  const reservedNames = new Set(reserved.map((field) => field.name))
  const methods = inventory.filter(
    (d) =>
      d.kind === 'func' &&
      (d.module === 'SwiftUI' || d.module === 'SwiftUICore') &&
      d.owner.split('.').at(-1) === 'View' &&
      /^[a-z]/.test(d.name) &&
      !d.name.startsWith('accessibility') &&
      d.parameters.length === 1 &&
      d.parameters[0].label === '_' &&
      !d.requirements?.length &&
      present(d) &&
      ios(d) <= ceiling &&
      !reservedNames.has(d.name)
  )
  const byName = new Map<string, Declaration[]>()
  for (const method of methods)
    byName.set(method.name, [...(byName.get(method.name) ?? []), method])
  const result: DerivedModifier[] = []
  for (const [name, overloads] of byName) {
    const candidates = overloads.flatMap((method): DerivedModifier[] => {
      const type = method.parameters[0].type
      const kind =
        type === 'Swift.Bool'
          ? 'boolean'
          : ['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat'].includes(type)
            ? 'number'
            : type === 'Swift.String'
              ? 'string'
              : undefined
      if (kind) return [{ name, kind, type, ios: ios(method) }]
      if (!/^(SwiftUI|SwiftUICore)\.[A-Za-z][\w.]*$/.test(type)) return []
      const [module, ...owner] = type.split('.')
      const cases = inventory
        .filter(
          (d) =>
            d.module === module &&
            (d.owner === owner.join('.') || d.owner === type) &&
            d.kind === 'static' &&
            (d.type?.replace('?', '') === owner.join('.') ||
              d.type?.replace('?', '') === type) &&
            /^[a-z]/.test(d.name) &&
            present(d) &&
            ios(d) <= ceiling
        )
        .map((d) => ({ name: d.name, ios: ios(d) }))
      if (!cases.length || new Set(cases.map((item) => item.name)).size !== cases.length)
        return []
      return [{ name, kind: 'string', type, ios: ios(method), cases }]
    })
    // overloads with the same public name need a semantic choice. neither their
    // order in the SDK nor a guessed preferred type is a sound contract.
    if (candidates.length === 1) result.push(candidates[0])
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

// parameterless public View structs have no binding, closure, conversion, or
// child-slot contract to invent. the existing leaf emitter supplies their host.
export function deriveViews(
  inventory: readonly Declaration[],
  floor: number,
  existingNames: ReadonlySet<string>
): Control[] {
  return inventory
    .filter(
      (d) =>
        d.kind === 'struct' &&
        d.owner === '' &&
        !d.generic &&
        /^[A-Z]/.test(d.name) &&
        !d.name.startsWith('Default') &&
        d.inheritedTypes?.some((type) => type === 'SwiftUICore.View' || type === 'SwiftUI.View') &&
        present(d) &&
        ios(d) <= floor &&
        !existingNames.has(d.name)
    )
    .flatMap((view): Control[] => {
      const constructors = inventory.filter(
        (d) =>
          d.kind === 'init' &&
          d.module === view.module &&
          d.owner === view.name &&
          d.parameters.length === 0 &&
          present(d) &&
          ios(d) <= floor
      )
      if (constructors.length !== 1) return []
      return [
        {
          name: view.name,
          fields: {},
          constructors: [{ type: view.name, parameters: [] }],
          swift: `${view.name}()`,
          validate: '',
        },
      ]
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
