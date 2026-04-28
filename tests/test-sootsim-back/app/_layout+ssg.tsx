import { Slot } from 'one'

// mirrors soot: root layout is +ssg so the shell is statically generated.
// only (site) group — (app) and (auth) stripped in sootsim.com build.
export default function RootLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>sootsim back test</title>
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
