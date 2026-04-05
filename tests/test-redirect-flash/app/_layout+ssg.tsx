import { Slot } from 'one'

// mirrors soot: root layout is +ssg so the shell is statically generated.
// the (app)/_layout.tsx below hydrates on top of this, which is the context
// in which the redirect-flash bug surfaces.
export default function RootLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>redirect-flash test</title>
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
