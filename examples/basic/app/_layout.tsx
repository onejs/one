import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { TamaguiProvider, isWeb, View } from 'tamagui'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { PageLoadProgressBar, ScrollRestoration, Tabs } from 'vxs'
import config from '../config/tamagui.config'
import { Home } from '@tamagui/lucide-icons'

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
                tabBarIcon: ({ color }) => <Home size={20} color="red" />,
              }}
            />

            <Tabs.Screen
              name="spa"
              options={{
                title: 'Profile',
                tabBarIcon: ({ color }) => <View width={20} height={20} bg="green" />,
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
