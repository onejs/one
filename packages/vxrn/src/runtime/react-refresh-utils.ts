export function isReactRefreshBoundary(moduleExports: Record<string, unknown>) {
  if (globalThis.__ReactRefresh.isLikelyComponentType(moduleExports)) {
    return true
  }

  if (
    moduleExports === undefined ||
    moduleExports === null ||
    typeof moduleExports !== 'object'
  ) {
    return false
  }

  var hasExports = false
  var areAllExportsComponents = true
  for (var key in moduleExports) {
    hasExports = true
    if (key === '__esModule') continue
    var exportValue = moduleExports[key]
    if (!globalThis.__ReactRefresh.isLikelyComponentType(exportValue)) {
      areAllExportsComponents = false
    }
  }

  return hasExports && areAllExportsComponents
}

let timer: ReturnType<typeof setTimeout> | null = null

export function enqueueUpdate() {
  if (timer) return
  timer = setTimeout(() => {
    globalThis.__ReactRefresh.performReactRefresh()
    timer = null
  }, 50)
}
