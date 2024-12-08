import './app.css'
import './fonts.css'
import './syntax-highlight.css'
import './tamagui.css'

import { ZeroProvider } from '@rocicorp/zero/react'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'one'
import { TamaguiProvider, Theme } from 'tamagui'
import config from '~/config/tamagui/tamagui.config'
import { zero } from '~/features/zero/zero'

export default function Layout() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta property="og:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="icon" href="/favicon.svg" />

      <LoadProgressBar startDelay={1_000} />

      <ZeroProvider zero={zero}>
        <SchemeProvider>
          <ThemeProvider>
            <Slot />
          </ThemeProvider>
        </SchemeProvider>
      </ZeroProvider>
    </>
  )
}

const ThemeProvider = ({ children }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
