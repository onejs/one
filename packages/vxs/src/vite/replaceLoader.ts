export function replaceLoader({
  code,
  loaderData,
}: {
  code: string
  loaderData: Object
}) {
  const stringifiedData = JSON.stringify(loaderData)

  const out = (() => {
    if (!code.includes('__vxrn__loader__')) {
      return code + `\nexport const loader = () => (${stringifiedData})`
    }
    return code.replace(/["']__vxrn__loader__['"]/, stringifiedData)
  })()

  return out
}
