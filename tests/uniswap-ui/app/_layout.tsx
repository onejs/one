import { TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar, ScrollRestoration, Slot } from 'vxs'
import config from '../tamagui.config'

export default function Layout() {
  return (
    <>
      <ScrollRestoration />
      <PageLoadProgressBar />

      <TamaguiProvider config={config}>
        <Slot />
      </TamaguiProvider>
    </>
  )
}
