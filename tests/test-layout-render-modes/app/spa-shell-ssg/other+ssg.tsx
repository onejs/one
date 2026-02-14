import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'ssg',
    pageData: 'ssg-other-in-spa-shell',
    seoContent: 'other-page-seo-content',
  }
}

export default function OtherSsgInSpaShell() {
  const data = useLoader(loader)

  return (
    <div id="spa-shell-ssg-other">
      <h1>Other SSG Page in SPA Shell</h1>
      <p id="spa-shell-ssg-other-data">{JSON.stringify(data)}</p>
      <p id="spa-shell-ssg-other-seo">{data.seoContent}</p>
      <Link href="/spa-shell-ssg" id="link-back">
        Back to Index
      </Link>
    </div>
  )
}
