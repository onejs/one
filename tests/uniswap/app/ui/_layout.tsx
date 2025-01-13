import { Slot } from 'one'
import { Flex } from 'ui/src'

export default function UILayout() {
  return (
    <Flex p="$padding12">
      <Slot />
    </Flex>
  )
}
