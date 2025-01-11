import { Flex, Text } from '../src'
import { Link } from 'one'

export default () => {
  return (
    <Flex gap="$gap12">
      <Link href="/ui/switch">
        <Text>Switch</Text>
      </Link>
    </Flex>
  )
}
