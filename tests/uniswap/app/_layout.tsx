import { Slot } from 'one'
import { TamaguiProvider } from 'tamagui'
import config from 'ui/src/tamagui.config'

export default function Layout() {
  console.log('hi')

  return (
    <TamaguiProvider config={config}>
      <Slot />
    </TamaguiProvider>
  )
}
