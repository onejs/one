import { Slot, usePathname } from 'one'

// root layout is SSG - this is the key to reproducing the issue:
// when defaultRenderMode is 'spa' but root layout is +ssg,
// the spa-shell mode kicks in and routing can break

export default function RootLayout() {
  const pathname = usePathname()

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>SPA Shell Routing Test</title>
      </head>
      <body>
        <nav id="root-nav">
          <span id="root-label">Root SSG Layout</span>
          <span id="root-pathname">{pathname}</span>
        </nav>
        <main>
          <Slot />
        </main>
      </body>
    </html>
  )
}
