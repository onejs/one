import '~/tamagui/tamagui.css'
import './_layout.css'

import { ZeroProvider } from '@rocicorp/zero/react'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'one'
import { useState } from 'react'
import { isWeb, TamaguiProvider } from 'tamagui'
import { AuthEffects } from '~/better-auth/AuthEffects'
import { DragDropFile } from '~/interface/upload/DragDropFile'
import config from '~/tamagui/tamagui.config'
import { useZeroEmit, zero } from '~/zero/zero'

/**
 * The root _layout.tsx filters <html /> and <body /> out on native
 */

export default function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta property="og:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" href="/favicon.svg" />
      </head>

      <LoadProgressBar startDelay={1_000} />

      <AuthEffects />

      <DragDropFile>
        <DataProvider>
          <SchemeProvider>
            <ThemeProvider>
              <Slot />
            </ThemeProvider>
          </SchemeProvider>
        </DataProvider>
      </DragDropFile>
    </html>
  )
}

const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [instance, setInstance] = useState(zero)

  useZeroEmit((next) => {
    setInstance(next)
  })

  return <ZeroProvider zero={instance}>{children}</ZeroProvider>
}

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
