import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    pageMode: 'ssg',
    pageData: 'pure-ssg-page',
    timestamp: Date.now(),
  }
}

export default function PureSsgPage() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="pure-ssg-page">
      <h1>Pure SSG Page</h1>
      <p id="pure-ssg-page-mode">Page Mode: {data?.pageMode}</p>
      <p id="pure-ssg-page-data">{JSON.stringify(data)}</p>
      <p id="pure-ssg-page-matches">Page Matches: {matches.length}</p>
      <Link href="/pure-ssg/other" id="link-to-other">Go to Other SSG Page</Link>
    </div>
  )
}
