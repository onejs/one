import { Slot, useMatch, useMatches, usePathname } from 'one'

// root layout is always SSG - this is like the "shell" for the whole app
export async function loader() {
  return {
    rootData: 'root-layout-data',
    loadedAt: 'build-time',
  }
}

export default function RootLayout() {
  const pathname = usePathname()
  const matches = useMatches()
  const myMatch = useMatch('./_layout+ssg.tsx')
  const data = myMatch?.loaderData as { rootData: string; loadedAt: string } | undefined

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Layout Render Modes Test</title>
      </head>
      <body>
        <nav id="root-nav">
          <span id="root-nav-label">Root SSG Layout</span>
          <span id="root-pathname">{pathname}</span>
          <span id="root-matches-count">Matches: {matches.length}</span>
          {data && <span id="root-data">{JSON.stringify(data)}</span>}
        </nav>
        <main>
          <Slot />
        </main>
      </body>
    </html>
  )
}
