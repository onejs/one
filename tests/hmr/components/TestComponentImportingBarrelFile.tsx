import { View, Text } from 'react-native'
import { Rocket } from '@tamagui/lucide-icons'
const IconComponent = Rocket
const text = 'Some text in TestComponentImportingBarrelFile'

export function TestComponentImportingBarrelFile() {
  return (
    <View>
      <Text testID="TestComponentImportingBarrelFile-text-content">{text}</Text>
      <Text>
        {
          IconComponent.toString() /* don't render the actual icon here since it require setting up Tamagui and will introduce additional complexity */
        }
      </Text>
    </View>
  )
}
