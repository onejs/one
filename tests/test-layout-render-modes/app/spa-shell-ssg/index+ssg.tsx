import { Link, useLoader, useMatches } from 'one'

// SSG page - pre-built content
// this content should be visible in initial HTML for SEO
// even though the outer layout is SPA
export async function loader() {
  return {
    pageMode: 'ssg',
    pageData: 'ssg-page-in-spa-shell',
    seoContent: 'this-should-be-visible-for-crawlers',
  }
}

export default function SsgPageInSpaShell() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="spa-shell-ssg-page">
      <h1>SSG Page in SPA Shell (The Weird Case)</h1>
      <p id="spa-shell-ssg-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="spa-shell-ssg-page-data">{JSON.stringify(data)}</p>
      <p id="spa-shell-ssg-page-matches">Page Matches: {matches.length}</p>
      <p id="spa-shell-ssg-seo">{data.seoContent}</p>
      <Link href="/spa-shell-ssg/other" id="link-to-other">
        Go to Other SSG Page
      </Link>
    </div>
  )
}
