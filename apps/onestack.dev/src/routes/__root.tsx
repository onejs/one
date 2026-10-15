import '~/app/app.css'
import '~/app/fonts.css'
import '~/app/syntax-highlight.css'
import '~/app/tamagui.css'

import { MetaTheme, SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { createRootRoute, HeadContent, Outlet, Scripts, useLocation } from '@tanstack/react-router'
import NotFound from '~/features/site/NotFound'
import { NavigationProgress } from '~/components/NavigationProgress'
import { useEffect, type ReactNode } from 'react'
import { TamaguiProvider, Theme, useTheme } from 'tamagui'
import config from '~/config/tamagui.config'
import { LayoutDecorativeStripe } from '~/features/site/LayoutDecorativeStripe'
import { headerColors } from '~/features/site/headerColors'
import { useIsScrolled } from '~/features/site/useIsScrolled'
import { ContainerSm } from '~/features/site/Containers'
import { Footer } from '~/features/site/Footer'

export const Route = createRootRoute({
  component: Outlet,
  shellComponent: Layout,
  notFoundComponent: NotFound,
})

function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <HeadContent />
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.png" sizes="32x32" />
        <link rel="icon" href="/large-icon.png" sizes="192x192" />
        <link rel="alternate" type="application/rss+xml" href="/blog/rss.xml" />
      </head>

      <body>
        <NavigationProgress />

        <SchemeProvider>
          <ThemeProvider>
            <LayoutDecorativeStripe />
            <ThemeMetaTag />
            {children}
            <ConditionalFooter />
          </ThemeProvider>
        </SchemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

const ConditionalFooter = () => {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isHome = pathname === '/'
  const showFooter = isHome || pathname.startsWith('/blog')

  if (!showFooter) return null

  const footer = (
    <ContainerSm>
      <Footer />
    </ContainerSm>
  )

  // home sits on yellow in both schemes, so its footer keeps light-theme ink
  return isHome ? <Theme name="light">{footer}</Theme> : footer
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
  const pathname = useLocation({ select: (location) => location.pathname })
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
