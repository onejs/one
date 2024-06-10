import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { TamaguiProvider, isWeb } from '@tamagui/core'
import { Stack, ScrollRestoration } from 'vxs'
import config from '../src/tamagui.config'
// @ts-ignore idk why only cli watch is getting mad at this
import { TestComponent } from '~/components/TestComponent'

export default function Layout() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

      <ScrollRestoration />

      <TamaguiProvider disableInjectCSS config={config}>
        {/* TODO we could automatically take any css inlined in the root _layout and extract to shared external css */}
        {/* since the root layout will always be shared between all pages */}
        {/* sub-layouts could do this too and share between sub-pages */}
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
