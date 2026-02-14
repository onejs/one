import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'deeply-nested-index',
    mode: 'ssg',
  }
}

export default function DeeplyNestedIndex() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="deeply-nested-index">
      <h1>Deeply Nested Test</h1>
      <p id="deeply-nested-index-data">{JSON.stringify(data)}</p>
      <p id="deeply-nested-index-matches">Matches: {matches.length}</p>
      <ul>
        <li>
          <Link href="/deeply-nested/ssr-section" id="link-ssr-section">
            SSR Section
          </Link>
        </li>
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
      </ul>
    </div>
  )
}
