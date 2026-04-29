import { Link, Slot } from 'one'

export default function AuthLayout() {
  return (
    <div id="auth-layout">
      <nav id="app-header">
        <Link id="nav-forum" href="/forum">
          FORUM
        </Link>
        <Link id="nav-rankings" href="/forum/rankings">
          RANKINGS
        </Link>
        <Link id="nav-picks" href="/picks">
          FIGHT PICKS
        </Link>
      </nav>
      <Slot />
    </div>
  )
}
