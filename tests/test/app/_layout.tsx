import '@tamagui/core/reset.css'
import '~/features/styles/base.css'
import '~/features/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { LoadProgressBar, Stack } from 'one'
import { TamaguiProvider } from 'tamagui'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />

      <SchemeProvider>
        <TamaguiRootProvider>
          <Stack>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="sheet"
              options={{
                presentation: 'formSheet',
                gestureDirection: 'vertical',
                animation: 'slide_from_bottom',
                headerShown: false,
              }}
            />
          </Stack>
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
