import { Slot, useMatches } from 'one'

// layout loader - should appear in useMatches
export async function loader() {
  return {
    layoutTitle: 'Matches Test Layout',
    navItems: ['page1', 'page2'],
  }
}

export default function MatchesTestLayout() {
  const matches = useMatches()

  return (
    <div>
      <div id="layout-matches-count">Layout sees {matches.length} matches</div>
      <div id="layout-matches-data">
        {JSON.stringify(
          matches.map((m) => ({
            routeId: m.routeId,
            hasLoaderData: m.loaderData != null,
          }))
        )}
      </div>
      <nav>
        <a href="/matches-test/page1" id="nav-page1">
          Page 1
        </a>
        <a href="/matches-test/page2" id="nav-page2">
          Page 2
        </a>
      </nav>
      <Slot />
    </div>
  )
}
