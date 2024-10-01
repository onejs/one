import '@tamagui/core/reset.css'
import '~/features/styles/base.css'
import '~/features/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { LoadProgressBar, Slot } from 'vxs'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />

      <SchemeProvider>
        <TamaguiRootProvider>
          <Slot />
        </TamaguiRootProvider>
      </SchemeProvider>
    </>
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
