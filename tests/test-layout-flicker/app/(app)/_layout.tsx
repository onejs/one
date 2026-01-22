import { Slot } from 'one'

// (app) group layout - just passes through
// in takeout this handles auth, but for test we keep it simple

export default function AppLayout() {
  return <Slot />
}
