import { use } from 'react'
import { Link } from 'one'

export default function ScrollTarget() {
  if (typeof window !== 'undefined' && (window as any).__scrollRouteGate) {
    use((window as any).__scrollRouteGate)
  }
  return (
    <main data-testid="scroll-target" style={{ height: 3000 }}>
      <h1>scroll target</h1>
      <div style={{ height: 1000 }} />
      <h2 id="scroll-heading">target heading</h2>
      <Link
        href="/scroll-source"
        data-testid="scroll-back"
        style={{ position: 'fixed', bottom: 20 }}
      >
        previous page
      </Link>
    </main>
  )
}
