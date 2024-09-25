import '@tamagui/core/reset.css'
import './_layout.css'
import '~/features/styles/base.css'
import '~/features/styles/tamagui.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar } from 'vxs'
import { HomeLayout } from '~/features/home/HomeLayout'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <PageLoadProgressBar />

      <SchemeProvider>
        <TamaguiRootProvider>
          <HomeLayout />
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
