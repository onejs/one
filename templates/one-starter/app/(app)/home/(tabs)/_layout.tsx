import { Slot } from 'one'
import { MainHeader } from '~/features/app/MainHeader'
export function TabsLayout() {
  return (
    <>
      <MainHeader />
      <Slot />
    </>
  )
}
