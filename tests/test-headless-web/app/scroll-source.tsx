import { Link } from 'one'

export default function ScrollSource() {
  return (
    <main data-testid="scroll-source" style={{ height: 3000 }}>
      <h1>scroll source</h1>
      <Link
        href="/scroll-target"
        data-testid="scroll-next"
        style={{ position: 'fixed', bottom: 20 }}
      >
        next page
      </Link>
      <Link
        href="/scroll-target#scroll-heading"
        data-testid="scroll-hash"
        style={{ position: 'fixed', bottom: 50 }}
      >
        page heading
      </Link>
    </main>
  )
}
