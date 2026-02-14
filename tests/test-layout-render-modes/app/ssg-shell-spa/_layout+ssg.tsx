import { useId } from 'react'
import { Link, Slot, useMatch, useMatches, usePathname } from 'one'

// SSG layout - renders at build time, provides shell for SPA pages
// this is the replacement for renderRootLayout
export async function loader() {
  return {
    layoutMode: 'ssg',
    layoutData: 'ssg-shell-for-spa',
    builtAt: new Date().toISOString(),
  }
}

function IdCheck() {
  const id = useId()
  return <span id="hydration-id" data-rid={id}>{id}</span>
}

export default function SsgShellSpaLayout() {
  const myMatch = useMatch('./ssg-shell-spa/_layout+ssg.tsx')
  const data = myMatch?.loaderData as { layoutMode: string; layoutData: string; builtAt: string } | undefined
  const matches = useMatches()
  const pathname = usePathname()

  return (
    <div id="ssg-shell-spa-layout">
      <header id="ssg-shell-spa-header">
        <span id="ssg-shell-spa-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="ssg-shell-spa-matches">Matches: {matches.length}</span>
        <span id="ssg-shell-spa-path">{pathname}</span>
        <IdCheck />
        <Link href="/" id="back-home">Back Home</Link>
      </header>
      <div id="ssg-shell-spa-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
