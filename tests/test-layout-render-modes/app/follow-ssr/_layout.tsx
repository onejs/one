import { Link, Slot, useMatch, useMatches } from 'one'

// layout with NO render mode suffix - should "follow" the route's render mode
// when child is +ssr, this layout's loader should run per-request (SSR behavior)
export async function loader() {
  return {
    layoutData: 'follow-ssr-layout',
    timestamp: Date.now(),
    random: Math.random(),
  }
}

export default function FollowSsrLayout() {
  const myMatch = useMatch('./follow-ssr/_layout.tsx')
  const data = myMatch?.loaderData as
    | { layoutData: string; timestamp: number; random: number }
    | undefined
  const matches = useMatches()

  return (
    <div id="follow-ssr-layout">
      <header>
        <span id="follow-ssr-layout-data">{JSON.stringify(data)}</span>
        <span id="follow-ssr-layout-random">{data?.random}</span>
        <span id="follow-ssr-matches">Matches: {matches.length}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <Slot />
    </div>
  )
}
