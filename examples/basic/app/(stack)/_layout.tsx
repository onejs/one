import { isWeb } from 'tamagui'
import { Slot, Stack } from 'vxs'

export default function Layout() {
  return <>{isWeb ? <Slot /> : <Stack />}</>
}
