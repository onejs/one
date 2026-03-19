import { NavigationContainer } from '@react-navigation/native'
import { Text, View } from 'tamagui'

export default function NavTest() {
  return (
    <View>
      <Text id="nav-test-rendered">nav-test-rendered</Text>
      <Text>{typeof NavigationContainer}</Text>
    </View>
  )
}
