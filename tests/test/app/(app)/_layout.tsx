import { Slot } from 'one'

// (app) route group comes BEFORE (hydration-delay) alphabetically
// This mimics takeout3's structure where (app) and (site) coexisted
export default function AppLayout() {
  return <Slot />
}
