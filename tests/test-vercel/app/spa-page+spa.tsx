import { useState } from 'react'
import { Link, useLoader } from 'one'

export function loader() {
  return {
    message: 'Hello from SPA loader!',
    timestamp: Date.now(),
  }
}

export default function SPAPage() {
  const data = useLoader(loader)
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1 id="spa-title">SPA Page</h1>
      <p id="render-mode">Mode: SPA</p>
      <p id="loader-message">{data?.message || 'Loading...'}</p>
      <p id="loader-timestamp">Timestamp: {data?.timestamp || 'Loading...'}</p>

      <div>
        <p id="counter">Count: {count}</p>
        <button id="increment-btn" onClick={() => setCount((c) => c + 1)}>
          Increment
        </button>
      </div>

      <Link href="/" id="link-home">
        Back to Home
      </Link>
    </div>
  )
}
