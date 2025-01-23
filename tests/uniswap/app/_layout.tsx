import { SafeAreaView, Slot } from 'one'
import { TamaguiProvider } from 'tamagui'
import config from 'ui/src/tamagui.config'

export default function Layout() {
  return (
    <SafeAreaView>
      <TamaguiProvider config={config}>
        <Slot />
      </TamaguiProvider>
    </SafeAreaView>
  )
}
