import { Link } from 'one'

export default function HomePage() {
  return (
    <div id="home-page">
      <h1>Home Page</h1>
      <nav>
        <Link id="link-to-about" href="/about">About</Link>
        <Link id="link-to-beta-signup" href="/beta/signup">Beta Signup</Link>
        <Link id="link-to-admin" href="/admin">Admin</Link>
        <Link id="link-to-dashboard" href="/dashboard/test-app">Dashboard</Link>
      </nav>
    </div>
  )
}
