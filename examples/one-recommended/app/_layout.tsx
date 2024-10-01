import '@tamagui/core/reset.css'
import './_layout.css'
import '~/code/styles/base.css'
import '~/code/styles/tamagui.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { LoadProgressBar } from 'one'
import { HomeLayout } from '~/code/home/HomeLayout'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />

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
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme} disableRootThemeClass>
      {children}
    </TamaguiProvider>
  )
}
