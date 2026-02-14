import { Link, useLoader, useMatches } from 'one'

// SSG page - pre-built content, but layout is dynamic
export async function loader() {
  return {
    pageMode: 'ssg',
    pageData: 'ssg-page-in-ssr-shell',
    staticContent: 'pre-built-at-build-time',
  }
}

export default function SsgPageInSsrShell() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="ssr-shell-ssg-page">
      <h1>SSG Page in SSR Shell</h1>
      <p id="ssr-shell-ssg-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="ssr-shell-ssg-page-data">{JSON.stringify(data)}</p>
      <p id="ssr-shell-ssg-page-matches">Page Matches: {matches.length}</p>
      <Link href="/ssr-shell-ssg/other" id="link-to-other">
        Go to Other SSG Page
      </Link>
    </div>
  )
}
