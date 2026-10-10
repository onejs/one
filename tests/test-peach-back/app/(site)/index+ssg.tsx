import { Link } from 'one'

// mirrors peach.com homepage (renamed from download+ssg → index+ssg in build).
// in prod, this IS the root `/` — the only group is (site).
export default function HomePage() {
  return (
    <div id="home-marker">
      HOME
      <Link id="link-to-docs" href="/docs/peach">
        Docs
      </Link>
    </div>
  )
}
