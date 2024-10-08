import '~/app.css'
import '~/tamagui.css'

import { HydrateTheme, UserThemeProvider, useUserTheme } from '@tamagui/one-theme'
import { isWeb, setupPopper, TamaguiProvider } from 'tamagui'
import { LoadProgressBar, Slot, Stack } from 'one'
import { HeadInfo } from '~/components/HeadInfo'
import tamaConf from '~/config/tamagui.config'

setupPopper({
  // prevents a reflow on mount
  disableRTL: true,
})

export default function Layout() {
  return (
    <>
      {isWeb && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

          <link rel="icon" href="/favicon.png" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <meta name="docsearch:language" content="en" />
          <meta name="docsearch:version" content="1.0.0,latest" />
          <meta id="theme-color" name="theme-color" />
          <meta name="color-scheme" content="light dark" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@tamagui_js" />
          <meta name="twitter:creator" content="@natebirdman" />

          <HeadInfo
            openGraph={{
              type: 'website',
              locale: 'en_US',
              url: 'https://tamagui.dev',
              siteName: 'Tamagui',
              images: [
                {
                  url: 'https://tamagui.dev/social.png',
                },
              ],
            }}
          />

          <LoadProgressBar />

          <meta name="robots" content="index,follow" />

          {/* load fonts, css scripts here */}

          <HydrateTheme />
        </>
      )}

      <Providers>
        {isWeb ? (
          <Slot />
        ) : (
          <Stack
            screenOptions={
              isWeb
                ? {
                    header() {
                      return null
                    },

                    contentStyle: {
                      position: 'relative',
                      backgroundColor: 'red',
                    },
                  }
                : {}
            }
          />
        )}
      </Providers>
    </>
  )
}

export const Providers = (props: { children: any }) => {
  return (
    <UserThemeProvider>
      <TamaguiRootProvider>{props.children}</TamaguiRootProvider>
    </UserThemeProvider>
  )
}

function TamaguiRootProvider(props: { children: any }) {
  const [{ resolvedTheme }] = useUserTheme()

  return (
    <TamaguiProvider
      disableRootThemeClass
      disableInjectCSS
      defaultTheme={resolvedTheme}
      config={tamaConf}
    >
      {props.children}
    </TamaguiProvider>
  )
}
