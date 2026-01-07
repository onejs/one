import '@tamagui/core/reset.css'
import './_layout.css'

import { SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { LoadProgressBar, Slot } from 'one'
import config from '../config/tamagui.config'
// import { ZeroProvider } from '~/features/zero/client'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />

      {/* <ZeroProvider> */}
      <SchemeProvider>
        <TamaguiRootProvider>
          <Slot />
        </TamaguiRootProvider>
      </SchemeProvider>
      {/* </ZeroProvider> */}
    </>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    <TamaguiProvider config={config} defaultTheme={userScheme.value}>
      {children}
    </TamaguiProvider>
  )
}
