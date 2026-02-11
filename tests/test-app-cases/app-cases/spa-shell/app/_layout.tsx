import { useId } from 'react'
import { Slot, usePathname } from 'one'

// component using useId to validate hydration consistency
function IdCheck() {
  const id = useId()
  return (
    <span id="hydration-id" data-rid={id}>
      {id}
    </span>
  )
}

function PathDisplay() {
  const pathname = usePathname()
  return <span id="current-path">{pathname}</span>
}

function PageTitle() {
  const pathname = usePathname()
  const title = pathname === '/other' ? 'Other Page - SPA Shell' : 'SPA Shell Test'
  return <title>{title}</title>
}

export default function Layout() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <PageTitle />
      </head>
      <body>
        <nav id="root-nav">Root Nav</nav>
        <IdCheck />
        <PathDisplay />
        <Slot />
      </body>
    </html>
  )
}
