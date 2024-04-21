import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { TamaguiProvider, isWeb } from '@tamagui/core'
import { Stack } from '@vxrn/expo-router'
import config from '../src/tamagui.config'

console.log('load layout')

export default function Layout() {
  console.log('render layout')
  return (
    <TamaguiProvider disableInjectCSS config={config}>
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
