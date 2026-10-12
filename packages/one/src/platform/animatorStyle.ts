import type { OneNativeStyle } from './generated/controlTypes'

// a PhaseAnimator or KeyframeAnimator child's swiftStyle carries every evaluation
// of the animator's content closure under this key. the visible fields are the
// first evaluation's, so callbacks and any reader that does not know about
// animators see a plain style.
const animatorKey = Symbol.for('one.native.animator')

export type AnimatorStyle =
  | { id: number; kind: 'phase'; owner: string; samples: readonly OneNativeStyle[] }
  | {
      id: number
      kind: 'keyframe'
      owner: string
      samples: readonly OneNativeStyle[]
      // the keyframe value each sample was evaluated at.
      values: readonly (readonly number[])[]
    }

export function animatedSwiftStyle(animator: AnimatorStyle): OneNativeStyle {
  return { ...animator.samples[0], [animatorKey]: animator } as OneNativeStyle
}

export function animatorStyleOf(style: OneNativeStyle): AnimatorStyle | undefined {
  return (style as Record<symbol, AnimatorStyle | undefined>)[animatorKey]
}

type NativeStyle = Readonly<Record<string, unknown>> & { sdkModifiers?: string }

const colorFields = new Set(['foregroundStyle', 'tint', 'background', 'borderColor', 'glassEffectTint'])

function same(a: unknown, b: unknown) {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

function sdkPairs(style: NativeStyle): [string, string][] {
  return style.sdkModifiers ? (JSON.parse(style.sdkModifiers) as [string, string][]) : []
}

function withPayload(base: NativeStyle, payload: unknown): NativeStyle {
  return {
    ...base,
    sdkModifiers: JSON.stringify([...sdkPairs(base), ['oneNativeAnimator', JSON.stringify(payload)]]),
  }
}

function phaseNative(animator: Extract<AnimatorStyle, { kind: 'phase' }>, natives: NativeStyle[]) {
  const keys = [...new Set(natives.flatMap((native) => Object.keys(native)))]
  const varying = keys.filter((key) => natives.some((native) => !same(native[key], natives[0][key])))
  for (const key of varying) {
    if (colorFields.has(key) && natives.some((native) => native[key] !== undefined && typeof native[key] !== 'number'))
      throw new Error(`${animator.owner} content can vary ${key} by phase only with plain colors, not platform colors`)
  }
  const phases = natives.map((native) =>
    Object.fromEntries(varying.filter((key) => native[key] !== undefined).map((key) => [key, native[key]]))
  )
  return withPayload(natives[0], { id: animator.id, kind: 'phase', varying, phases })
}

// numeric leaves of one sdk modifier value: a numeric string, or the numbers and
// numeric strings inside its JSON. the shape keeps everything else literal.
const numericText = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i

function leavesOf(value: string): { shape: string; leaves: number[]; texts: string[] } {
  const leaves: number[] = []
  const texts: string[] = []
  const leaf = (number: number, text: string, quoted: boolean) => {
    leaves.push(number)
    texts.push(text)
    return quoted ? `__oneKS${leaves.length - 1}__` : `__oneKN${leaves.length - 1}__`
  }
  if (numericText.test(value)) return { shape: leaf(Number(value), value, true), leaves, texts }
  let parsed: unknown
  try {
    parsed = /^[[{]/.test(value) ? JSON.parse(value) : undefined
  } catch {
    parsed = undefined
  }
  if (parsed === undefined) return { shape: value, leaves, texts }
  const walk = (item: unknown): unknown => {
    if (typeof item === 'number') return leaf(item, JSON.stringify(item), false)
    if (typeof item === 'string' && numericText.test(item)) return leaf(Number(item), item, true)
    if (Array.isArray(item)) return item.map(walk)
    if (item && typeof item === 'object')
      return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, walk(entry)]))
    return item
  }
  return { shape: JSON.stringify(walk(parsed)), leaves, texts }
}

function keyframeNative(animator: Extract<AnimatorStyle, { kind: 'keyframe' }>, natives: NativeStyle[]) {
  const { owner, values } = animator
  const fieldCount = values[0].length
  // samples: the initial value, one unit step per field, then a check point.
  const tokens: { base: number; coefficients: number[] }[] = []
  const bind = (samples: number[], where: string) => {
    if (samples.every((sample) => sample === samples[0])) return undefined
    const coefficients = Array.from({ length: fieldCount }, (_, field) => samples[field + 1] - samples[0])
    const check = values[fieldCount + 1]
    let predicted = samples[0]
    for (let field = 0; field < fieldCount; field++)
      predicted += coefficients[field] * (check[field] - values[0][field])
    const actual = samples[fieldCount + 1]
    if (!(Math.abs(predicted - actual) <= 1e-6 * Math.max(1, Math.abs(actual))))
      throw new Error(`${owner} content must map its value linearly to swiftStyle numbers; ${where} does not`)
    let base = samples[0]
    for (let field = 0; field < fieldCount; field++) base -= coefficients[field] * values[0][field]
    tokens.push({ base, coefficients })
    return tokens.length - 1
  }

  const keys = [...new Set(natives.flatMap((native) => Object.keys(native)))].filter((key) => key !== 'sdkModifiers')
  const fields: Record<string, number> = {}
  for (const key of keys) {
    const samples = natives.map((native) => native[key])
    if (samples.every((sample) => same(sample, samples[0]))) continue
    if (colorFields.has(key) || !samples.every((sample) => typeof sample === 'number'))
      throw new Error(`${owner} content can follow its value only through swiftStyle numbers; ${key} changed`)
    const token = bind(samples as number[], key)
    if (token !== undefined) fields[key] = token
  }

  const pairs = natives.map(sdkPairs)
  const names = pairs[0].map(([name]) => name)
  if (pairs.some((list) => !same(list.map(([name]) => name), names)))
    throw new Error(`${owner} content must apply the same swiftStyle modifiers at every value`)
  const template = names.map((name, index) => {
    const parts = pairs.map((list) => leavesOf(list[index][1]))
    if (parts.some((part) => part.shape !== parts[0].shape))
      throw new Error(`${owner} content can follow its value only through swiftStyle numbers; ${name} changed`)
    let value = parts[0].shape
    parts[0].leaves.forEach((_, leaf) => {
      const token = bind(parts.map((part) => part.leaves[leaf]), name)
      const text = token === undefined ? parts[0].texts[leaf] : `@@${token}@@`
      value = value
        .replace(`"__oneKN${leaf}__"`, text)
        .replace(`__oneKS${leaf}__`, text)
    })
    return [name, value]
  })
  return withPayload(natives[0], {
    id: animator.id,
    kind: 'keyframe',
    fields,
    sdkModifiers: template.length ? JSON.stringify(template) : undefined,
    tokens,
  })
}

export function animatorStyleNative<Native>(
  animator: AnimatorStyle,
  convert: (style: OneNativeStyle | undefined) => Native | undefined
): Native {
  const natives = animator.samples.map((sample) => (convert(sample) ?? {}) as NativeStyle)
  const native = animator.kind === 'phase' ? phaseNative(animator, natives) : keyframeNative(animator, natives)
  return native as Native
}
