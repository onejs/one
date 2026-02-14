import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    pageMode: 'ssr',
    pageData: 'pure-ssr-page',
    timestamp: Date.now(),
    random: Math.random(),
  }
}

export default function PureSsrPage() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="pure-ssr-page">
      <h1>Pure SSR Page</h1>
      <p id="pure-ssr-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="pure-ssr-page-data">{JSON.stringify(data)}</p>
      <p id="pure-ssr-page-matches">Page Matches: {matches.length}</p>
      <p id="pure-ssr-page-random">Random: {data.random}</p>
      <Link href="/pure-ssr/other" id="link-to-other">Go to Other SSR Page</Link>
    </div>
  )
}
