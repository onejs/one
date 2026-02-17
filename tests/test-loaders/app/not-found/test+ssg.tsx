import { Link } from 'one'

export default function NotFoundTestIndex() {
  return (
    <div>
      <h1 id="nf-test-title">Not Found Tests</h1>
      <ul>
        <li>
          <Link href="/not-found/deep/valid-item" id="link-valid-deep">
            Valid deep item
          </Link>
        </li>
        <li>
          <Link href="/not-found/deep/missing-item" id="link-missing-deep">
            Missing deep item (has nested +not-found)
          </Link>
        </li>
        <li>
          <Link href="/not-found/fallback/valid-entry" id="link-valid-fallback">
            Valid fallback item
          </Link>
        </li>
        <li>
          <Link href="/not-found/fallback/missing-entry" id="link-missing-fallback">
            Missing fallback item (no nested +not-found, falls back to root)
          </Link>
        </li>
        <li>
          <Link href="/posts/missing-post" id="link-missing-post">
            Missing post (no +not-found at all)
          </Link>
        </li>
      </ul>
    </div>
  )
}
