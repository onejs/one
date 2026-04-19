import { Slot } from 'one'

// mirrors soot's app/(site)/_layout.tsx — just passes through <Slot />.
export default function SiteLayout() {
  return <Slot />
}
