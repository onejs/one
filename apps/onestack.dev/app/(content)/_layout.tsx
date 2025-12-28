import { Slot } from 'one'
import { SearchProvider } from '~/features/search/SearchProvider'

export default function DocsGroupLayout() {
  return (
    <SearchProvider>
      <Slot />
    </SearchProvider>
  )
}
