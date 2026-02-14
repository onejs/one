import { Link, Slot, useMatch, useMatches } from 'one'

export async function loader() {
  return {
    section: 'loaders',
    layoutMode: 'ssg',
    layoutLoaderRan: true,
  }
}

export default function LoadersLayout() {
  const myMatch = useMatch('./loaders/_layout+ssg.tsx')
  const data = myMatch?.loaderData as
    | { section: string; layoutMode: string; layoutLoaderRan: boolean }
    | undefined
  const matches = useMatches()

  return (
    <div id="loaders-layout">
      <header id="loaders-header">
        <span id="loaders-section">Section: {data?.section}</span>
        <span id="loaders-matches">Matches: {matches.length}</span>
        <Link href="/" id="back-home">
          Back Home
        </Link>
      </header>
      <div id="loaders-layout-data">{JSON.stringify(data)}</div>
      <nav>
        <Link href="/loaders" id="link-loader-index">
          Index
        </Link>
        <Link href="/loaders/no-loader" id="link-no-loader">
          No Loader
        </Link>
        <Link href="/loaders/nested" id="link-nested">
          Nested
        </Link>
        <Link href="/loaders/protected" id="link-protected">
          Protected
        </Link>
      </nav>
      <Slot />
    </div>
  )
}
