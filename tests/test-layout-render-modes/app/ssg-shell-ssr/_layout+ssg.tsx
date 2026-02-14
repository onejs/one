import { Link, Slot, useMatch, useMatches } from 'one'

// SSG layout - can be cached/pre-built
// even though pages are SSR, this layout content is static
export async function loader() {
  return {
    layoutMode: 'ssg',
    layoutData: 'ssg-shell-for-ssr',
    staticContent: 'this-is-pre-built',
  }
}

export default function SsgShellSsrLayout() {
  const myMatch = useMatch('./ssg-shell-ssr/_layout+ssg.tsx')
  const data = myMatch?.loaderData as
    | { layoutMode: string; layoutData: string; staticContent: string }
    | undefined
  const matches = useMatches()

  return (
    <div id="ssg-shell-ssr-layout">
      <header id="ssg-shell-ssr-header">
        <span id="ssg-shell-ssr-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="ssg-shell-ssr-matches">Matches: {matches.length}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="ssg-shell-ssr-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
