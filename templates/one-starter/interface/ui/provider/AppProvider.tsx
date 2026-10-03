// still its own export (PlatformSpecificRootProvider, GlobalOverlayProvider,
// ToastProvider, RouteSheet) for an app that ejects and composes them itself.
import { Presentations, useSystemScheme } from 'one'
import { isWeb, TamaguiProvider } from 'tamagui'
import { GlobalOverlayProvider } from '../overlay/GlobalOverlayProvider'
import { PlatformSpecificRootProvider } from '../platform/PlatformSpecificRootProvider'
import { RouteSheet } from '../sheet/RouteSheet'
import { ToastProvider } from '../toast/Toast'
import type { ComponentProps, ReactNode } from 'react'

type AppThemeProviderProps = {
  config: ComponentProps<typeof TamaguiProvider>['config']
  // pins a theme; without it the app follows the system appearance
  defaultTheme?: 'light' | 'dark'
  children: ReactNode
}

// tamagui with the app's config, following the system light or dark scheme
export function AppThemeProvider({
  config,
  defaultTheme,
  children,
}: AppThemeProviderProps) {
  const colorScheme = useSystemScheme()
  return (
    <TamaguiProvider
      config={config}
      defaultTheme={defaultTheme ?? (colorScheme === 'dark' ? 'dark' : 'light')}
      disableInjectCSS={!isWeb}
    >
      {children}
    </TamaguiProvider>
  )
}

// native gesture, keyboard and portal roots; the theme; the global dialog,
// popover and tooltip host; web presentation of sheet routes (native presents
// them itself); and the toast host beside the app.
export function AppProvider({
  config,
  defaultTheme,
  children,
}: AppThemeProviderProps) {
  return (
    <PlatformSpecificRootProvider>
      <AppThemeProvider config={config} defaultTheme={defaultTheme}>
        <GlobalOverlayProvider dialogSheetBreakpoint="max-md">
          <Presentations web={{ sheet: RouteSheet }}>{children}</Presentations>
        </GlobalOverlayProvider>
        <ToastProvider />
      </AppThemeProvider>
    </PlatformSpecificRootProvider>
  )
}
