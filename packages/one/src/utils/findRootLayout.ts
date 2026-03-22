// find root layout in routes regardless of render mode suffix (+ssg, +ssr, +spa)
// the glob keys include the suffix (e.g., /app/_layout+ssg.tsx) but we need to
// match any root layout variant to ensure it's preloaded before rendering
export function findRootLayout(
  routes: Record<string, () => Promise<unknown>>,
  routerRoot: string
): Promise<unknown> | undefined {
  const exactKey = `/${routerRoot}/_layout.tsx`
  if (routes[exactKey]) return routes[exactKey]()

  for (const suffix of ['+ssg', '+ssr', '+spa']) {
    const key = `/${routerRoot}/_layout${suffix}.tsx`
    if (routes[key]) return routes[key]()
  }

  const exactKeyTs = `/${routerRoot}/_layout.ts`
  if (routes[exactKeyTs]) return routes[exactKeyTs]()

  for (const suffix of ['+ssg', '+ssr', '+spa']) {
    const key = `/${routerRoot}/_layout${suffix}.ts`
    if (routes[key]) return routes[key]()
  }

  return undefined
}
