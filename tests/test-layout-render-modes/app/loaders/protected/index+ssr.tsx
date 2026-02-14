import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'protected-index',
    secretData: 'you-can-see-this-because-you-are-authenticated',
  }
}

export default function ProtectedIndex() {
  const data = useLoader(loader)
  const matches = useMatches()

  // verify we can access parent loader data
  const layoutMatch = matches.find((m) => m.routeId?.includes('protected/_layout'))

  return (
    <div id="protected-index">
      <h2>Protected Page</h2>
      <p id="protected-index-data">{JSON.stringify(data)}</p>
      <p id="protected-index-matches">Matches: {matches.length}</p>
      <p id="protected-secret">{data.secretData}</p>
      <p id="protected-user-from-layout">
        User from layout: {(layoutMatch?.loaderData as any)?.user || 'none'}
      </p>
      <Link href="/loaders/protected/dashboard?auth=true" id="link-dashboard">
        Dashboard
      </Link>
    </div>
  )
}
