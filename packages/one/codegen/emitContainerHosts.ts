// a container's native host is generated: its Fabric component view, its Swift view and
// the SwiftUI call that wraps React's children. the call comes from the SDK: the
// initializer whose labels the recipe names, each argument's conversion from the
// argument's SDK type, and the availability gate from the initializer's attributes. a
// recipe says only what a signature cannot: which prop fills which label, which view
// builder takes React's children, and how the host owns its layout.
import { bridgeValueOf } from './deriveSDK'
import { ios, present, type Declaration } from './inventory'
import { sdkGuard } from './sdkGuard'

export type HostRecipe = {
  // the public SDK view, as SwiftUI names it
  view: string
  // initializer label to the prop that fills it. a view builder label takes `Text(prop)`.
  arguments?: Record<string, string>
  // the view builder label that takes React's children
  children?: string
  // text builders whose initializer is chosen without them while their prop is empty
  omitWhenEmpty?: readonly string[]
  // a view builder label that shows a title with an optional SF Symbol, from two props
  labels?: Record<string, { title: string; systemImage: string }>
  // an argument whose SDK type has no value bridge, as a Swift expression; `@prop` is the
  // prop's model value
  values?: Record<string, string>
  // the prop shown as text while React passes no children
  childrenFallback?: string
  // a prop's model value before React's first props, as a Swift literal, where the SDK
  // gives the prop no default its conversion accepts
  initial?: Record<string, string>
  // values a prop takes beyond the SDK's case names, as Swift expressions
  aliases?: Record<string, Record<string, string>>
  // applied to the children inside the view builder
  childModifier?: string
  // a stack the children share inside the view builder, where the SDK view would lay
  // each child out on its own
  childStack?: string
  // modifiers SwiftUI applies to the call before the container's style; `$label` is
  // that argument's converted value and `@prop` the prop's model value
  modifiers?: readonly string[]
  // leaf: no children; container: lays out in its parent's box; measured: reports the
  // height SwiftUI measured to Yoga while standalone
  layout: 'leaf' | 'container' | 'measured'
  // measured only while the height is not set from React
  boundedHeight?: boolean
  // measured only while this Swift condition holds; `@prop` is the prop's model value
  measuredWhen?: string
  // an initializer label that takes a Binding React controls: the value comes from
  // `prop` with the acknowledgedEvent and revision props, and a change the user makes
  // reaches React through `event`
  binding?: { label: string; prop: string; event: string }
  // an initializer label that takes a Binding<Set<String>> of row tags. React sends
  // `prop` as a JSON array and says through `controlled` whether it owns it; the user's
  // selection reaches React through `event` as a JSON array
  selection?: { label: string; prop: string; controlled: string; event: string }
  // where several SDK initializers take the recipe's labels, the one whose parameter
  // type for a label contains this text
  types?: Record<string, string>
  // takes the environment props (color scheme, type size, control size, locale, tint,
  // enabled) and applies them around the view
  environment?: boolean
  // standalone, follow the color scheme of the window it sits in
  scheme?: boolean
  // with no swiftStyle, apply nothing, so a transparent group adds no layer
  skipEmptyStyle?: boolean
  // Swift for isRowModifier(name): the modifiers SwiftUI reads from the row itself
  rowModifiers?: string
  // the value SwiftUI hands the children builder. `values` reads members of it into
  // `event`: an event field prefix to a member, such as `frame(in: .global)`, each
  // flattened by its SDK type. `commands` calls its methods from React: a spec command
  // to the method it runs, queued until the content first appears
  context?: { event?: string; values?: Record<string, string>; commands?: Record<string, string> }
  // an initializer label whose generic type the SDK builds with static members of the
  // protocol it conforms to: `prop` names the member, and `arguments` fills the members'
  // labels from props
  builder?: { label: string; prop: string; members: readonly string[]; arguments: Record<string, string> }
}

type HostComponent = {
  name: string
  publicName: string | null
  props: Record<string, string>
  events?: Record<string, Record<string, string>>
  commands?: Record<string, Record<string, string>>
  host?: HostRecipe
}

type Argument = {
  label: string
  prop: string
  // the expression SwiftUI receives, or the view builder body
  swift: string
  closure: boolean
  // the name a closure gives the value SwiftUI hands it
  parameter?: string
  // a generated conversion function
  convert?: string
  // a URL the call unwraps first, from this string
  url?: string
}

