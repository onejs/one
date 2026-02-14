import { Link, useLoader, useMatches } from 'one'

// SPA page - client-only content, but layout is SSR
export async function loader() {
  return {
    pageMode: 'spa',
    pageData: 'spa-page-in-ssr-shell',
    clientLoaded: Date.now(),
  }
}

export default function SpaPageInSsrShell() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="ssr-shell-spa-page">
      <h1>SPA Page in SSR Shell</h1>
      <p id="ssr-shell-spa-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="ssr-shell-spa-page-data">{JSON.stringify(data)}</p>
      <p id="ssr-shell-spa-page-matches">Page Matches: {matches.length}</p>
      <Link href="/ssr-shell-spa/other" id="link-to-other">
        Go to Other SPA Page
      </Link>
    </div>
  )
}
