import { Flex, Text } from '../src'
import { Link } from 'one'

export default () => {
  return (
    <Flex backgroundColor="red" gap="$gap12" py="$padding36">
      <Link href="/ui/switch">
        <Text>Switch</Text>
      </Link>
    </Flex>
  )
}
