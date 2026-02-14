import { Slot, useMatch, useMatches } from 'one'

// Level 3: SSG layout inside SSR section
// this content can be pre-built even though outer is SSR
export async function loader() {
  return {
    level: 3,
    layoutMode: 'ssg',
    name: 'Level 3 SSG Layout',
    prebuilt: true,
  }
}

export default function Level3SsgLayout() {
  const myMatch = useMatch('./deeply-nested/ssr-section/ssg-leaf/_layout+ssg.tsx')
  const data = myMatch?.loaderData as { level: number; layoutMode: string; name: string; prebuilt: boolean } | undefined
  const matches = useMatches()

  return (
    <div id="deeply-nested-l3-ssg" data-level="3" data-mode="ssg">
      <header id="deeply-nested-l3-ssg-header">
        <span id="l3-ssg-mode">L3: {data?.layoutMode}</span>
        <span id="l3-ssg-matches">Matches: {matches.length}</span>
      </header>
      <div id="l3-ssg-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
