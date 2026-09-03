import { getRouteExportsFromEntry } from '../server/routeExportsFromEntry'
import { toAbsoluteUrl } from '../utils/toAbsolute'

// entry evaluation is expensive and every page in a build shares it
const serverEntries = new Map<string, Promise<any>>()

function loadServerEntry(serverEntry: string) {
  let loading = serverEntries.get(serverEntry)
  if (!loading) {
    loading = import(toAbsoluteUrl(serverEntry))
    serverEntries.set(serverEntry, loading)
  }
  return loading
}

export async function getRouteExports(
  serverEntry: string,
  routerRoot: string,
  routeFile: string
): Promise<Record<string, any>> {
  const entry = await loadServerEntry(serverEntry)
  const exported = await getRouteExportsFromEntry(entry, routerRoot, routeFile)

  if (!exported) {
    const routes = entry?.default?.options?.routes ?? entry?.default?.default?.options?.routes
    throw new Error(
      `[one] route ${routeFile} is missing from the built server entry route map (looked in: ${Object.keys(routes ?? {}).join(', ')})`
    )
  }

  return exported
}
