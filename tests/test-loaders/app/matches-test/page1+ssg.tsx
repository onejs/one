import { useMatches, useLoader, Link } from 'one'

export async function loader() {
  return {
    pageTitle: 'Page 1',
    content: 'This is page 1 content',
    timestamp: Date.now(),
  }
}

export default function Page1() {
  const data = useLoader(loader)
  const matches = useMatches()

  // find the layout match
  const layoutMatch = matches.find((m) => m.routeId.includes('_layout'))
  const pageMatch = matches.find((m) => m.routeId.includes('page1'))

  return (
    <div>
      <h1 id="page-title">{data.pageTitle}</h1>
      <p id="page-content">{data.content}</p>
      <div id="page-matches-count">Page sees {matches.length} matches</div>
      <div id="layout-loader-data">
        Layout data: {JSON.stringify(layoutMatch?.loaderData)}
      </div>
      <div id="page-loader-data">Page data: {JSON.stringify(pageMatch?.loaderData)}</div>
      <Link href="/matches-test/page2" id="link-to-page2">
        Go to Page 2
      </Link>
    </div>
  )
}
