import { useMatches } from 'one'

// page with no loader - should still work with layout loaders
export default function NoLoaderPage() {
  const matches = useMatches()

  // check if layout loader data is accessible
  const layoutMatch = matches.find((m) => m.routeId?.includes('loaders/_layout'))

  return (
    <div id="no-loader-page">
      <h1>Page Without Loader</h1>
      <p id="no-loader-matches">Matches: {matches.length}</p>
      <p id="no-loader-layout-data">
        Layout Data:{' '}
        {layoutMatch?.loaderData ? JSON.stringify(layoutMatch.loaderData) : 'none'}
      </p>
      <p id="no-loader-has-layout">
        Has Layout Loader: {layoutMatch?.loaderData ? 'yes' : 'no'}
      </p>
    </div>
  )
}
