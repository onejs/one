import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { Bell, Home, User } from '@tamagui/lucide-icons'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { isWeb, TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar, ScrollRestoration, Tabs } from 'vxs'
import { ToggleThemeButton } from '~/features/theme/ToggleThemeButton'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      {isWeb && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </>
      )}

      <ScrollRestoration />
      <PageLoadProgressBar />

      <SchemeProvider>
        <TamaguiRootProvider>
          <Tabs>
            <Tabs.Screen
              name="(stack)"
              options={{
                title: 'Home',
                tabBarIcon: () => <Home size={20} />,
                headerRight() {
                  return <ToggleThemeButton />
                },
              }}
            />

            <Tabs.Screen
              name="spa"
              options={{
                title: 'Profile',
                tabBarIcon: () => <Bell size={20} />,
              }}
            />

            <Tabs.Screen
              name="user/[user]"
              options={{
                title: 'Profile',
                tabBarIcon: () => <User size={20} />,
              }}
            />
          </Tabs>
        </TamaguiRootProvider>
      </SchemeProvider>
    </>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
