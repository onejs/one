const loaderReturnStr = `return\\s*\\"__vxrn__loader__\\"`
const loaderReturnRegex = new RegExp(loaderReturnStr, 'gi')

export function replaceLoader(code: string, loaderData: Object, loaderRegexName = 'loader') {
  const loaderReturn = `return ${JSON.stringify(loaderData)}`
  const loaderRegex = new RegExp(
    `(export\\s+)?function\\s+(${loaderRegexName})\\([^\\)]?\\)\\s*{\\s*${loaderReturnStr};?\\s*}`,
    'i'
  )
  const loaderWithExport = `export function loader() {${loaderReturn}}`

  if (loaderRegexName === 'loader') {
    return code.replace(loaderRegex, loaderWithExport)
  }

  const match = code.match(loaderRegex)
  if (!match) {
    return code
  }

  const [_a, _b, loaderName] = match

  // if minified loaderName !== loader so we re-add the export
  if (loaderName !== 'loader') {
    return `${code.replace(loaderReturnRegex, loaderReturn)}\n${loaderWithExport}`
  }

  return code.replace(loaderReturnRegex, loaderReturn)
}
