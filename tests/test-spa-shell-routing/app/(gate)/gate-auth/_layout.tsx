import { Slot } from 'one'
import { recordLayoutMount } from '../../../auth-context'

// passthrough — mirrors takeout's app/(app)/auth/_layout.tsx so the (gate)
// child navigator has the same shape (intermediate _layout creating its
// own navigator tier under (gate)).
export default function GateAuthLayout() {
  recordLayoutMount('(gate)/gate-auth')
  return (
    <div id="gate-auth-layout">
      <Slot />
    </div>
  )
}
