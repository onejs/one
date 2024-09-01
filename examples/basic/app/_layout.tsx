import '@tamagui/core/reset.css'
import '~/features/styles/base.css'
import '~/features/styles/tamagui.css'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { isWeb, TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar, ScrollRestoration } from 'vxs'
import config from '../config/tamagui.config'
import { HomeLayout } from '~/features/home/HomeLayout'

export default function Layout() {
  return (
    <>
      {isWeb && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </>
      )}

      <ScrollRestoration />
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
