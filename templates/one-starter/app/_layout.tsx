import { AppProvider } from '~/interface/ui/provider/AppProvider'
import { Slot, Stack, usePathname, useUserScheme } from 'one'
import { isWeb, useTheme } from 'tamagui'
import { APP_NAME, DOMAIN } from '~/constants'
import { LINK_UNDERLINE_RESET, SAFE_AREA_VARS } from '~/interface/webRootCss'
import { config } from '~/tamagui/tamagui.config'

const webRootCss = `body { margin: 0; }
${SAFE_AREA_VARS}
${LINK_UNDERLINE_RESET}`

const websiteMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'One starter',
    description:
      'A free, open-source starter for building real-time, cross-platform apps with React and React Native.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Learn how One starter handles your personal data and protects your privacy.',
  },
  '/terms-of-service': {
    title: 'Terms of Service',
    description: 'Read the Terms of Service for using One starter.',
  },
  '/eula': {
    title: 'End User License Agreement',
    description: 'Review the End User License Agreement (EULA) for One starter.',
  },
  '/docs/intro': {
    title: 'Introduction',
    description:
      'The One starter app stack, built with One, Tamagui, Better Auth, Orez Lite, and Zero.',
  },
  '/docs/getting-started': {
    title: 'Getting started',
    description:
      'Install One starter, run its app and live sync stack, and build for production.',
  },
}

function AppRoutes() {
  // no Configuration disableSSR: these examples are SSG, and disableSSR puts
  // tamagui in client-only mode, which skips server-side atomic-style
  // extraction — the first paint ships until hydration.
  const theme = useTheme()
  if (isWeb) return <Slot />
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background?.val },
      }}
      // native starts at index; the native index resolves its session-aware
      // target itself (signed-in to app home, signed-out to /auth/login), so
      // the signed-out surface lives at its real route.
      initialRouteName="index"
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="home" />
    </Stack>
  )
}

function AppShell() {
  return (
      <AppProvider config={config}>
        <AppRoutes />
      </AppProvider>
  )
}

export default function Layout() {
  const pathname = usePathname()
  const { value: scheme } = useUserScheme()
  const metadata = websiteMetadata[pathname]
  const pageTitle =
    metadata && pathname !== '/' ? `${metadata.title} | ${APP_NAME}` : APP_NAME
  const pageUrl = `https://${DOMAIN}${pathname}`
  const imageUrl = `https://${DOMAIN}/og.jpg`
  const contents = <AppShell />

  if (isWeb) {
    return (
      <html lang="en-US">
        <head>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
          />
          <title>{pageTitle}</title>
          {metadata && (
            <>
              <meta name="description" content={metadata.description} />
              <link rel="canonical" href={pageUrl} />
              <meta property="og:title" content={pageTitle} />
              <meta property="og:description" content={metadata.description} />
              <meta property="og:url" content={pageUrl} />
              <meta property="og:type" content="website" />
              <meta property="og:locale" content="en_US" />
              <meta property="og:site_name" content={APP_NAME} />
              <meta property="og:image" content={imageUrl} />
              <meta
                property="og:image:width"
                content="1200"
              />
              <meta
                property="og:image:height"
                content="630"
              />
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content={pageTitle} />
              <meta name="twitter:description" content={metadata.description} />
              <meta name="twitter:image" content={imageUrl} />
              <meta
                name="theme-color"
                content={scheme === 'dark' ? '#050505' : '#ffffff'}
              />
            </>
          )}
          <link rel="icon" href="/favicon.png" type="image/png" />
          <style dangerouslySetInnerHTML={{ __html: webRootCss }} />
        </head>
        <body>{contents}</body>
      </html>
    )
  }

  return contents
}
