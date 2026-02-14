import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'nested-index',
    pageLoaderRan: true,
    timestamp: Date.now(),
  }
}

export default function NestedIndex() {
  const data = useLoader(loader)
  const matches = useMatches()

  // find all loaders from matches
  const loadersFromMatches = matches
    .filter(m => m.loaderData)
    .map(m => ({
      routeId: m.routeId,
      data: m.loaderData,
    }))

  return (
    <div id="nested-index">
      <h2>Nested SSR Page</h2>
      <p id="nested-index-data">{JSON.stringify(data)}</p>
      <p id="nested-index-matches">Matches: {matches.length}</p>
      <p id="nested-loaders-count">Loaders from matches: {loadersFromMatches.length}</p>
      <div id="nested-all-loaders">{JSON.stringify(loadersFromMatches)}</div>
      <Link href="/loaders/nested/other" id="link-to-other">Go to Other Nested Page</Link>
    </div>
  )
}