// every line after the first, which the caller places
const indent = (text: string, by: number) =>
  text
    .replaceAll('\n', `\n${' '.repeat(by)}`)
    .replace(/\n +\n/g, '\n\n')
    .replace(/\n +(#)/g, '\n$1')
const upper = (name: string) => name[0].toUpperCase() + name.slice(1)
const swiftField = (type: string) =>
  type.startsWith('boolean') ? 'Bool' : type.startsWith('Double') ? 'Double' : 'String'
// the props OneNativeEnvironmentModel.configure takes, in its order
const ENVIRONMENT = ['colorScheme', 'dynamicTypeSize', 'controlSize', 'locale', 'tint', 'isEnabled']
const objcArgument = (prop: string, type: string) =>
  type.startsWith('string') ? `RCTNSStringFromString(next.${prop})` : `next.${prop}`
const NUMBERS = ['Swift.Double', 'Swift.Float', 'Swift.Int', 'CoreFoundation.CGFloat']
// core graphics lies outside the swiftui inventory, so its geometry is spelled here: a
// field to its path on the value
const GEOMETRY: Record<string, Record<string, string>> = {
  'CoreFoundation.CGRect': { x: 'origin.x', y: 'origin.y', width: 'size.width', height: 'size.height' },
  'CoreFoundation.CGSize': { width: 'width', height: 'height' },
  'CoreFoundation.CGPoint': { x: 'x', y: 'y' },
}
// a type as declarations name their owner: no generic arguments or module
const ownerKey = (type: string) => {
  let key = type.replace(/\?$/, '')
  while (/<[^<>]*>/.test(key)) key = key.replace(/<[^<>]*>/g, '')
  return key.replace(/^(SwiftUI|SwiftUICore|_\w+_SwiftUI)\./, '')
}
// the field a member's part arrives in: the prefix itself, or the prefix and the part
const fieldName = (prefix: string, part: string) => (prefix ? `${prefix}${upper(part)}` : part)
// where a built argument goes in a call, before each member fills it
const BUILT = '<built>'
const objcType = (type: string) =>
  type.startsWith('string') ? 'NSString *' : type.startsWith('boolean') ? 'BOOL' : 'double'

export function emitContainerHosts(
  header: string,
  outputs: Map<string, string>,
  inventory: readonly Declaration[],
  floor: number,
  ceiling: number,
  components: readonly HostComponent[]
) {
  const valueOf = bridgeValueOf(inventory, ceiling)
  const hosted = components.filter((component) => component.host)
  for (const component of hosted) {
    const recipe = component.host!
    const name = component.name
    const short = name.replace(/^OneNative/, '')
    const fail = (message: string): never => {
      throw new Error(`${name} host: ${message}`)
    }
    const args = recipe.arguments ?? {}
    const labelProps = Object.values(recipe.labels ?? {}).flatMap(
      ({ title, systemImage }) => [title, systemImage]
    )
    for (const prop of [
      ...Object.values(args),
      ...labelProps,
      ...(recipe.childrenFallback ? [recipe.childrenFallback] : []),
    ])
      if (!(prop in component.props)) fail(`prop ${prop} is not in the spec`)
    const model = (swift: string) =>
      swift.replace(/@(\w+)/g, (_, prop: string) => {
        if (!(prop in component.props)) fail(`@${prop} is not in the spec`)
        return `model.${prop}`
      })
    const eachChild = `ForEach(children.items) { child in child.content }${recipe.childModifier ? `\n  ${recipe.childModifier}` : ''}`
    const childrenBody = recipe.childStack
      ? `${recipe.childStack} {\n  ${indent(eachChild, 2)}\n}`
      : eachChild
    const contentBody = recipe.childrenFallback
      ? `if children.items.isEmpty {\n  Text(model.${recipe.childrenFallback})\n} else {\n  ${indent(childrenBody, 2)}\n}`
      : childrenBody
    const omitted = recipe.omitWhenEmpty ?? []
    const wanted = (without: readonly string[]) =>
      new Set([
        ...[
          ...Object.keys(args),
          ...Object.keys(recipe.values ?? {}),
          ...Object.keys(recipe.labels ?? {}),
        ].filter((label) => !without.includes(label)),
        ...(recipe.children ? [recipe.children] : []),
        ...(recipe.binding ? [recipe.binding.label] : []),
        ...(recipe.selection ? [recipe.selection.label] : []),
        ...(recipe.builder ? [recipe.builder.label] : []),
      ])

    // the SDK initializer with exactly these labels besides defaulted ones. its generic
    // parameters may be any View or pinned to a type Swift infers from the call; one that
    // asks for other content, such as table rows, is for another builder.
    const initializers = inventory.filter(
      (d) =>
        d.kind === 'init' &&
        (d.owner === recipe.view || d.owner.endsWith(`.${recipe.view}`)) &&
        /^(SwiftUI|SwiftUICore|_\w+_SwiftUI)$/.test(d.module) &&
        !d.failable &&
        present(d) &&
        ios(d) <= ceiling &&
        // `deprecated: 100000` marks an API Apple will deprecate; it compiles without warning
        !d.attributes.some((a) => /@available\((iOS|\*),.*deprecated(?!: 100000)/.test(a))
    )
    const initializerFor = (labels: Set<string>) => {
      let matches = initializers.filter(
        (d) =>
          d.parameters.every(
            (p) => labels.has(p.label) || p.defaultValue !== undefined
          ) &&
          [...labels].every((label) => d.parameters.some((p) => p.label === label)) &&
          (d.requirements ?? []).every(
            (r) => /^\w+ : (SwiftUI(Core)?\.View|Swift\.Hashable)$/.test(r) || /^\w+ == /.test(r)
          ) &&
          Object.entries(recipe.types ?? {}).every(([label, text]) =>
            d.parameters.some((p) => p.label === label && p.type.includes(text))
          )
      )
      if (matches.length === 0)
        fail(`no SDK initializer takes ${[...labels].join(', ') || 'no arguments'}`)
      // beside its replacement, an initializer Apple will deprecate is not a choice
      const current = matches.filter(
        (d) => !d.attributes.some((a) => /deprecated/.test(a))
      )
      if (current.length) matches = current
      const signatures = new Set(
        matches.map((d) => d.parameters.map((p) => `${p.label}:${p.type}`).join(','))
      )
      if (signatures.size > 1)
        fail(
          `several SDK initializers take ${[...labels].join(', ')}: ${[...signatures].join(' | ')}`
        )
      return matches[0]
    }

    const conversions: string[] = []
    const context = recipe.context
    const contextValues = Object.entries(context?.values ?? {})
    const contextCommands = Object.entries(context?.commands ?? {})
    // the SDK type of the value SwiftUI hands the children builder
    let contextType = ''
    const argumentFor = (parameter: Declaration['parameters'][number]): Argument => {
      const label = parameter.label
      if (label === recipe.children) {
        if (!context) return { label, prop: '', closure: true, swift: contentBody }
        const handed = /^(?:@escaping )?\((.+)\) -> \w+$/.exec(parameter.type)?.[1]
        if (!handed) fail(`${label}: ${parameter.type} hands its builder no value`)
        contextType = handed!
        // the builder reads the value as it runs, so reading adds no view to the layout
        const read = contextValues.length
          ? `let _ = model.read(${short}Context(context))\n${contentBody}`
          : contentBody
        return {
          label,
          prop: '',
          closure: true,
          parameter: 'context',
          swift: contextCommands.length ? `let _ = model.capture(context)\n${read}` : read,
        }
      }
      if (label === recipe.builder?.label) {
        return { label, prop: '', closure: false, swift: BUILT }
      }
      if (label === recipe.selection?.label) {
        return { label, prop: '', closure: false, swift: 'model.selectionBinding' }
      }
      if (label === recipe.binding?.label) {
        return {
          label,
          prop: '',
          closure: false,
          swift: 'Binding(get: { model.controlled.value }, set: { value in model.change(value) })',
        }
      }
      const shown = recipe.labels?.[label]
      if (shown) {
        const [title, image] = [`model.${shown.title}`, `model.${shown.systemImage}`]
        return {
          label,
          prop: '',
          closure: true,
          swift: `if !${title}.isEmpty, !${image}.isEmpty {\n  Label(${title}, systemImage: ${image})\n} else if !${image}.isEmpty {\n  Image(systemName: ${image})\n} else if !${title}.isEmpty {\n  Text(${title})\n}`,
        }
      }
      const explicit = recipe.values?.[label]
      if (explicit) {
        if (valueOf(parameter.type))
          fail(`the SDK bridges ${label}: ${parameter.type}; drop its value recipe`)
        return { label, prop: '', closure: false, swift: model(explicit) }
      }
      const prop = args[label]
      const type = component.props[prop]
      if (/^(@escaping )?\(\) -> \w+$/.test(parameter.type)) {
        if (!type.startsWith('string'))
          fail(`${label} is a view builder, so ${prop} must be a string`)
        return {
          label,
          prop,
          closure: true,
          swift: omitted.includes(label)
            ? `Text(model.${prop})`
            : `if !model.${prop}.isEmpty { Text(model.${prop}) }`,
        }
      }
      const value = valueOf(parameter.type)
      if (!value) fail(`${label}: ${parameter.type} has no SDK value bridge`)
      const field = `model.${prop}`
      if (value!.kind === 'enum') {
        if (!type.startsWith('string'))
          fail(`${prop} carries ${parameter.type}, so it must be a string`)
        const base = parameter.type.replace(/\?$/, '')
        const fn = `oneNative${short}${upper(prop)}`
        const aliases = recipe.aliases?.[prop] ?? {}
        const cases = [
          ...(value!.optional ? ['  case "": return nil'] : []),
          ...value!.cases!.map((item) =>
            item.ios > floor
              ? `  case ${JSON.stringify(item.name)}:${sdkGuard(item.ios, `    if #available(iOS ${item.ios}, *) { return ${base}.${item.name} }`, '')}\n    preconditionFailure("${name} ${prop} ${item.name} requires iOS ${item.ios}")`
              : `  case ${JSON.stringify(item.name)}: return ${base}.${item.name}`
          ),
          ...Object.entries(aliases).map(
            ([alias, swift]) => `  case ${JSON.stringify(alias)}: return ${swift}`
          ),
        ]
        conversions.push(`private func ${fn}(_ value: String) -> ${parameter.type} {
  switch value {
${cases.join('\n')}
  default: preconditionFailure("invalid ${name} ${prop}: \\(value)")
  }
}`)
        return { label, prop, closure: false, swift: `${fn}(${field})`, convert: fn }
      }
      if (value!.kind === 'number') {
        const base = parameter.type.replace(/\?$/, '')
        const numeric = (expression: string) =>
          base === 'Swift.Double'
            ? expression
            : `${base.split('.').at(-1)}(${expression})`
        if (type.startsWith('string')) {
          // a string carries an optional number without reserving a numeric value: "null" is nil
          if (!value!.optional)
            fail(`${prop} is a string but ${parameter.type} is not optional`)
          const fn = `oneNative${short}${upper(prop)}`
          conversions.push(`private func ${fn}(_ value: String) -> ${parameter.type} {
  if value == "null" { return nil }
  guard let number = Double(value), number.isFinite else { preconditionFailure("invalid ${name} ${prop}: \\(value)") }
  return ${numeric('number')}
}`)
          return { label, prop, closure: false, swift: `${fn}(${field})` }
        }
        if (!type.startsWith('Double'))
          fail(`${prop} carries ${parameter.type}, so it must be a number`)
        if (!value!.optional)
          return { label, prop, closure: false, swift: numeric(field) }
        // an optional number is nil while its has-prop is false, or while it is negative,
        // which is how React Native says the caller left it out
        const has = `has${upper(prop)}`
        return {
          label,
          prop,
          closure: false,
          swift:
            has in component.props
              ? `(model.${has} ? ${numeric(field)} : nil)`
              : `(${field} >= 0 ? ${numeric(field)} : nil)`,
        }
      }
      if (value!.kind === 'boolean') {
        if (!type.startsWith('boolean'))
          fail(`${prop} carries ${parameter.type}, so it must be a boolean`)
        return { label, prop, closure: false, swift: field }
      }
      if (value!.kind === 'url') {
        // a string Foundation rejects renders the children without the view
        if (value!.optional)
          return {
            label,
            prop,
            closure: false,
            swift: `(${field}.isEmpty ? nil : Foundation.URL(string: ${field}))`,
          }
        return { label, prop, closure: false, swift: label, url: field }
      }
      if (value!.kind === 'string') return { label, prop, closure: false, swift: field }
      return fail(
        `${label}: ${parameter.type} bridges as ${value!.kind}, which a host argument cannot take`
      )
    }

    // a call per member the built argument can be, chosen by the member's prop
    const builder = recipe.builder
    const builtCall = (initializer: Declaration, call: string) => {
      if (!builder) return call
      const parameter = initializer.parameters.find((p) => p.label === builder.label)!
      // the view's own generic constraint is recorded on its members, not its initializers
      const conformance = inventory
        .filter((d) => d === initializer || ownerKey(d.owner).startsWith(ownerKey(initializer.owner)))
        .flatMap((d) => d.requirements ?? [])
        .map((r) => new RegExp(`^${parameter.type} : (.+)$`).exec(r)?.[1])
        .find(Boolean)
      if (!conformance) fail(`${builder.label}: ${parameter.type} is not a generic the SDK builds`)
      const cases = builder.members.map((member) => {
        const found = inventory.filter(
          (d) =>
            ownerKey(d.owner) === ownerKey(conformance!) &&
            d.name === member &&
            (d.requirements ?? []).some((r) => r.startsWith('Self == ')) &&
            present(d) &&
            ios(d) <= floor
        )
        if (found.length !== 1) fail(`${conformance} has ${found.length} members named ${member}`)
        const [declaration] = found
        const element = (type: string) =>
          (declaration.requirements ?? [])
            .map((r) => new RegExp(`^${type}\\.Element == (.+)$`).exec(r)?.[1])
            .find(Boolean)
        const passed = declaration.parameters.flatMap((p) => {
          const prop = builder.arguments[p.label]
          if (prop === undefined) {
            if (p.defaultValue === undefined) fail(`${member} ${p.label} takes no prop`)
            return []
          }
          const kind = component.props[prop] ?? fail(`builder prop ${prop} is not in the spec`)
          let value: string
          if (p.type === 'Foundation.Date' && kind.startsWith('Double'))
            value = `Date(timeIntervalSince1970: model.${prop} / 1000)`
          else if ((NUMBERS.includes(p.type) || p.type === 'Foundation.TimeInterval') && kind.startsWith('Double'))
            value = p.type === 'Swift.Double' || p.type === 'Foundation.TimeInterval' ? `model.${prop}` : `${p.type.split('.').at(-1)}(model.${prop})`
          else if (p.type === 'Swift.Bool' && kind.startsWith('boolean')) value = `model.${prop}`
          else if (element(p.type) === 'Foundation.Date' && kind.startsWith('string')) {
            // dates arrive as a JSON array of ms since the epoch
            const fn = `oneNative${short}${upper(prop)}`
            if (!conversions.some((c) => c.includes(` ${fn}(`)))
              conversions.push(`private func ${fn}(_ value: String) -> [Date] {
  guard let times = try? JSONDecoder().decode([Double].self, from: Data(value.utf8)) else {
    preconditionFailure("invalid ${name} ${prop}: \\(value)")
  }
  return times.map { Date(timeIntervalSince1970: $0 / 1000) }
}`)
            value = `${fn}(model.${prop})`
          } else return fail(`${member} ${p.label}: ${p.type} cannot come from ${prop}: ${kind}`)
          return [p.label === '_' ? value : `${p.label}: ${value}`]
        })
        const built = declaration.kind === 'func' ? `.${member}(${passed.join(', ')})` : `.${member}`
        return `case ${JSON.stringify(member)}:\n  ${indent(call.replace(BUILT, built), 2)}`
      })
      // configure rejects any other member, so this default never shows
      return `Group {\n  switch model.${builder.prop} {\n  ${indent(cases.join('\n'), 2)}\n  default:\n    EmptyView()\n  }\n}`
    }
    const callFor = (without: readonly string[]) => {
      const initializer = initializerFor(wanted(without))
      const used = initializer.parameters.filter((p) => wanted(without).has(p.label))
      const values = used.map(argumentFor)
      const rendered = values.map((value) => {
        const swift = value.closure
          ? `{${value.parameter ? ` ${value.parameter} in` : ''}\n  ${indent(value.swift, 2)}\n}`
          : value.swift
        return value.label === '_' ? swift : `${value.label}: ${swift}`
      })
      const call = builtCall(initializer, `${recipe.view}(${rendered.join(', ')})`)
      const urls = values.filter((value) => value.url)
      return {
        initializer,
        values,
        call: urls.length
          ? `Group {\n  if ${urls.map((value) => `let ${value.label} = Foundation.URL(string: ${value.url})`).join(', ')} {\n    ${indent(call, 4)}\n  } else {\n    ${indent(recipe.children ? contentBody : 'EmptyView()', 4)}\n  }\n}`
          : call,
      }
    }
    // a text builder that is omitted while its prop is empty picks between two initializers
    const full = callFor([])
    const variants = omitted.length
      ? `Group {\n  if ${omitted.map((label) => `model.${args[label]}.isEmpty`).join(' && ')} {\n    ${indent(callFor(omitted).call, 4)}\n  } else {\n    ${indent(full.call, 4)}\n  }\n}`
      : full.call
    const version = Math.max(
      ...[full, ...(omitted.length ? [callFor(omitted)] : [])].map(({ initializer }) =>
        ios(initializer)
      )
    )
    const guarded = sdkGuard(
      version,
      `  if #available(iOS ${version}, *) {\n    ${indent(variants, 4)}\n  } else {\n    EmptyView()\n  }`,
      '  EmptyView()'
    )
    const gated =
      version > floor
        ? `Group {${guarded.startsWith('\n') ? guarded : `\n${guarded}\n`}}`
        : variants
    const converted = (label: string) => {
      const value = full.values.find((v) => v.label === label)
      if (!value || value.closure)
        fail(`modifier refers to $${label}, which is not a converted argument`)
      return value!.swift
    }
    const modifiers = (recipe.modifiers ?? []).map((modifier) =>
      model(modifier.replace(/\$(\w+)/g, (_, label: string) => converted(label)))
    )

    // the handed value's members, read from the SDK. a typealias reads as its type.
    const aliased = (type: string) =>
      inventory.find((d) => d.kind === 'typealias' && d.owner === '' && d.name === ownerKey(type))
        ?.type ?? type
    const membersOf = (type: string) =>
      inventory.filter(
        (d) => ownerKey(d.owner) === ownerKey(aliased(type)) && present(d) && ios(d) <= ceiling
      )
    // a member's value as flat fields: numbers and dates as Doubles, enums as their case
    // names, geometry and structs of stored numbers as one field per part
    const flatten = (
      type: string,
      expression: string,
      prefix: string
    ): { name: string; kind: 'Double' | 'String'; assign: string }[] => {
      if (NUMBERS.includes(type))
        return [{ name: prefix, kind: 'Double', assign: `${prefix} = Double(${expression})` }]
      if (type === 'Foundation.Date')
        return [
          { name: prefix, kind: 'Double', assign: `${prefix} = ${expression}.timeIntervalSince1970 * 1000` },
        ]
      const geometry = GEOMETRY[type]
      if (geometry)
        return Object.entries(geometry).map(([part, path]) => {
          const field = fieldName(prefix, part)
          return { name: field, kind: 'Double', assign: `${field} = Double(${expression}.${path})` }
        })
      const members = membersOf(type)
      const cases = members.filter((d) => d.enumCase)
      if (cases.length) {
        const declaration = inventory.find(
          (d) => d.kind === 'enum' && ownerKey(`${d.owner}.${d.name}`) === ownerKey(type)
        )
        const frozen = declaration?.attributes.includes('@frozen') === true
        return [
          {
            name: prefix,
            kind: 'String',
            assign: `switch ${expression} {\n${cases.map((c) => `case .${c.name}: ${prefix} = ${JSON.stringify(c.name)}`).join('\n')}${frozen ? '' : `\n@unknown default: preconditionFailure("unknown ${name} ${prefix}")`}\n}`,
          },
        ]
      }
      const stored = members.filter((d) => d.kind === 'var' && d.stored && !d.isStatic)
      if (stored.length && stored.every((d) => NUMBERS.includes(d.type ?? '')))
        return stored
          .sort((a, b) => a.line - b.line)
          .flatMap((d) => flatten(d.type!, `${expression}.${d.name}`, fieldName(prefix, d.name)))
      return fail(`${type} has no flat form for React`)
    }
    // the member an expression names: a property, or a method with these labels
    const memberFor = (expression: string) => {
      const [, member, list] = /^(\w+)(?:\((.*)\))?$/.exec(expression) ?? fail(`${expression} names no member`)
      const labels = list === undefined ? undefined : list.split(',').map((a) => a.split(':')[0].trim())
      const found = membersOf(contextType).filter(
        (d) =>
          d.name === member &&
          (labels === undefined
            ? d.kind === 'var'
            : d.kind === 'func' &&
              labels.every((l) => d.parameters.some((p) => p.label === l)) &&
              d.parameters.every((p) => labels.includes(p.label) || p.defaultValue !== undefined))
      )
      if (found.length === 0) fail(`${contextType} has no ${expression}`)
      // an overload newer than the floor is left to the ones every supported iOS has
      const usable = found.filter((d) => ios(d) <= floor)
      if (usable.length === 0) fail(`${contextType}.${expression} needs an availability gate`)
      return usable
    }
    // a member read into several fields is read once
    const contextReads: string[] = []
    const contextFields = contextValues.flatMap(([prefix, expression], index) => {
      const types = new Set(memberFor(expression).map((d) => d.type!))
      if (types.size !== 1) fail(`${contextType}.${expression} returns ${[...types].join(' or ')}`)
      const fields = flatten([...types][0], `context.${expression}`, prefix)
      if (fields.length === 1) return fields
      contextReads.push(`let read${index} = context.${expression}`)
      return flatten([...types][0], `read${index}`, prefix)
    })
    if (contextValues.length) {
      const event = component.events?.[context!.event ?? ''] ?? fail(`context event ${context!.event} is not in the spec`)
      const expected = contextFields.map((f) => `${f.name}: ${f.kind === 'Double' ? 'Double' : 'string'}`)
      const declared = Object.entries(event).map(([field, type]) => `${field}: ${type}`)
      if (expected.join(', ') !== declared.join(', '))
        fail(`${context!.event} must carry ${expected.join(', ')}, not ${declared.join(', ')}`)
    }
    // the Swift name of the handed value; swiftui's own modules are imported unqualified
    const contextSwift = contextType.replace(/^(SwiftUI|SwiftUICore)\./, '')
    const contextMethods = contextCommands.map(([command, method]) => {
      const spec = Object.entries(component.commands?.[command] ?? fail(`command ${command} is not in the spec`))
      const found = membersOf(contextType).filter(
        (d) => d.kind === 'func' && d.name === method && ios(d) <= floor
      )
      if (found.length !== 1) fail(`${contextType} has ${found.length} methods named ${method}`)
      const [declaration] = found
      const hashable = new Set(
        (declaration.requirements ?? []).flatMap((r) => /^(\w+) : Swift\.Hashable$/.exec(r)?.[1] ?? [])
      )
      let next = 0
      const take = (kind: string) => {
        const [arg, type] = spec[next++] ?? fail(`${command} takes too few arguments for ${method}`)
        if (!type.startsWith(kind)) fail(`${command} ${arg} must be ${kind}, for ${method}`)
        return arg
      }
      const passed = declaration.parameters.map((parameter) => {
        const base = parameter.type.replace(/\?$/, '')
        const optional = parameter.type.endsWith('?')
        let value: string
        // a hashable id is a row's tag, which React gives as a string
        if (hashable.has(base)) value = take('string')
        else if (NUMBERS.includes(base)) value = `${base.split('.').at(-1)}(${take('Double')})`
        else if (base === 'Swift.Bool') value = take('boolean')
        else if (base === 'Swift.String') value = take('string')
        else {
          // a struct of stored numbers arrives as its parts, after a has-flag when optional
          const has = optional ? take('boolean') : ''
          const parts = membersOf(base)
            .filter((d) => d.kind === 'var' && d.stored && !d.isStatic)
            .sort((a, b) => a.line - b.line)
          if (!parts.length || parts.some((d) => !NUMBERS.includes(d.type ?? '')))
            fail(`${method} ${parameter.label}: ${parameter.type} cannot come from React`)
          const built = `${ownerKey(base)}(${parts.map((d) => `${d.name}: ${take('Double')}`).join(', ')})`
          value = optional ? `(${has} ? ${built} : nil)` : built
        }
        if (optional && !value.startsWith('(')) fail(`${method} ${parameter.label}: an optional ${base} cannot come from React`)
        return parameter.label === '_' ? value : `${parameter.label}: ${value}`
      })
      if (next !== spec.length) fail(`${command} takes more arguments than ${method}`)
      return { command, method, spec, passed }
    })
    if (contextCommands.length) modifiers.unshift('.onAppear { model.appear() }')

    const binding = recipe.binding
    const bound = binding ? [binding.prop, 'acknowledgedEvent', 'revision'] : []
    for (const prop of bound) if (!(prop in component.props)) fail(`binding prop ${prop} is not in the spec`)
    const boundType = binding ? swiftField(component.props[binding.prop]) : ''
    const selection = recipe.selection
    if (selection && binding) fail('a host takes a binding or a selection, not both')
    const selected = selection ? [selection.prop, selection.controlled] : []
    for (const prop of selected) if (!(prop in component.props)) fail(`selection prop ${prop} is not in the spec`)
    const environment = recipe.environment === true
    if (environment)
      for (const prop of ENVIRONMENT)
        if (!(prop in component.props)) fail(`environment prop ${prop} is not in the spec`)
    const props = Object.entries(component.props).filter(
      ([prop, type]) =>
        !/ColorValue/.test(type) && !(environment && ENVIRONMENT.includes(prop)) && !bound.includes(prop) &&
        !selected.includes(prop)
    )
    const leaf = recipe.layout === 'leaf'
    const measured = recipe.layout === 'measured'
    const scheme = recipe.scheme === true
    // a model starts at the SDK's default, so a recycled host never holds a value its
    // conversion rejects
    const sdkDefault = (prop: string, kind: string) => {
      const parameter = full.initializer.parameters.find((p) => args[p.label] === prop)
      const value = parameter?.defaultValue
      if (value === undefined) {
        const cases = parameter && valueOf(parameter.type)?.cases
        return kind === 'String' && cases?.length && !parameter!.type.endsWith('?')
          ? JSON.stringify(cases[0].name)
          : undefined
      }
      if (kind === 'Bool' && (value === 'true' || value === 'false')) return value
      if (kind === 'Double' && /^-?\d+(\.\d+)?$/.test(value)) return value
      if (kind === 'Double' && value === 'nil')
        return `has${upper(prop)}` in component.props ? '0' : '-1'
      if (kind === 'String' && value === 'nil')
        return component.props[prop].startsWith('string') &&
          valueOf(parameter!.type)?.kind === 'number'
          ? '"null"'
          : '""'
      if (kind === 'String' && /^\.\w+$/.test(value))
        return JSON.stringify(value.slice(1))
      const alias = Object.entries(recipe.aliases?.[prop] ?? {}).find(
        ([, swift]) => swift === value
      )
      if (kind === 'String' && alias) return JSON.stringify(alias[0])
      fail(`${prop} has the SDK default ${value}, which has no prop value`)
    }
    const fields = [
      ...props.map(([prop, type]) => {
        const kind = swiftField(type)
        const initial =
          recipe.initial?.[prop] ??
          (prop === recipe.builder?.prop ? JSON.stringify(recipe.builder.members[0]) : undefined) ??
          sdkDefault(prop, kind) ??
          (kind === 'Bool' ? 'false' : kind === 'Double' ? '0' : '""')
        return { prop, kind, initial }
      }),
      ...(recipe.boundedHeight
        ? [{ prop: 'boundedHeight', kind: 'Bool', initial: 'false' }]
        : []),
    ]
    const hasModel =
      fields.length > 0 || measured || binding !== undefined || selection !== undefined || context !== undefined
    const contentFields = [
      ...(hasModel ? [`  @ObservedObject var model: ${short}Model`] : []),
      ...(leaf ? [] : ['  @ObservedObject var children: OneNativeChildren']),
      '  @ObservedObject var style: OneNativeContainerStyle',
      ...(environment ? ['  @ObservedObject var environment: OneNativeEnvironmentModel'] : []),
      ...(leaf ? [] : ['  let standalone: Bool']),
      ...(scheme ? ['  @ObservedObject var bridge: OneNativeSchemeBridge'] : []),
    ]
    const styled = [
      gated,
      ...modifiers,
      `.oneNativeContainerStyle(style${recipe.skipEmptyStyle ? ', skipWhenEmpty: true' : ''})`,
    ].join('\n')
    const measuredWhen = [
      'standalone',
      ...(recipe.boundedHeight ? ['!model.boundedHeight'] : []),
      ...(recipe.measuredWhen ? [model(recipe.measuredWhen)] : []),
    ].join(' && ')
    const body = [
      indent(environment ? `OneNativeEnvironment(model: environment, content: ${styled})` : styled, 4),
      ...(measured ? [`    .oneNativeMeasured(${measuredWhen}, model.onHeight)`] : []),
      ...(scheme ? ['    .oneNativeScheme(standalone, bridge.scheme)'] : []),
    ]
    const contentArguments = [
      ...(hasModel ? ['model: model'] : []),
      ...(leaf ? [] : ['children: children']),
      'style: style',
      ...(environment ? ['environment: environment'] : []),
      ...(leaf ? [] : ['standalone: standalone']),
      ...(scheme ? ['bridge: bridge'] : []),
    ].join(', ')
    const initialBound = binding
      ? (recipe.initial?.[binding.prop] ?? (boundType === 'Bool' ? 'false' : boundType === 'Double' ? '0' : '""'))
      : ''
    const configured = fields
    const swift = `${header}import SwiftUI
import UIKit
${
  hasModel
    ? `
private final class ${short}Model: ObservableObject {
${[
  ...(binding ? [`  @Published var controlled = OneNativeControlled<${boundType}>(${initialBound})`] : []),
  ...fields.map(({ prop, kind, initial }) => `  @Published var ${prop}: ${kind} = ${initial}`),
  ...(measured ? ['  var onHeight: ((CGFloat) -> Void)?'] : []),
  ...(binding || selection || contextValues.length ? ['  var active = false'] : []),
  ...(contextValues.length
    ? [
        `  var latest: ${short}Context?`,
        `  var onContext: ((${short}Context) -> Void)?`,
        '',
        '  // the builder runs inside SwiftUI\'s update, so React hears of a change after it',
        `  func read(_ next: ${short}Context) {`,
        '    guard next != latest else { return }',
        '    latest = next',
        '    DispatchQueue.main.async { [weak self] in',
        '      guard let self, self.active, self.latest == next else { return }',
        '      self.onContext?(next)',
        '    }',
        '  }',
      ]
    : []),
  ...(contextCommands.length
    ? [
        `  private var context: ${contextSwift}?`,
        '  private var appeared = false',
        `  private var pending: [(${contextSwift}) -> Void] = []`,
        '',
        '  // the builder only stores the value, since SwiftUI hands it out during the build',
        `  func capture(_ context: ${contextSwift}) { self.context = context }`,
        '',
        '  func appear() {',
        '    appeared = true',
        `    guard let context else { preconditionFailure("${name} appeared before its builder ran") }`,
        '    let queued = pending',
        '    pending = []',
        '    for run in queued { run(context) }',
        '  }',
        '',
        '  // a call before the content first appears waits for it, so none is dropped',
        `  func run(_ body: @escaping (${contextSwift}) -> Void) {`,
        '    guard appeared, let context else {',
        '      pending.append(body)',
        '      return',
        '    }',
        '    body(context)',
        '  }',
        '',
        '  func resetContext() {',
        '    context = nil',
        '    appeared = false',
        '    pending = []',
        '  }',
      ]
    : []),
  ...(binding
    ? [
        `  var onChange: ((${boundType}, Int, Int) -> Void)?`,
        '',
        `  func change(_ value: ${boundType}) {`,
        '    guard active, controlled.value != value else { return }',
        '    controlled.change(value)',
        '    onChange?(value, controlled.eventCount, controlled.revision)',
        '  }',
      ]
    : []),
  ...(selection
    ? [
        '  @Published var selectedTags = Set<String>()',
        '  @Published var uncontrolledSelection = Set<String>()',
        '  @Published var selectionIsControlled = false',
        '  var onSelectionChange: ((String) -> Void)?',
        '',
        '  var currentSelection: Set<String> {',
        '    selectionIsControlled ? selectedTags : uncontrolledSelection',
        '  }',
        '',
        '  var selectionBinding: Binding<Set<String>> {',
        '    Binding(',
        '      get: { [self] in currentSelection },',
        '      set: { [self] next in',
        '        guard next != currentSelection else { return }',
        '        if !selectionIsControlled { uncontrolledSelection = next }',
        '        guard active else { return }',
        '        do {',
        '          let data = try JSONEncoder().encode(next.sorted())',
        '          onSelectionChange?(String(decoding: data, as: UTF8.self))',
        '        } catch {',
        `          preconditionFailure("invalid ${name} selection: \\(error)")`,
        '        }',
        '      }',
        '    )',
        '  }',
        '',
        '  func configureSelection(_ json: String, controlled: Bool) {',
        '    let next: [String]',
        '    do { next = try JSONDecoder().decode([String].self, from: Data(json.utf8)) }',
        `    catch { preconditionFailure("invalid ${name} selection \\(json): \\(error)") }`,
        '    if controlled { selectedTags = Set(next) }',
        '    selectionIsControlled = controlled',
        '  }',
      ]
    : []),
].join('\n')}
}
`
    : ''
}${
  contextValues.length
    ? `
// what React reads of the ${contextSwift} SwiftUI hands the content builder
private struct ${short}Context: Equatable {
${contextFields.map((f) => `  let ${f.name}: ${f.kind}`).join('\n')}

  init(_ context: ${contextSwift}) {
    ${indent([...contextReads, ...contextFields.map((f) => f.assign)].join('\n'), 4)}
  }
}
`
    : ''
}
private struct ${short}Content: View {
${contentFields.join('\n')}

  var body: some View {
    ${body.join('\n')}
  }
}
${conversions.length ? `\n${conversions.join('\n\n')}\n` : ''}
@objcMembers
public final class ${name}View: ${leaf ? 'OneNativeStyledLeafView' : 'OneNativeContainerView'} {
${[
  ...(binding ? [`  public var onChange: ((${boundType}, Int, Int) -> Void)?`] : []),
  ...(selection ? ['  public var onSelectionChange: ((String) -> Void)?'] : []),
  ...(measured ? ['  public var onMeasure: ((CGFloat) -> Void)?'] : []),
  ...(contextValues.length
    ? [`  public var onContext: ((${contextFields.map((f) => f.kind).join(', ')}) -> Void)?`]
    : []),
  ...(hasModel ? [`  private let model: ${short}Model`] : []),
  ...(environment ? ['  private let environment: OneNativeEnvironmentModel'] : []),
  ...(scheme
    ? [
        '  private let bridge: OneNativeSchemeBridge',
        '  private var traitRegistration: NSObjectProtocol?',
      ]
    : []),
].join('\n')}

  public init() {
${[
  ...(hasModel ? [`    let model = ${short}Model()`, '    self.model = model'] : []),
  ...(environment
    ? ['    let environment = OneNativeEnvironmentModel()', '    self.environment = environment']
    : []),
  ...(scheme
    ? ['    let bridge = OneNativeSchemeBridge()', '    self.bridge = bridge']
    : []),
].join('\n')}
    super.init(styled: { ${leaf ? 'style' : 'children, style, standalone'} in
      AnyView(${short}Content(${contentArguments}))
    })${selection ? '\n    model.onSelectionChange = { [weak self] selection in\n      self?.onSelectionChange?(selection)\n    }' : ''}${binding ? '\n    model.onChange = { [weak self] value, count, revision in\n      self?.onChange?(value, count, revision)\n    }' : ''}${measured ? '\n    model.onHeight = { [weak self] height in self?.onMeasure?(height) }' : ''}${
      contextValues.length
        ? `\n    model.onContext = { [weak self] context in\n      self?.onContext?(${contextFields.map((f) => `context.${f.name}`).join(', ')})\n    }`
        : ''
    }${
      scheme
        ? `
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: ${name}View, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }`
        : ''
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
${
  scheme
    ? `
  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }
`
    : ''
}${
      configured.length || binding || selection
        ? `
  public func configure(${[
    ...(binding ? [`${binding.prop}: ${boundType}`, 'acknowledgedEvent: Int', 'revision: Int'] : []),
    ...configured.map(({ prop, kind }) => `${prop}: ${kind}`),
    ...(selection ? [`${selection.prop}: String`, `${selection.controlled}: Bool`] : []),
  ].join(', ')}) {
${[
  ...(recipe.builder
    ? [
        `    precondition([${recipe.builder.members.map((m) => JSON.stringify(m)).join(', ')}].contains(${recipe.builder.prop}), "invalid ${name} ${recipe.builder.prop}: \\(${recipe.builder.prop})")`,
      ]
    : []),
  ...(binding
    ? [
        `    if let next = model.controlled.applying(${binding.prop}, acknowledged: acknowledgedEvent, revision: revision) { model.controlled = next }`,
      ]
    : []),
 ...configured.map(({ prop }) => `    if model.${prop} != ${prop} { model.${prop} = ${prop} }`),
  ...(selection ? [`    model.configureSelection(${selection.prop}, controlled: ${selection.controlled})`] : []),
].join('\n')}
  }
${binding || selection ? '\n  public override func setActive(_ active: Bool) { model.active = active }\n' : ''}`
        : ''
    }${
      contextValues.length
        ? `
  public override func setActive(_ active: Bool) {
    model.active = active
    if active, let latest = model.latest { model.onContext?(latest) }
  }
`
        : ''
    }${contextMethods
      .map(
        ({ command, spec, method, passed }) => `
  public func ${command}(${spec.map(([arg, type], index) => `${index === 0 ? '_ ' : ''}${arg}: ${swiftField(type)}`).join(', ')}) {
    model.run { context in context.${method}(${passed.join(', ')}) }
  }
`
      )
      .join('')}${
      environment
        ? `
  public func configureEnvironment(
    colorScheme: String, dynamicTypeSize: String, controlSize: String, locale: String,
    tint: UIColor?, isEnabled: String
  ) {
    environment.configure(
      colorScheme: colorScheme, dynamicTypeSize: dynamicTypeSize, controlSize: controlSize,
      locale: locale, tint: tint, isEnabled: isEnabled)
  }
`
        : ''
    }${
      recipe.rowModifiers
        ? `
  @nonobjc override func isRowModifier(_ name: String) -> Bool {
    ${recipe.rowModifiers}
  }
`
        : ''
    }${
      (hasModel && fields.length) || environment || binding || selection || context
        ? `
  public override func reset() {
${[
  ...(binding ? ['    model.active = false', `    model.controlled = OneNativeControlled<${boundType}>(${initialBound})`] : []),
  ...fields.map(({ prop, initial }) => `    model.${prop} = ${initial}`),
  ...(selection
    ? ['    model.selectedTags = []', '    model.uncontrolledSelection = []', '    model.selectionIsControlled = false']
    : []),
  ...(environment ? ['    environment.reset()'] : []),
  ...(contextValues.length ? ['    model.latest = nil'] : []),
  ...(contextCommands.length ? ['    model.resetContext()'] : []),
].join('\n')}
    super.reset()
  }
`
        : ''
    }}
`

    outputs.set(`ios/Generated/${name}View.swift`, swift)
    const base = leaf
      ? 'RCTViewComponentView'
      : measured
        ? 'OneNativeMeasuredComponentView'
        : 'OneNativeContainerComponentView'
    const baseImport = leaf
      ? '<React/RCTViewComponentView.h>'
      : `"${measured ? 'OneNativeMeasuredComponentView' : 'OneNativeContainerComponentView'}.h"`
    outputs.set(
      `ios/Generated/${name}ComponentView.h`,
      `${header}#ifdef __cplusplus
#import ${baseImport}
@interface ${name}ComponentView : ${base}
@end
#endif
`
    )
    const objcConfigured = [
      ...bound.map((prop) => ({ prop, value: `next.${prop}` })),
      ...configured.map(({ prop }) => ({
        prop,
        value: prop === 'boundedHeight' ? 'boundedHeight' : objcArgument(prop, component.props[prop]),
      })),
      ...(selection
        ? [
            { prop: selection.prop, value: `RCTNSStringFromString(next.${selection.prop})` },
            { prop: selection.controlled, value: `next.${selection.controlled}` },
          ]
        : []),
    ]
    const configure = objcConfigured.length
      ? `  [_nativeView configureWith${upper(objcConfigured[0].prop)}:${objcConfigured
          .map(({ prop, value }, index) => (index === 0 ? value : `\n      ${prop}:${value}`))
          .join('')}];\n`
      : ''
    const configureEnvironment = environment
      ? `  [_nativeView configureEnvironmentWithColorScheme:RCTNSStringFromString(next.colorScheme)
      dynamicTypeSize:RCTNSStringFromString(next.dynamicTypeSize)
      controlSize:RCTNSStringFromString(next.controlSize)
      locale:RCTNSStringFromString(next.locale)
      tint:next.tint ? RCTUIColorFromSharedColor(next.tint) : nil
      isEnabled:RCTNSStringFromString(next.isEnabled)];\n`
      : ''
    outputs.set(
      `ios/Generated/${name}ComponentView.mm`,
      `${header}#import "${name}ComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
${measured ? `#import "${name}ShadowNode.h"` : '#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>'}
#import <React/RCTConversions.h>${contextMethods.length ? '\n#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>' : ''}

using namespace facebook::react;
${contextMethods.length ? `\n@interface ${name}ComponentView () <RCT${name}ViewProtocol>\n@end\n` : ''}
@implementation ${name}ComponentView {
  ${name}View *_nativeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<${name}ComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const ${name}Props>();
    _nativeView = [${name}View new];
${
  leaf
    ? `    __weak ${name}ComponentView *weakSelf = self;
    _nativeView.onSwiftStyleEvent = ^(NSString *name, NSString *value) {
      ${name}ComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
`
    : `    self.container = _nativeView;
    OneNativeForwardSwiftStyleEvents<${name}EventEmitter>(self);
`
}    self.contentView = _nativeView;
${
  selection
    ? `    __weak ${name}ComponentView *weakSelected = self;
    _nativeView.onSelectionChange = ^(NSString *selection) {
      ${name}ComponentView *strongSelf = weakSelected;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${selection.event}({.${selection.prop} = std::string(selection.UTF8String)});
    };
`
    : ''
}${
  binding
    ? `    __weak ${name}ComponentView *weakChanged = self;
    _nativeView.onChange = ^(${boundType === 'Bool' ? 'BOOL' : boundType === 'Double' ? 'double' : 'NSString *'} value, NSInteger eventCount, NSInteger revision) {
      ${name}ComponentView *strongSelf = weakChanged;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${binding.event}({.value = ${boundType === 'Bool' ? '(bool)value' : boundType === 'Double' ? 'value' : 'std::string(value.UTF8String)'}, .eventCount = (int)eventCount, .revision = (int)revision});
    };
`
    : ''
}${
  contextValues.length
    ? `    __weak ${name}ComponentView *weakContext = self;
    _nativeView.onContext = ^(${contextFields.map((f) => `${f.kind === 'Double' ? 'double ' : 'NSString *'}${f.name}`).join(', ')}) {
      ${name}ComponentView *strongSelf = weakContext;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const ${name}EventEmitter>(strongSelf->_eventEmitter);
      emitter->${context!.event}({${contextFields.map((f) => `.${f.name} = ${f.kind === 'Double' ? f.name : `std::string(${f.name}.UTF8String)`}`).join(', ')}});
    };
`
    : ''
}${
  measured
    ? `    __weak ${name}ComponentView *weakSelf = self;
    _nativeView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
`
    : ''
}  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const ${name}Props>(props);
  [_nativeView configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
${
  recipe.boundedHeight
    ? `  const auto height = next.yogaStyle.dimension(facebook::yoga::Dimension::Height);
  const bool boundedHeight = !height.isUndefined() && !height.isAuto();
`
    : ''
}${configure}${configureEnvironment}  [super updateProps:props oldProps:oldProps];
}
${contextMethods
  .map(
    ({ command, spec }) => `
- (void)${command}${spec.map(([arg, type], index) => `${index === 0 ? '' : ` ${arg}`}:(${objcType(type)})${arg}`).join('')} {
  [_nativeView ${command}${spec.map(([arg], index) => `${index === 0 ? '' : ` ${arg}`}:${arg}`).join('')}];
}
`
  )
  .join('')}${
  contextMethods.length
    ? `
- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCT${name}HandleCommand(self, commandName, args);
}
`
    : ''
}${
  leaf
    ? `
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
}
`
    : ''
}
@end
`
    )
    if (measured) {
      outputs.set(
        `cpp/${name}ShadowNode.h`,
        `${header}#pragma once
#ifdef __cplusplus
#include <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <react/renderer/components/OneNativeSpec/Props.h>
#include "OneNativeMeasuredShadowNode.h"
namespace facebook::react {
extern const char ${name}ComponentName[];
using ${name}ShadowNode = OneNativeMeasuredShadowNode<${name}ComponentName, ${name}Props, ${name}EventEmitter>;
using ${name}ComponentDescriptor = OneNativeMeasuredComponentDescriptor<${name}ShadowNode>;
}
#endif
`
      )
      outputs.set(
        `cpp/${name}ShadowNode.cpp`,
        `${header}#include "${name}ShadowNode.h"

namespace facebook::react {
extern const char ${name}ComponentName[] = "${name}";
}
`
      )
    }
  }
  return hosted.map((component) => component.name)
}
