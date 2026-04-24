import type { DynamicConvention } from './Route'

function paramValueEqual(a: unknown, b: unknown) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => value === b[index])
    )
  }
  return a === b
}

export function mergeDynamicParams<TParams extends Record<string, any> | undefined>(
  params: TParams,
  dynamic: DynamicConvention[] | null | undefined,
  source: Record<string, any> | undefined
): TParams {
  if (!dynamic?.length || !source) return params

  let next: Record<string, any> | undefined

  for (const segment of dynamic) {
    const value = source[segment.name]
    if (value == null || paramValueEqual(params?.[segment.name], value)) continue
    next ??= { ...params }
    next[segment.name] = value
  }

  return (next ?? params) as TParams
}
