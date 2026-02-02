import '~/tamagui/tamagui.css'
import './_layout.css'

import type { ReactNode } from 'react'
import { SchemeProvider } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'one'
import { TamaguiRootProvider } from '../src/tamagui/TamaguiRootProvider'

/**
 * The root _layout.tsx filters <html /> and <body /> out on native.
 *
 * This layout receives slot props from @modal directory for intercepting routes.
 * The `modal` prop renders intercepted content when a soft navigation occurs.
 */

export default function Layout({
  modal,
}: {
  children: ReactNode
  modal: ReactNode // From @modal directory - intercepting routes
}) {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.svg" />

        <title>👋</title>
      </head>

      <body>
        <SchemeProvider>
          <TamaguiRootProvider>
            <LoadProgressBar />
            <Slot />
            {/* Modal slot - renders intercepted content on soft navigation */}
            {modal}
          </TamaguiRootProvider>
        </SchemeProvider>
      </body>
    </html>
  )
}
