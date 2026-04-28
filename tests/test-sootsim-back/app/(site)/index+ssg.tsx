import { Link } from 'one'

// mirrors sootsim.com homepage (renamed from download+ssg → index+ssg in build).
// in prod, this IS the root `/` — the only group is (site).
export default function HomePage() {
  return (
    <div id="home-marker">
      HOME
      <Link id="link-to-docs" href="/docs/sootsim">
        Docs
      </Link>
    </div>
  )
}
