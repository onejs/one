import { Link, Slot, useMatch, useMatches } from 'one'

export async function loader() {
  return {
    layoutMode: 'ssr',
    layoutData: 'pure-ssr-layout',
    timestamp: Date.now(),
    random: Math.random(),
  }
}

export default function PureSsrLayout() {
  const myMatch = useMatch('./pure-ssr/_layout+ssr.tsx')
  const data = myMatch?.loaderData as
    | { layoutMode: string; layoutData: string; timestamp: number; random: number }
    | undefined
  const matches = useMatches()

  return (
    <div id="pure-ssr-layout">
      <header id="pure-ssr-header">
        <span id="pure-ssr-layout-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="pure-ssr-matches">Matches: {matches.length}</span>
        <span id="pure-ssr-random">Random: {data?.random}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="pure-ssr-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
