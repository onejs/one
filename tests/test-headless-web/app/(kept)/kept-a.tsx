import { Link } from 'one'
import { useState } from 'react'

export default function KeptA() {
  const [count, setCount] = useState(0)

  return (
    <section data-testid="kept-a">
      <span data-testid="kept-a-count">{count}</span>
      <button type="button" data-testid="kept-a-inc" onClick={() => setCount(count + 1)}>
        inc
      </button>
      <Link href="/kept-b" data-testid="to-kept-b">
        b
      </Link>
    </section>
  )
}
