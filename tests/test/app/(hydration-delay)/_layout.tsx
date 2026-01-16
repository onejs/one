import { Slot } from 'one'

// This layout wraps content in a route group with just <Slot />
// This pattern was causing hydration delays where content would be
// removed and re-added with a visible gap (flicker)
export default function HydrationDelayLayout() {
  return <Slot />
}
