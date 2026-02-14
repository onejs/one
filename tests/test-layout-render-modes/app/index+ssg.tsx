import { Link, useLoader } from 'one'

export async function loader() {
  return { page: 'home', mode: 'ssg' }
}

export default function Home() {
  const data = useLoader(loader)

  return (
    <div id="home-content">
      <h1>Layout Render Modes Test</h1>
      <p id="home-data">{JSON.stringify(data)}</p>

      <h2>Test Scenarios</h2>
      <ul>
        <li>
          <Link href="/pure-ssg" id="link-pure-ssg">
            Pure SSG
          </Link>
        </li>
        <li>
          <Link href="/pure-ssr" id="link-pure-ssr">
            Pure SSR
          </Link>
        </li>
        <li>
          <Link href="/pure-spa" id="link-pure-spa">
            Pure SPA
          </Link>
        </li>
        <li>
          <Link href="/ssg-shell-spa" id="link-ssg-shell-spa">
            SSG Shell + SPA Content
          </Link>
        </li>
        <li>
          <Link href="/ssg-shell-ssr" id="link-ssg-shell-ssr">
            SSG Shell + SSR Content
          </Link>
        </li>
        <li>
          <Link href="/ssr-shell-ssg" id="link-ssr-shell-ssg">
            SSR Shell + SSG Content
          </Link>
        </li>
        <li>
          <Link href="/ssr-shell-spa" id="link-ssr-shell-spa">
            SSR Shell + SPA Content
          </Link>
        </li>
        <li>
          <Link href="/spa-shell-ssg" id="link-spa-shell-ssg">
            SPA Shell + SSG Content (weird)
          </Link>
        </li>
        <li>
          <Link href="/deeply-nested" id="link-deeply-nested">
            Deeply Nested
          </Link>
        </li>
        <li>
          <Link href="/loaders" id="link-loaders">
            Loader Tests
          </Link>
        </li>
      </ul>
    </div>
  )
}
