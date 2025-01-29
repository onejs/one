import '~/editor/markdown.css'
import '~/tamagui/tamagui.css'
import './root.css'

import { ZeroProvider } from '@rocicorp/zero/react'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'one'
import { useLayoutEffect, useState } from 'react'
import { isWeb, TamaguiProvider } from 'tamagui'
import { AuthEffects } from '~/better-auth/AuthEffects'
import { Dialogs } from '~/interface/dialogs/Dialogs'
import { Gallery } from '~/interface/gallery/Gallery'
import { ToastProvider } from '~/interface/toast/Toast'
import { DragDropFile } from '~/interface/upload/DragDropFile'
import { useErrorsToast } from '~/interface/useErrorsToast'
import { useTooltipCloser } from '~/interface/useTooltipCloser'
import { useGlobalHotKeys } from '~/keyboard/useGlobalHotKeys'
import config from '~/tamagui/tamagui.config'
import { isTauri } from '~/tauri/constants'
import { useZeroEmit, zero } from '~/zero'

/**
 * The root _layout.tsx filters <html /> and <body /> out on native
 */

export default function Layout() {
  useGlobalHotKeys()
  useTooltipCloser()
  useErrorsToast()

  useLayoutEffect(() => {
    if (isWeb && !isTauri) {
      document.documentElement.classList.add('not_tauri')
    }
  }, [isTauri])

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

      <body>
        <LoadProgressBar startDelay={1_000} />

        <AuthEffects />

        <ThemeProvider>
          <ToastProvider>
            <DragDropFile>
              <DataProvider>
                <SchemeProvider>
                  <Slot />
                  <Dialogs />
                  <Gallery />
                </SchemeProvider>
              </DataProvider>
            </DragDropFile>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

const DataProvider = ({ children }: { children: any }) => {
  const [instance, setInstance] = useState(zero)

  useZeroEmit((next) => {
    setInstance(next)
  })

  return <ZeroProvider zero={instance}>{children}</ZeroProvider>
}

const ThemeProvider = ({ children }: { children: any }) => {
  const [scheme, setting] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
