import { Link, Slot, useMatch, useMatches } from 'one'

export async function loader() {
  return {
    layoutMode: 'ssg',
    layoutData: 'pure-ssg-layout',
    timestamp: Date.now(),
  }
}

export default function PureSsgLayout() {
  const matches = useMatches()
  const myMatch = useMatch('./pure-ssg/_layout+ssg.tsx')
  const data = myMatch?.loaderData as
    | { layoutMode: string; layoutData: string; timestamp: number }
    | undefined

  return (
    <div id="pure-ssg-layout">
      <header id="pure-ssg-header">
        <span id="pure-ssg-layout-mode">
          Layout Mode: {data?.layoutMode || 'loading'}
        </span>
        <span id="pure-ssg-matches">Matches: {matches.length}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="pure-ssg-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
