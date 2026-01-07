import { useState } from "react";
import { Link } from "one";

export default function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 20 }}>
      <h1 id="page-title">Home Page</h1>
      <p id="ssr-content">This content is server-rendered</p>

      <div id="interactive-section">
        <p id="count-display">Count: {count}</p>
        <button id="increment-btn" onClick={() => setCount((c) => c + 1)}>
          Increment
        </button>
      </div>

      <Link href="/other" id="nav-to-other">
        Go to Other Page
      </Link>
    </div>
  );
}
