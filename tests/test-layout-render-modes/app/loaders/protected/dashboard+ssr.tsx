import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'protected-dashboard',
    dashboardData: {
      stats: { views: 100, clicks: 50 },
    },
  }
}

export default function ProtectedDashboard() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="protected-dashboard">
      <h2>Protected Dashboard</h2>
      <p id="protected-dashboard-data">{JSON.stringify(data)}</p>
      <p id="protected-dashboard-matches">Matches: {matches.length}</p>
      <p id="dashboard-stats">Stats: {JSON.stringify(data.dashboardData.stats)}</p>
      <Link href="/loaders/protected?auth=true" id="link-back">
        Back to Protected Index
      </Link>
    </div>
  )
}
