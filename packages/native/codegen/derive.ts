import { selectConstructor, selectEnumModifier, type Declaration } from './inventory'
import type { LeafArg, LeafRecipe } from './controlTypes'

// the generic leaf emitter: builds a control's Swift body from its SDK constructor
// signature plus declarative argument descriptors, instead of a hand-written body.
// enum fields the args do not consume chain as modifiers automatically, resolved
// through the SDK by enum type. whitespace follows the recipe convention exactly:
// first line unindented (the emitter adds the base indent), closure bodies at 8,
// chain links at 6, so derivation is byte-comparable with hand-written bodies.

const lowerFirst = (name: string) => name[0].toLowerCase() + name.slice(1)
const upperFirst = (name: string) => name[0].toUpperCase() + name.slice(1)
const lastComponent = (type: string) => type.replace('?', '').split('.').at(-1) ?? type

const isClosure = (arg: LeafArg): arg is Extract<LeafArg, { text: string } | { discard: true }> =>
  'text' in arg || 'discard' in arg

function checkArg(
  arg: LeafArg,
  type: string,
  paragraf: string
): void {
  const fail = (want: string): never => {
    throw new Error(`leaf ${paragraf}: ${arg.label} is ${type}, not ${want}`)
  }
  if ('binding' in arg) {
    if (!type.includes('Binding<')) fail('a Binding')
  } else if ('discard' in arg) {
    if (!type.includes('-> Swift.Void')) fail('a Void event closure')
  } else if ('text' in arg) {
    if (!type.includes('() ->')) fail('a closure')
  } else if ('range' in arg) {
    if (!type.includes('ClosedRange')) fail('a range')
  } else if ('localizedKey' in arg) {
    if (!type.includes('LocalizedStringKey')) fail('a LocalizedStringKey')
  } else if ('enum' in arg) {
    if (lastComponent(type) !== arg.enum) fail(`a ${arg.enum}`)
  } else {
    // a scalar field: a concrete scalar, an unconstrained generic one (V, S), or a
    // member of one (V.Stride for a Double step).
    if (type.includes('Binding<') || type.includes('() ->') || type.includes('ClosedRange'))
      fail('a scalar')
    const scalar = type.replace('?', '')
    if (
      !/^(String|Bool|Double|CGFloat|Int|Float|[A-Z])$/.test(lastComponent(scalar)) &&
      !/^[A-Z]\.[A-Za-z]+$/.test(scalar)
    )
      fail('a scalar')
  }
}

function renderArg(arg: Exclude<LeafArg, { text: string } | { discard: true }>): string {
  if ('binding' in arg)
    return 'Binding(\n        get: { model.controlled.value },\n        set: { value in model.change(value) }\n      )'
  if ('range' in arg) return `model.${arg.range[0]}...model.${arg.range[1]}`
  if ('localizedKey' in arg) return `LocalizedStringKey(model.${arg.localizedKey})`
  if ('enum' in arg) return `OneNativeGenerated.${lowerFirst(arg.enum)}(model.${arg.field})`
  return `model.${arg.field}`
}

export function deriveLeafSwift(
  inventory: readonly Declaration[],
  leaf: LeafRecipe,
  // the control's enum fields in recipe order: `{ field, enum }` pairs.
  enumFields: readonly { field: string; enum: string }[]
): string {
  // provenance first: the recipe names an exact SDK signature, and SDK drift fails
  // here the same way it fails for hand-written recipes.
  const constructor = selectConstructor(inventory, leaf.constructor)
  const types = new Map(constructor.parameters.map((parameter) => [parameter.label, parameter.type]))
  if (leaf.args.length !== constructor.parameters.length)
    throw new Error(
      `leaf ${leaf.constructor.type}: ${leaf.args.length} args for ${constructor.parameters.length} parameters`
    )
  for (const arg of leaf.args) {
    const type = types.get(arg.label)
    if (type == null) throw new Error(`leaf ${leaf.constructor.type}: no parameter ${arg.label}`)
    checkArg(arg, type, leaf.constructor.type)
  }
  const paren = leaf.args.filter((arg) => !isClosure(arg))
  const closures = leaf.args.filter(isClosure)
  if (closures.some((arg, index) => 'discard' in arg && index !== closures.length - 1))
    throw new Error(`leaf ${leaf.constructor.type}: a discarded closure must be last`)
  let body =
    `${leaf.constructor.type}(${paren
      .map((arg) => {
        const rendered = renderArg(arg)
        return arg.label === '_' ? rendered : `${arg.label}: ${rendered}`
      })
      .join(', ')})`
  closures.forEach((arg, index) => {
    const open = index === 0 ? ' {' : `\n      } ${arg.label}: {`
    body += 'discard' in arg ? `${open} _ in }` : `${open}\n        Text(model.${arg.text})`
  })
  if (closures.length && !('discard' in closures[closures.length - 1])) body += '\n      }'
  const consumed = new Set(
    leaf.args.flatMap((arg) =>
      'field' in arg
        ? [arg.field]
        : 'localizedKey' in arg
          ? [arg.localizedKey]
          : 'text' in arg
            ? [arg.text]
            : 'range' in arg
              ? [...arg.range]
              : []
    )
  )
  for (const { field, enum: enumType } of enumFields) {
    if (consumed.has(field)) continue
    const modifier = selectEnumModifier(inventory, enumType)
    body += `\n      .oneNative${upperFirst(modifier.name)}(model.${field})`
  }
  return body
}
