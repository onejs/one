import { redirect, Slot, useMatch, useMatches } from 'one'

// protected layout - redirects if not authenticated
// this tests loader-based protection patterns
export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const isAuthenticated = url.searchParams.get('auth') === 'true'

  if (!isAuthenticated) {
    // redirect to login page
    throw redirect('/loaders?redirected=protected')
  }

  return {
    protectedLayoutMode: 'ssr',
    isAuthenticated: true,
    user: 'test-user',
  }
}

export default function ProtectedLayout() {
  const myMatch = useMatch('./loaders/protected/_layout+ssr.tsx')
  const data = myMatch?.loaderData as { protectedLayoutMode: string; isAuthenticated: boolean; user: string } | undefined
  const matches = useMatches()

  return (
    <div id="protected-layout" data-auth={data?.isAuthenticated}>
      <header id="protected-header">
        <span id="protected-user">User: {data?.user}</span>
        <span id="protected-matches">Matches: {matches.length}</span>
      </header>
      <div id="protected-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
