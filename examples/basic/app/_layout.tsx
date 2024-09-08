import '@tamagui/core/reset.css'
import '~/features/styles/tamagui.css'
import './_layout.css'
import '~/features/zero/setup'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar } from 'vxs'
import { HomeLayout } from '~/features/home/HomeLayout'
import { ZeroProvider } from '~/features/zero/client'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <PageLoadProgressBar />

      <ZeroProvider>
        <SchemeProvider>
          <TamaguiRootProvider>
            <HomeLayout />
          </TamaguiRootProvider>
        </SchemeProvider>
      </ZeroProvider>
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
