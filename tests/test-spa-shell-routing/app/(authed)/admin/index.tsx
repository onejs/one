import { Link, usePathname } from 'one'

export default function AdminPage() {
  const pathname = usePathname()

  return (
    <div id="admin-page">
      <h1>Admin</h1>
      <span id="page-pathname">{pathname}</span>
      <Link id="link-to-home" href="/">Home</Link>
      <Link id="link-to-beta-signup" href="/beta/signup">Beta Signup</Link>
    </div>
  )
}
