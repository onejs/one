import { Slot } from 'one'

export default function Layout() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Unified Build Test</title>
      </head>
      <body>
        <Slot />
      </body>
    </html>
  )
}
