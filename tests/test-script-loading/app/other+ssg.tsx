import { useState } from 'react'
import { Link } from 'one'

export default function OtherPage() {
  const [message, setMessage] = useState('Not clicked')

  return (
    <div style={{ padding: 20 }}>
      <h1 id="page-title">Other Page</h1>
      <p id="ssr-content">This is the other page</p>

      <div id="interactive-section">
        <p id="message-display">{message}</p>
        <button id="click-btn" onClick={() => setMessage('Clicked!')}>
          Click Me
        </button>
      </div>

      <Link href="/" id="nav-to-home">
        Go to Home Page
      </Link>
    </div>
  )
}
