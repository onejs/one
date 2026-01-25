import '@tamagui/core/reset.css'
import '~/features/styles/base.css'
import '~/features/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { LoadProgressBar, Slot, useServerHeadInsertion, setRouteMasks, createRouteMask } from 'one'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import config from '../config/tamagui.config'
import { QuickNavigatePixel } from '~/features/test-helpers/QuickNavigatePixel'

// Configure route masks for URL masking
// This masks /photos/[id]/modal to show as /photos/[id] in the browser
setRouteMasks([
  createRouteMask({
    from: '/photos/[id]/modal',
    to: '/photos/[id]',
    params: true,
    unmaskOnReload: false, // On refresh, restore the modal
  }),
])

export default function Layout() {
  useServerHeadInsertion(() => {
    return <style id="test-server-insert-style">hi</style>
  })

  return (
    <html lang="ab">
      <head>
        <meta id="test-meta" />
        <title>test title</title>
      </head>

      <LoadProgressBar />

      <SchemeProvider>
        <SafeAreaProvider>
          <TamaguiRootProvider>
            <Slot />
            <QuickNavigatePixel />
          </TamaguiRootProvider>
        </SafeAreaProvider>
      </SchemeProvider>
    </html>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
      {children}
    </TamaguiProvider>
  )
}
