import { Slot } from 'one'

// mirrors contrast: root layout is +ssg so the shell is statically generated.
// child routes hydrate on top of this spa-default tree.
export default function RootLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>params-stability test</title>
      </head>
      <body>
        <Slot />
      </body>
    </html>
  )
}
