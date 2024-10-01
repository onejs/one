import '@tamagui/core/reset.css'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'vxs'
import { isWeb, TamaguiProvider } from 'tamagui'
import { ZeroProvider } from '~/features/zero/client'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />

      {isWeb && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

          <style
            // @ts-ignore
            precedence="default"
            key="tamagui-css"
            // @ts-ignore
            href="tamagui-css"
          >
            {config.getCSS()}
          </style>
        </>
      )}

      <ZeroProvider>
        <SchemeProvider>
          <TamaguiRootProvider>
            <Slot />
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
