import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { TamaguiProvider, isWeb } from '@tamagui/core'
import { Stack, Head } from 'vxs'
import config from '../src/tamagui.config'
// @ts-ignore idk why only cli watch is getting mad at this
import { TestComponent } from '~/components/TestComponent'

export default function Layout() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

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
    </>
  )
}
