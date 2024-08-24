import { Text, View } from '@tamagui/core'
import { Link } from 'vxs'

export default function Test() {
  return (
    <View bg="red" w={100} h={100}>
      <Text color="white">this one is test</Text>
      <Link href="/">Go back to home</Link>
    </View>
  )
}
