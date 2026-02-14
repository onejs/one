import { Link, Slot, useMatch, useMatches } from 'one'

// Level 2: SSR layout (propagates up - makes whole route SSR)
export async function loader() {
  return {
    level: 2,
    layoutMode: 'ssr',
    name: 'Level 2 SSR Layout',
    timestamp: Date.now(),
    random: Math.random(),
  }
}

export default function Level2SsrLayout() {
  const myMatch = useMatch('./deeply-nested/ssr-section/_layout+ssr.tsx')
  const data = myMatch?.loaderData as
    | {
        level: number
        layoutMode: string
        name: string
        timestamp: number
        random: number
      }
    | undefined
  const matches = useMatches()

  return (
    <div id="deeply-nested-l2" data-level="2" data-mode="ssr">
      <header id="deeply-nested-l2-header">
        <span id="l2-mode">L2: {data?.layoutMode}</span>
        <span id="l2-matches">Matches: {matches.length}</span>
        <span id="l2-random">Random: {data?.random}</span>
      </header>
      <div id="l2-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
