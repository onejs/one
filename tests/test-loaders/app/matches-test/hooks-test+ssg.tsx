import { useMatches, useMatch, usePageMatch, useLoader, Link } from 'one'

export async function loader() {
  return {
    pageTitle: 'Hooks Test Page',
    content: 'Testing useMatch and usePageMatch hooks',
    timestamp: Date.now(),
  }
}

export default function HooksTestPage() {
  const data = useLoader(loader)
  const matches = useMatches()

  // useMatch with specific routeId
  const layoutMatch = useMatch('./matches-test/_layout.tsx')
  const pageMatch = usePageMatch()

  // test invalid routeId
  const invalidMatch = useMatch('./nonexistent/_layout.tsx')

  return (
    <div>
      <h1 id="hooks-page-title">{data.pageTitle}</h1>

      {/* useMatches */}
      <div data-testid="matches-count">Matches: {matches.length}</div>
      <div data-testid="all-matches">{JSON.stringify(matches)}</div>

      {/* useMatch with valid routeId */}
      <div data-testid="layout-match-found">
        Layout match found: {layoutMatch ? 'yes' : 'no'}
      </div>
      <div data-testid="layout-match-data">
        Layout data: {JSON.stringify(layoutMatch?.loaderData)}
      </div>
      <div data-testid="layout-match-routeid">
        Layout routeId: {layoutMatch?.routeId || 'none'}
      </div>

      {/* useMatch with invalid routeId */}
      <div data-testid="invalid-match-found">
        Invalid match found: {invalidMatch ? 'yes' : 'no'}
      </div>

      {/* usePageMatch */}
      <div data-testid="page-match-found">
        Page match found: {pageMatch ? 'yes' : 'no'}
      </div>
      <div data-testid="page-match-data">
        Page match data: {JSON.stringify(pageMatch?.loaderData)}
      </div>
      <div data-testid="page-match-routeid">
        Page match routeId: {pageMatch?.routeId || 'none'}
      </div>
      <div data-testid="page-match-params">
        Page match params: {JSON.stringify(pageMatch?.params)}
      </div>

      <Link href="/matches-test/page1" id="link-to-page1">
        Go to Page 1
      </Link>
    </div>
  )
}
