// matches the routeId stub return value in both minified and non-minified code:
//   non-minified: return "./loader-refetch/index.tsx"
//   minified:     return"./loader-refetch/index.tsx"
//   minified (rolldown): return`./loader-refetch/index.tsx`
const routeIdReturnRegex = /return\s*["'`]\.\/[^"'`]+["'`]/

// a chunk can hold more than one route's stub once the bundler merges routes,
// so target this route's own id when we know it rather than the first stub
const routeIdReturnRegexFor = (routeId: string) =>
  new RegExp(`return\\s*["'\`]${routeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`)

export function replaceLoader({
  code,
  loaderData,
  routeId,
}: {
  code: string
  loaderData: object
  routeId?: string
}) {
  const stringifiedData = JSON.stringify(loaderData)
  const safeData = stringifiedData.replace(/\$/g, '$$$$')

  const out = (() => {
    // old-style placeholder stub
    if (code.includes('__vxrn__loader__')) {
      return code.replace(
        /["']__vxrn__loader__['"]/,
        // make sure this ' ' is added in front,
        // minifiers will do `return"something"
        // but if its null then it becomes returnnull
        ' ' + safeData
      )
    }

    // new-style routeId stub from clientTreeShakePlugin
    // works with both minified (return"./path") and non-minified (return "./path") code
    const stubRegex = routeId ? routeIdReturnRegexFor(routeId) : routeIdReturnRegex
    if (stubRegex.test(code)) {
      return code.replace(stubRegex, 'return ' + safeData)
    }

    return code + `\nexport const loader = () => (${stringifiedData})`
  })()

  return out
}
