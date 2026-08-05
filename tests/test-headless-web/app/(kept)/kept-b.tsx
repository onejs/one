import { Link } from 'one'
import { useState } from 'react'

export default function KeptB() {
  const [count, setCount] = useState(0)

  return (
    <section data-testid="kept-b">
      <span data-testid="kept-b-count">{count}</span>
      <button type="button" data-testid="kept-b-inc" onClick={() => setCount(count + 1)}>
        inc
      </button>
      <Link href="/kept-a" data-testid="to-kept-a">
        a
      </Link>
    </section>
  )
}
