import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    pageMode: 'spa',
    pageData: 'pure-spa-page',
    timestamp: Date.now(),
  }
}

export default function PureSpaPage() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="pure-spa-page">
      <h1>Pure SPA Page</h1>
      <p id="pure-spa-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="pure-spa-page-data">{JSON.stringify(data)}</p>
      <p id="pure-spa-page-matches">Page Matches: {matches.length}</p>
      <Link href="/pure-spa/other" id="link-to-other">Go to Other SPA Page</Link>
    </div>
  )
}
