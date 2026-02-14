import { Link, useLoader, useMatches } from 'one'

// SSR page - dynamic content, but layout is cached
export async function loader() {
  return {
    pageMode: 'ssr',
    pageData: 'ssr-page-in-ssg-shell',
    timestamp: Date.now(),
    random: Math.random(),
  }
}

export default function SsrPageInSsgShell() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="ssg-shell-ssr-page">
      <h1>SSR Page in SSG Shell</h1>
      <p id="ssg-shell-ssr-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="ssg-shell-ssr-page-data">{JSON.stringify(data)}</p>
      <p id="ssg-shell-ssr-page-matches">Page Matches: {matches.length}</p>
      <p id="ssg-shell-ssr-random">Random: {data.random}</p>
      <Link href="/ssg-shell-ssr/other" id="link-to-other">
        Go to Other SSR Page
      </Link>
    </div>
  )
}
