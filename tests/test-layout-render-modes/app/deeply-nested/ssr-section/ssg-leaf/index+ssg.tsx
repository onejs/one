import { Link, useLoader, useMatches } from 'one'

// SSG page inside SSR section
export async function loader() {
  return {
    page: 'ssg-leaf',
    mode: 'ssg',
    level: 4,
    staticContent: 'pre-built-leaf',
  }
}

export default function SsgLeafPage() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="ssg-leaf-page">
      <h3>SSG Leaf Page (L4)</h3>
      <p id="ssg-leaf-data">{JSON.stringify(data)}</p>
      <p id="ssg-leaf-matches">Matches: {matches.length}</p>
      <p id="ssg-leaf-path">Path: SSG → SSR → SSG → SSG Page</p>
      <Link href="/deeply-nested/ssr-section" id="link-back">
        Back to SSR Section
      </Link>
    </div>
  )
}
