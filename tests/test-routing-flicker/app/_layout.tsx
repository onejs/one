import { SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { Slot } from 'one'
import { TamaguiProvider } from 'tamagui'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SSG Flicker Test</title>
      </head>
      <body>
        <div id="app-container">
          <SchemeProvider>
            <TamaguiRootProvider>
              <Slot />
            </TamaguiRootProvider>
          </SchemeProvider>
        </div>
      </body>
    </html>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
      {children}
    </TamaguiProvider>
  )
}
