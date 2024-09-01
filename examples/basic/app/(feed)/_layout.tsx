import { isWeb } from 'tamagui'
import { Slot, Stack } from 'vxs'

export default function FeedLayout() {
  return <>{isWeb ? <Slot /> : <Stack />}</>
}
