import '@tamagui/core/reset.css'
import '~/features/styles/base.css'
import '~/features/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { LoadProgressBar, Slot, useServerHeadInsertion } from 'one'
import config from '../config/tamagui.config'

export default function Layout() {
  useServerHeadInsertion(() => {
    return <style id="test-style">hi</style>
  })

  return (
    <html lang="ab">
      <meta id="test-meta" />
      <title>test title</title>

      <LoadProgressBar />

      <SchemeProvider>
        <TamaguiRootProvider>
          <Slot />
        </TamaguiRootProvider>
      </SchemeProvider>
    </html>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
