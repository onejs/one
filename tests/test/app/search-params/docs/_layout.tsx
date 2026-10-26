import { Slot } from 'one'
import { GlobalReader } from '~/features/search-params/GlobalReader'

export default function DocsLayout() {
  return (
    <>
      <GlobalReader id="docs-layout" />
      <Slot />
    </>
  )
}
