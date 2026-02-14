import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'ssr-section-index',
    mode: 'ssr',
    timestamp: Date.now(),
  }
}

export default function SsrSectionIndex() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="ssr-section-index">
      <h2>SSR Section Index</h2>
      <p id="ssr-section-index-data">{JSON.stringify(data)}</p>
      <p id="ssr-section-index-matches">Matches: {matches.length}</p>
      <ul>
        <li>
          <Link href="/deeply-nested/ssr-section/spa-leaf" id="link-spa-leaf">
            SPA Leaf
          </Link>
        </li>
        <li>
          <Link href="/deeply-nested/ssr-section/ssg-leaf" id="link-ssg-leaf">
            SSG Leaf
          </Link>
        </li>
        <li>
          <Link href="/deeply-nested" id="link-back">
            Back to Index
          </Link>
        </li>
      </ul>
    </div>
  )
}
