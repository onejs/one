import { Link, usePathname } from 'one'

export default function BetaSignupPage() {
  const pathname = usePathname()

  return (
    <div id="beta-signup-page">
      <h1>Beta Signup</h1>
      <span id="page-pathname">{pathname}</span>
      <Link id="link-to-home" href="/">Home</Link>
      <Link id="link-to-admin" href="/admin">Admin</Link>
    </div>
  )
}
