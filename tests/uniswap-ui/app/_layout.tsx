import { Slot } from 'one'
import { TamaguiProvider } from 'tamagui'
import config from 'ui/src/tamagui.config'

export default function Layout() {
  return (
    <>
      <TamaguiProvider config={config}>
        <Slot />
      </TamaguiProvider>
    </>
  )
}
