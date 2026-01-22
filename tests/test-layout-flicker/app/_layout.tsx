import { Slot } from 'one'
import { SiteLayout } from '../src/SiteLayout'

// root layout wraps everything in SiteLayout
// which conditionally shows SiteHeader based on pathname

export default function Layout() {
  return (
    <SiteLayout>
      <Slot />
    </SiteLayout>
  )
}
