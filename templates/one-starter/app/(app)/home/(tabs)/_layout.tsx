import { Slot } from 'one'
import { Spacer } from 'tamagui'
import { MainHeader } from '~/features/app/MainHeader'
export function TabsLayout() {
  return (
    <>
      <MainHeader />
      <Spacer h={50} />
      <Slot />
    </>
  )
}
