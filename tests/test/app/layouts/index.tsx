import { Link } from 'one'

export default function LayoutTestsIndex() {
  return (
    <>
      <Link
        testID="link-to-nested-layout-with-slug-layout-folder"
        href="/layouts/nested-layout/with-slug-layout-folder/someLayoutParam"
      >
        Nested layout with slug layout folder
      </Link>
      {/* <Link href="/layouts/nested-layout/with-param/someLayoutParam/with-page-param/somePageParam">
        Nested layout with layout and page params
      </Link> */}
    </>
  )
}
