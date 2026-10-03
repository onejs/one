import { YStack } from 'tamagui'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import type { ReactNode } from 'react'

// flex-column shell so the footer's mt:auto keeps it at the bottom even on
// short pages. children stack naturally so sections with intrinsic
// minH=100vh do not get clamped to remaining-viewport flex-basis.
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <YStack minH="100vh" width="100%">
      <SiteHeader />
      {children}
      <SiteFooter />
    </YStack>
  )
}
