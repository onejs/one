import { Flex } from 'ui/src'
import { Slot } from 'one'

export default function UILayout() {
  return (
    <Flex p="$padding12">
      <Slot />
    </Flex>
  )
}
