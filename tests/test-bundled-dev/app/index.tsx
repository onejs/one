import { useState } from 'react'

export default function Index() {
  // state + an event handler, so the assertions below can only pass if the
  // client bundle actually executed and react took over the ssr markup
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1 id="heading">bundled dev</h1>
      <button id="counter" onClick={() => setCount(count + 1)}>
        count: {count}
      </button>
    </div>
  )
}
