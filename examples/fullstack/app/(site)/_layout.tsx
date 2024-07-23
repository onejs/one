import { ToastViewport } from '@tamagui/toast'
import { Slot } from 'vxs'

export default function SiteLayout() {
  // add header and footer here
  return (
    <>
      <Slot />
      <ToastViewport flexDirection="column-reverse" top="$2" left={0} right={0} />
      <ToastViewport
        multipleToasts
        name="viewport-multiple"
        flexDirection="column-reverse"
        top="$2"
        left={0}
        right={0}
      />
    </>
  )
}
