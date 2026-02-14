import { useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'loaders-index',
    pageLoaderRan: true,
    timestamp: Date.now(),
  }
}

export default function LoadersIndex() {
  const data = useLoader(loader)
  const matches = useMatches()

  // extract loader data from matches
  const matchesWithLoaders = matches.filter((m) => m.loaderData)

  return (
    <div id="loaders-index">
      <h1>Loader Tests</h1>
      <p id="loaders-index-data">{JSON.stringify(data)}</p>
      <p id="loaders-index-matches">Matches: {matches.length}</p>
      <p id="loaders-with-data">Matches with loader data: {matchesWithLoaders.length}</p>
      <div id="all-matches-data">
        {JSON.stringify(
          matches.map((m) => ({
            routeId: m.routeId,
            hasLoaderData: !!m.loaderData,
            loaderData: m.loaderData,
          }))
        )}
      </div>
    </div>
  )
}
