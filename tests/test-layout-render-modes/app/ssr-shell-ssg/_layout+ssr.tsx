import { Link, Slot, useMatch, useMatches } from 'one'

// SSR layout - dynamic shell (e.g., user info, personalized nav)
// content pages are SSG (pre-built)
export async function loader() {
  return {
    layoutMode: 'ssr',
    layoutData: 'ssr-shell-for-ssg',
    timestamp: Date.now(),
    random: Math.random(),
    dynamicNav: 'user-specific-content',
  }
}

export default function SsrShellSsgLayout() {
  const myMatch = useMatch('./ssr-shell-ssg/_layout+ssr.tsx')
  const data = myMatch?.loaderData as
    | {
        layoutMode: string
        layoutData: string
        timestamp: number
        random: number
        dynamicNav: string
      }
    | undefined
  const matches = useMatches()

  return (
    <div id="ssr-shell-ssg-layout">
      <header id="ssr-shell-ssg-header">
        <span id="ssr-shell-ssg-mode">Layout Mode: {data?.layoutMode}</span>
        <span id="ssr-shell-ssg-matches">Matches: {matches.length}</span>
        <span id="ssr-shell-ssg-dynamic">{data?.dynamicNav}</span>
        <span id="ssr-shell-ssg-random">Random: {data?.random}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="ssr-shell-ssg-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
