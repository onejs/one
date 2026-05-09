import { Slot } from 'one'
import { recordLayoutMount } from '../../../auth-context'

// passthrough — mirrors takeout's app/(app)/home/_layout.tsx.
export default function GateHomeLayout() {
  recordLayoutMount('(gate)/gate-home')
  return (
    <div id="gate-home-layout">
      <Slot />
    </div>
  )
}
