import './app.css'
import './fonts.css'
import './syntax-highlight.css'
import './tamagui.css'

import { ToastProvider, ToastViewport, useToastState, Toast } from '@tamagui/toast'
import { ZeroProvider } from '@rocicorp/zero/react'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'one'
import { useState } from 'react'
import { TamaguiProvider, YStack } from 'tamagui'
import config from '~/config/tamagui/tamagui.config'
import { AuthEffects } from '~/features/auth/AuthEffects'
import { useZeroInstanceEmitter, zero } from '~/features/state/zero'

export default function Layout() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta property="og:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="icon" href="/favicon.svg" />

      <LoadProgressBar startDelay={1_000} />

      <AuthEffects />

      <DataProvider>
        <SchemeProvider>
          <ThemeProvider>
            <ToastProvider swipeDirection="horizontal">
              <Slot />
              <ToastDisplay />
              <ToastViewport flexDirection="column-reverse" top={0} left={0} right={0} mx="auto" />
            </ToastProvider>
          </ThemeProvider>
        </SchemeProvider>
      </DataProvider>
    </>
  )
}

const ToastDisplay = () => {
  const currentToast = useToastState()

  if (!currentToast || currentToast.isHandledNatively) {
    return null
  }

  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
      exitStyle={{ opacity: 0, scale: 1, y: -20 }}
      y={0}
      opacity={1}
      scale={1}
      animation="100ms"
      viewportName={currentToast.viewportName}
    >
      <YStack>
        <Toast.Title>{currentToast.title}</Toast.Title>
        {!!currentToast.message && <Toast.Description>{currentToast.message}</Toast.Description>}
      </YStack>
    </Toast>
  )
}

const DataProvider = ({ children }) => {
  const [instance, setInstance] = useState(zero)

  useZeroInstanceEmitter((next) => {
    setInstance(next)
  })

  return <ZeroProvider zero={instance}>{children}</ZeroProvider>
}

const ThemeProvider = ({ children }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
