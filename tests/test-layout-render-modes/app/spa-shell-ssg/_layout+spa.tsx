import { Link, Slot, useMatch, useMatches } from 'one'

// SPA layout - renders empty/placeholder on server
// but inner SSG content should still be visible for SEO
// hydration mismatch is acceptable here
export async function loader() {
  return {
    layoutMode: 'spa',
    layoutData: 'spa-shell-for-ssg',
    clientOnly: true,
  }
}

export default function SpaShellSsgLayout() {
  const myMatch = useMatch('./spa-shell-ssg/_layout+spa.tsx')
  const data = myMatch?.loaderData as { layoutMode: string; layoutData: string; clientOnly: boolean } | undefined
  const matches = useMatches()

  return (
    <div id="spa-shell-ssg-layout">
      <header id="spa-shell-ssg-header">
        <span id="spa-shell-ssg-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="spa-shell-ssg-matches">Matches: {matches.length}</span>
        <span id="spa-shell-ssg-client">{data?.clientOnly ? 'client-only' : 'server'}</span>
        <Link href="/" id="back-home">Back Home</Link>
      </header>
      <div id="spa-shell-ssg-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
