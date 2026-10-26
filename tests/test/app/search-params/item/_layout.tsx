import { Slot } from 'one'
import { GlobalReader } from '~/features/search-params/GlobalReader'

export default function ItemLayout() {
  return (
    <>
      <GlobalReader id="item-layout" />
      <Slot />
    </>
  )
}
