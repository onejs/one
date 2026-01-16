/**
 * Second docs page - SSG rendered
 *
 * BUG: Navigating here from page-1 via Link causes the docs layout to remount!
 */
export default function DocsPage2() {
  return (
    <div id="docs-page-2-root">
      <h1>Docs Page 2</h1>
      <p id="docs-page-2-marker">Second docs page - layout should NOT remount when navigating here.</p>
    </div>
  )
}
