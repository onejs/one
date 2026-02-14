import { Link, useLoader, useMatches } from 'one'

// SPA page at the deepest level
export async function loader() {
  return {
    page: 'spa-leaf',
    mode: 'spa',
    level: 4,
    clientLoaded: Date.now(),
  }
}

export default function SpaLeafPage() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="spa-leaf-page">
      <h3>SPA Leaf Page (L4)</h3>
      <p id="spa-leaf-data">{JSON.stringify(data)}</p>
      <p id="spa-leaf-matches">Matches: {matches.length}</p>
      <p id="spa-leaf-path">Path: SSG → SSR → SPA → SPA Page</p>
      <Link href="/deeply-nested/ssr-section" id="link-back">Back to SSR Section</Link>
    </div>
  )
}
