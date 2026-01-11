import './app.css'
import './fonts.css'
import './syntax-highlight.css'
import './tamagui.css'

import { MetaTheme, SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot, SourceInspector, usePathname } from 'one'
import { useEffect } from 'react'
import { TamaguiProvider, useTheme } from 'tamagui'
import config from '~/config/tamagui.config'
import { LayoutDecorativeStripe } from '~/features/site/LayoutDecorativeStripe'
import { headerColors } from '~/features/site/headerColors'
import { useIsScrolled } from '~/features/site/useIsScrolled'
import { Footer } from '../features/site/Footer'
import { ContainerSm } from '../features/site/Containers'

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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.png" sizes="32x32" />
        <link rel="icon" href="/large-icon.png" sizes="192x192" />
      </head>

      <body>
        <LoadProgressBar startDelay={1_000} />
        <SourceInspector />

        <SchemeProvider>
          <ThemeProvider>
            <LayoutDecorativeStripe />
            <ThemeMetaTag />
            <Slot />
            <ConditionalFooter />
          </ThemeProvider>
        </SchemeProvider>
      </body>
    </html>
  )
}

const ConditionalFooter = () => {
  const pathname = usePathname()
  const showFooter = pathname === '/' || pathname.startsWith('/blog')

  if (!showFooter) return null

  return (
    <ContainerSm>
      <Footer />
    </ContainerSm>
  )
}

const ThemeProvider = ({ children }) => {
  const userScheme = useUserScheme()

  return (
    <>
      <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
        {children}
      </TamaguiProvider>
    </>
  )
}

const ThemeMetaTag = () => {
  const userScheme = useUserScheme()
  const theme = useTheme()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isScrolled = useIsScrolled()
  let color = headerColors[userScheme.value]
  if (isHome && isScrolled) {
    color = theme.color1.val
  }

  useEffect(() => {
    document.body.style.background = color
  }, [color])

  return (
    <MetaTheme
      color={color}
      darkColor={headerColors.dark}
      lightColor={headerColors.light}
    />
  )
}
