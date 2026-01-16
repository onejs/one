import { Link, type Href } from 'one'

/**
 * Homepage for docs navigation test.
 * User starts here, then navigates to /docs/page-1 via Link.
 */
export default function DocsNavTestHome() {
  return (
    <div id="docs-nav-test-home">
      <h1>Docs Navigation Test Home</h1>
      <p>Click a link below to navigate to the docs section.</p>
      <nav>
        <ul>
          <li>
            <Link href={'/docs/page-1' as Href} id="link-to-docs-page-1">
              Go to Docs Page 1
            </Link>
          </li>
          <li>
            <Link href={'/docs/page-2' as Href} id="link-to-docs-page-2">
              Go to Docs Page 2
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
