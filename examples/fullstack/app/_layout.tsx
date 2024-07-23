import '~/app.css'
import '~/tamagui.css'
import { ToastProvider } from '@tamagui/toast'
import { isWeb, setupPopper, TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar, ScrollRestoration, Slot, Stack } from 'vxs'
import { HeadInfo } from '~/components/HeadInfo'
import tamaConf from '~/config/tamagui.config'
import { UserThemeProvider, useUserTheme } from '~/features/site/theme/useUserTheme'

setupPopper({
  // prevents a reflow on mount
  disableRTL: true,
})

export default function Layout() {
  return (
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

      <ScrollRestoration />
      <PageLoadProgressBar />

      <meta name="robots" content="index,follow" />

      {/* load fonts, css scripts here */}

      <script
        dangerouslySetInnerHTML={{
          __html: `let d = document.documentElement.classList
          d.remove('t_light')
          d.remove('t_dark')
          let e = localStorage.getItem('user-theme')
          let t =
            'system' === e || !e
              ? window.matchMedia('(prefers-color-scheme: dark)').matches
              : e === 'dark'
          t ? d.add('t_dark') : d.add('t_light')`,
        }}
      />

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
    // react 19 hydration breaks if theres not a single root node, which disableRootThemeClass causes
    <span style={{ display: 'contents' }}>
      <TamaguiProvider
        disableRootThemeClass
        disableInjectCSS
        defaultTheme={resolvedTheme}
        config={tamaConf}
      >
        <ToastProvider swipeDirection="horizontal">{props.children}</ToastProvider>
      </TamaguiProvider>
    </span>
  )
}
