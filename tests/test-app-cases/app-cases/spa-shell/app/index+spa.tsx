import { Link } from 'one'

export default function Home() {
  return (
    <div id="spa-content">
      SPA Page Content
      <Link href="/other" id="link-to-other">
        Go to Other
      </Link>
    </div>
  )
}
