import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { TamaguiProvider, isWeb } from '@tamagui/core'
import { Stack } from 'vxs'
import config from '../src/tamagui.config'
// @ts-ignore idk why only cli watch is getting mad at this
import { TestComponent } from '~/components/TestComponent'

export default function Layout() {
  return (
    <TamaguiProvider disableInjectCSS config={config}>
      <style
        // @ts-ignore
        href="Tamagui.getCSS"
        // @ts-ignore
        precedence="medium"
      >
        {config.getCSS()}
      </style>
      <TestComponent />
      <Stack
        screenOptions={
          isWeb
            ? {
                header() {
                  return null
                },
              }
            : {}
        }
      />
    </TamaguiProvider>
  )
}
