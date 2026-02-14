import { Link, useLoader, useMatches } from 'one'

// SPA page - renders on client, but layout shell is SSG
export async function loader() {
  return {
    pageMode: 'spa',
    pageData: 'spa-page-in-ssg-shell',
    loadedAt: Date.now(),
  }
}

export default function SpaPageInSsgShell() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="ssg-shell-spa-page">
      <h1>SPA Page in SSG Shell</h1>
      <p id="ssg-shell-spa-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="ssg-shell-spa-page-data">{JSON.stringify(data)}</p>
      <p id="ssg-shell-spa-page-matches">Page Matches: {matches.length}</p>
      <Link href="/ssg-shell-spa/other" id="link-to-other">Go to Other SPA Page</Link>
    </div>
  )
}
