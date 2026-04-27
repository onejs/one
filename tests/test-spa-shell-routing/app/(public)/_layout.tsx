import { Slot } from 'one'
import { recordLayoutMount } from '../../auth-context'

export default function PublicLayout() {
  recordLayoutMount('(public)')
  return (
    <div id="public-layout" data-layout="public">
      <Slot />
    </div>
  )
}
