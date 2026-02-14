import { Slot, useMatch, useMatches } from 'one'

// Level 3: SPA layout inside SSR section
export async function loader() {
  return {
    level: 3,
    layoutMode: 'spa',
    name: 'Level 3 SPA Layout',
    clientOnly: true,
  }
}

export default function Level3SpaLayout() {
  const myMatch = useMatch('./deeply-nested/ssr-section/spa-leaf/_layout+spa.tsx')
  const data = myMatch?.loaderData as
    | { level: number; layoutMode: string; name: string; clientOnly: boolean }
    | undefined
  const matches = useMatches()

  return (
    <div id="deeply-nested-l3" data-level="3" data-mode="spa">
      <header id="deeply-nested-l3-header">
        <span id="l3-mode">L3: {data?.layoutMode}</span>
        <span id="l3-matches">Matches: {matches.length}</span>
      </header>
      <div id="l3-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
