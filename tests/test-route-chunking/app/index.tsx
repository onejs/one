import { Link } from 'one'

export default function Home() {
  return (
    <div>
      <h1 id="home-title">Route Chunking</h1>
      <Link href="/posts/hello-world" id="link-canonical">
        Canonical
      </Link>
      <Link href="/mirror/hello-world" id="link-mirror">
        Mirror
      </Link>
    </div>
  )
}
