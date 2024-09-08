import '@tamagui/core/reset.css'
import '~/features/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar } from 'vxs'
import { HomeLayout } from '~/features/home/HomeLayout'
import * as Zero from '~/features/zero/client'
import config from '../config/tamagui.config'

console.log('Zero', Zero)

export default function Layout() {
  return (
    <>
      <PageLoadProgressBar />

      <Zero.ZeroProvider>
        <SchemeProvider>
          <TamaguiRootProvider>
            <HomeLayout />
          </TamaguiRootProvider>
        </SchemeProvider>
      </Zero.ZeroProvider>
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
