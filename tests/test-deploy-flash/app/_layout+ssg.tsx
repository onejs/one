import { Slot } from 'one'

// mirrors soot: root layout is +ssg so the shell is statically generated.
// multiple route groups ((app), (auth), (site)) are resolved by the root
// navigator during spa-shell hydration.
export default function RootLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>deploy-flash test</title>
      </head>
      <body>
        <div id="ssg-shell" style={{ padding: 4, background: '#111', color: '#ddd' }}>
          ssg-shell
        </div>
        <Slot />
      </body>
    </html>
  )
}
