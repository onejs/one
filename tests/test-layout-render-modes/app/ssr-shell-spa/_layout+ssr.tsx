import { Link, Slot, useMatch, useMatches } from 'one'

// SSR layout - dynamic shell rendered per-request
// content is SPA (client-only)
export async function loader() {
  return {
    layoutMode: 'ssr',
    layoutData: 'ssr-shell-for-spa',
    timestamp: Date.now(),
    serverData: 'rendered-on-server',
  }
}

export default function SsrShellSpaLayout() {
  const myMatch = useMatch('./ssr-shell-spa/_layout+ssr.tsx')
  const data = myMatch?.loaderData as
    | { layoutMode: string; layoutData: string; timestamp: number; serverData: string }
    | undefined
  const matches = useMatches()

  return (
    <div id="ssr-shell-spa-layout">
      <header id="ssr-shell-spa-header">
        <span id="ssr-shell-spa-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="ssr-shell-spa-matches">Matches: {matches.length}</span>
        <span id="ssr-shell-spa-server">{data?.serverData}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="ssr-shell-spa-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
