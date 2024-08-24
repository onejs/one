import type { LoaderProps } from '../useLoader'

const loaderReturnStr = `return\\s*\\"__vxrn__loader__\\";?`
const loaderReturnRegex = new RegExp(loaderReturnStr, 'gi')

export function replaceLoader({
  code,
  loaderData,
  loaderProps,
  loaderRegexName = 'loader',
}: {
  code: string
  loaderData: Object
  loaderProps?: LoaderProps
  loaderRegexName?: string
}) {
  const loaderReturn = `return ${JSON.stringify(loaderData)};`
  const regexString = `(export\\s+)?function\\s+(${loaderRegexName})\\([^\\)]?\\)\\s*{\\s*${loaderReturnStr};?\\s*}`
  const loaderRegex = new RegExp(regexString, 'i')
  const loaderWithExport = `export function loader() {${loaderReturn}}`

  if (loaderRegexName === 'loader') {
    return code.replace(loaderRegex, loaderWithExport)
  }

  const match = code.match(loaderRegex)

  if (!match) {
    // slow down just a tiny bit but adds some safety in case the regex doesnt match, seems worthwhile
    // since swc could change their output, or users can somehow get some weird code
    if (code.includes('__vxrn__loader__')) {
      console.error(`Loader regex didn't match, this is a vxs bug, to see details use DEBUG=vxs`)
      console.info(`Using regex\n`, regexString, '\n')
      console.info(`From code`, code)
      process.exit(1)
    }
    return code
  }

  const [_a, _b, loaderName] = match

  // if minified loaderName !== loader so we re-add the export
  if (loaderName !== 'loader') {
    return `${code.replace(loaderReturnRegex, loaderReturn)}\n${
      // hacky af but ok for now, "detect" if its not exported and re-export
      code.includes('as loader') ? '' : loaderWithExport
    }`
  }

  return code.replace(loaderReturnRegex, loaderReturn)
}
