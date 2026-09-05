// matches this route's own routeId stub return value, minified or not:
//   non-minified: return "./loader-refetch/index.tsx"
//   minified:     return"./loader-refetch/index.tsx"
//   minified (rolldown): return`./loader-refetch/index.tsx`
// a chunk can hold more than one route's stub once the bundler merges routes,
// so always target this route's own id
const routeIdReturnRegexFor = (routeId: string) =>
  new RegExp(`return\\s*["'\`]${routeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`)

const anyRouteIdReturnRegex = /return\s*["'`](\.\/[^"'`]+)["'`]/

export function replaceLoader({
  code,
  loaderData,
  routeId,
}: {
  code: string
  loaderData: object
  routeId: string
}) {
  const stringifiedData = JSON.stringify(loaderData)
  const safeData = stringifiedData.replace(/\$/g, '$$$$')

  // old-style placeholder stub from the babel remove-server-code plugin
  if (code.includes('__vxrn__loader__')) {
    return code.replace(
      /["']__vxrn__loader__['"]/,
      // make sure this ' ' is added in front,
      // minifiers will do `return"something"
      // but if its null then it becomes returnnull
      ' ' + safeData
    )
  }

  // routeId stub from clientTreeShakePlugin
  const stubRegex = routeIdReturnRegexFor(routeId)
  if (!stubRegex.test(code)) {
    const found = code.match(anyRouteIdReturnRegex)
    throw new Error(
      `[one] no loader stub for route "${routeId}" in its client chunk${
        found ? `, found a stub for "${found[1]}" instead` : ''
      }. clientTreeShakePlugin must emit a routeId relative to the configured router root so it matches the route contextKey.`
    )
  }

  return code.replace(stubRegex, 'return ' + safeData)
}
