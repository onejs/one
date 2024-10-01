import '@tamagui/core/reset.css'
import '../public/tamagui.css'

import { TamaguiProvider } from '@tamagui/core'
import { LoadProgressBar, Slot } from 'vxs'
import config from '../tamagui.config'

export default function Layout() {
  return (
    <>
      {/* <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /> */}

      <LoadProgressBar />

      <TamaguiProvider disableInjectCSS config={config}>
        {/* TODO we could automatically take any css inlined in the root _layout and extract to shared external css */}
        {/* since the root layout will always be shared between all pages */}
        {/* sub-layouts could do this too and share between sub-pages */}
        <Slot />
      </TamaguiProvider>
    </>
  )
}
