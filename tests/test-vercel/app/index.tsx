import { Link } from 'one'

export function loader() {
  return {
    message: 'Hello from SSG loader!',
    timestamp: Date.now(),
  }
}

export default function Home() {
  return (
    <div>
      <h1 id="home-title">One Test Home</h1>
      <p id="render-mode">Mode: SSG (default)</p>

      <nav>
        <ul>
          <li>
            <Link href="/ssr-page" id="link-ssr">
              SSR Page
            </Link>
          </li>
          <li>
            <Link href="/spa-page" id="link-spa">
              SPA Page
            </Link>
          </li>
          <li>
            <Link href="/api-test" id="link-api-test">
              API Test
            </Link>
          </li>
          <li>
            <Link href="/dynamic/123" id="link-dynamic">
              Dynamic Route
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
