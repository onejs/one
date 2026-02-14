import { Link, Slot, useMatch, useMatches } from 'one'

export async function loader() {
  return {
    layoutMode: 'spa',
    layoutData: 'pure-spa-layout',
    timestamp: Date.now(),
  }
}

export default function PureSpaLayout() {
  const myMatch = useMatch('./pure-spa/_layout+spa.tsx')
  const data = myMatch?.loaderData as { layoutMode: string; layoutData: string; timestamp: number } | undefined
  const matches = useMatches()

  return (
    <div id="pure-spa-layout">
      <header id="pure-spa-header">
        <span id="pure-spa-layout-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="pure-spa-matches">Matches: {matches.length}</span>
        <Link href="/" id="back-home">Back Home</Link>
      </header>
      <div id="pure-spa-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
