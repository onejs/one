import { Link, Slot, useMatch, useMatches } from 'one'

// Level 1: SSG layout
export async function loader() {
  return {
    level: 1,
    layoutMode: 'ssg',
    name: 'Level 1 SSG Layout',
  }
}

export default function Level1SsgLayout() {
  const myMatch = useMatch('./deeply-nested/_layout+ssg.tsx')
  const data = myMatch?.loaderData as
    | { level: number; layoutMode: string; name: string }
    | undefined
  const matches = useMatches()

  return (
    <div id="deeply-nested-l1" data-level="1" data-mode="ssg">
      <header id="deeply-nested-l1-header">
        <span id="l1-mode">L1: {data?.layoutMode}</span>
        <span id="l1-matches">Matches: {matches.length}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="l1-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
