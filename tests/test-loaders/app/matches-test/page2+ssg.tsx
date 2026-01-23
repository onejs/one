import { useMatches, useLoader, Link } from 'one'

export async function loader() {
  return {
    pageTitle: 'Page 2',
    content: 'This is page 2 content',
    timestamp: Date.now(),
  }
}

export default function Page2() {
  const data = useLoader(loader)
  const matches = useMatches()

  // find the layout match
  const layoutMatch = matches.find((m) => m.routeId.includes('_layout'))
  const pageMatch = matches.find((m) => m.routeId.includes('page2'))

  return (
    <div>
      <h1 id="page-title">{data.pageTitle}</h1>
      <p id="page-content">{data.content}</p>
      <div id="page-matches-count">Page sees {matches.length} matches</div>
      <div id="layout-loader-data">
        Layout data: {JSON.stringify(layoutMatch?.loaderData)}
      </div>
      <div id="page-loader-data">Page data: {JSON.stringify(pageMatch?.loaderData)}</div>
      <Link href="/matches-test/page1" id="link-to-page1">
        Go to Page 1
      </Link>
    </div>
  )
}
