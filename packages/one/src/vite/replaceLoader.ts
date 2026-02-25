// matches the routeId stub return value in both minified and non-minified code:
//   non-minified: return "./loader-refetch/index.tsx"
//   minified:     return"./loader-refetch/index.tsx"
const routeIdReturnRegex = /return\s*"\.\/[^"]+"/

export function replaceLoader({
  code,
  loaderData,
}: {
  code: string
  loaderData: object
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
    if (routeIdReturnRegex.test(code)) {
      return code.replace(routeIdReturnRegex, 'return ' + safeData)
    }

    return code + `\nexport const loader = () => (${stringifiedData})`
  })()

  return out
}
