import '@tamagui/core/reset.css'
import '~/features/styles/tamagui.css'
import '~/features/zero/setup'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { isWeb, TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar } from 'vxs'
import { HomeLayout } from '~/features/home/HomeLayout'
import { ZeroProvider } from '~/features/zero/client'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <PageLoadProgressBar />

      {isWeb && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        </>
      )}

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
