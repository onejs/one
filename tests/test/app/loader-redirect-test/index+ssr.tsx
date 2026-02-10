import { Link } from 'one'

export default function LoaderRedirectHome() {
  return (
    <div style={{ padding: 20 }}>
      <p id="public-page">public page</p>

      <Link href="/loader-redirect-test/dashboard" id="link-to-dashboard">
        go to dashboard
      </Link>

      <br />

      <Link href="/loader-redirect-test/profile" id="link-to-profile">
        go to profile
      </Link>

      <br />

      <Link href="/loader-redirect-test/settings" id="link-to-settings">
        go to settings
      </Link>
    </div>
  )
}
