const loaderReturnRegex = `return\\s*\\"__vxrn__loader__\\"`

export function replaceLoader(code: string, loaderData: Object, loaderRegexName = 'loader') {
  const regexStr = `(export\\s+)?function\\s+(${loaderRegexName})\\([^\\)]?\\)\\s*{\\s*${loaderReturnRegex};?}`
  const regex = new RegExp(regexStr, 'i')
  const match = code.match(regex)
  if (!match) {
    return code
  }

  const [_a, _b, loaderName] = match
  const loaderReturn = `return ${JSON.stringify(loaderData)}`
  const reExport = `export function loader() {${loaderReturn}}`

  // if minified loaderName !== loader so we re-add the export
  if (loaderName !== 'loader') {
    return `${code.replace(new RegExp(loaderReturnRegex, 'gi'), loaderReturn)}\n${reExport}`
  }

  return code.replace(regex, reExport)
}
