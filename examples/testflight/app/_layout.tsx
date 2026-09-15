import '@tamagui/core/reset.css'
import '~/code/styles/base.css'
import '~/code/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, usePathname } from 'one'
import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { isWeb, TamaguiProvider } from 'tamagui'
import { HomeLayout } from '~/code/home/HomeLayout'
import { NativeSplitView } from '~/code/home/NativeSplitView'
import config from '../config/tamagui.config'

export default function Layout() {
  const pathname = usePathname()
  const [isSplitDismissed, setIsSplitDismissed] = useState(false)

  useEffect(() => {
    if (!pathname.startsWith('/split')) {
      setIsSplitDismissed(false)
    }
  }, [pathname])

  return (
    <>
      {isWeb && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=5"
          />
          <link rel="icon" href="/favicon.svg" />
        </>
      )}

      <LoadProgressBar />

      <SchemeProvider>
        <TamaguiRootProvider>
          {Platform.OS === 'ios' && pathname.startsWith('/split') && !isSplitDismissed ? (
            <NativeSplitView onExit={() => setIsSplitDismissed(true)} />
          ) : (
            <HomeLayout />
          )}
        </TamaguiRootProvider>
      </SchemeProvider>
    </>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    <TamaguiProvider
      disableInjectCSS
      config={config}
      defaultTheme={userScheme.value}
      disableRootThemeClass
    >
      {children}
    </TamaguiProvider>
  )
}
