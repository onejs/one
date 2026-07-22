import * as React from 'react'
import { usePathname, useRouter } from '../hooks'
import { Link } from '../link/Link'

function NoSSR({ children }: { children: React.ReactNode }) {
  const [render, setRender] = React.useState(false)

  React.useEffect(() => {
    setRender(true)
  }, [])

  return render ? <>{children}</> : null
}

function CurrentURL() {
  return <>{window.location.href}</>
}

export function Unmatched() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <main
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        color: 'white',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 36,
          paddingBottom: 12,
          margin: '0 0 12px',
          borderBottom: '1px solid #323232',
        }}
      >
        Unmatched Route
      </h1>
      <p style={{ fontSize: 18, margin: '0 0 12px' }}>
        Page could not be found.{' '}
        <button
          type="button"
          onClick={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/')
            }
          }}
          style={{
            appearance: 'none',
            border: 0,
            padding: 0,
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            font: 'inherit',
            textDecoration: 'underline',
          }}
        >
          Go back.
        </button>
      </p>
      <NoSSR>
        <Link
          href={pathname}
          replace
          style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}
        >
          <CurrentURL />
        </Link>
      </NoSSR>
      <Link
        href="/_sitemap"
        replace
        style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center' }}
      >
        Sitemap
      </Link>
    </main>
  )
}
