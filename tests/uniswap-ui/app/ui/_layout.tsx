import { Flex } from 'ui/src'
import { Slot } from 'vxs'

export default function UILayout() {
  return (
    <Flex p="$padding12">
      <Slot />
    </Flex>
  )
}
