import { useMatches, useLoader, usePageMatch, Link } from 'one'

export async function loader() {
  return {
    title: 'SPA Page',
    routeType: 'spa',
    timestamp: Date.now(),
  }
}

export default function SpaPage() {
  const data = useLoader(loader)
  const matches = useMatches()
  const pageMatch = usePageMatch()

  return (
    <div>
      <h1 id="page-title">{data.title}</h1>
      <div id="route-type">Route type: {data.routeType}</div>
      <div id="matches-count">Matches: {matches.length}</div>
      <div id="page-match-routeid">Page routeId: {pageMatch?.routeId || 'none'}</div>
      <div id="page-loader-data">Loader: {JSON.stringify(data)}</div>
      <div id="all-matches">{JSON.stringify(matches)}</div>

      <nav>
        <Link href="/matches-test/page1" id="link-to-ssg">
          Go to SSG page
        </Link>
        <Link href="/matches-test/ssr-page" id="link-to-ssr">
          Go to SSR page
        </Link>
      </nav>
    </div>
  )
}
