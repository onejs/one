import { Link, Slot, usePathname } from 'one'

export default function AuthLayout() {
  const pathname = usePathname()

  return (
    <div>
      <nav
        id="three-punch-nav"
        data-pathname={pathname}
        style={{ display: 'flex', gap: 16, marginBottom: 16 }}
      >
        <Link asChild href="/forum">
          <a id="nav-forum">FORUM</a>
        </Link>
        <Link asChild href="/forum/rankings">
          <a id="nav-rankings">RANKINGS</a>
        </Link>
        <Link asChild href="/picks">
          <a id="nav-picks">FIGHT PICKS</a>
        </Link>
      </nav>
      <Slot />
    </div>
  )
}
