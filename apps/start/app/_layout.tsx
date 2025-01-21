import '~/fonts/fonts.css'
import '~/tamagui/tamagui.css'
import './_layout.css'
import './syntax-highlight.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot } from 'one'
import { TamaguiProvider, YStack } from 'tamagui'
import config from '~/tamagui/tamagui.config'

export default function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta property="og:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content={`${process.env.ONE_SERVER_URL}/og.jpg`} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" href="/favicon.svg" />
      </head>

      <body>
        <LoadProgressBar startDelay={1_000} />

        <SchemeProvider>
          <ThemeProvider>
            <YStack zIndex={0} fullscreen className="grain" pointerEvents="none" />
            <Slot />
          </ThemeProvider>
        </SchemeProvider>
      </body>
    </html>
  )
}

const ThemeProvider = ({ children }) => {
  const [scheme] = useColorScheme()

  return (
    <>
      <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
        {children}
      </TamaguiProvider>
    </>
  )
}
