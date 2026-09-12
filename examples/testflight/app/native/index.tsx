import { Text, View } from 'tamagui'

export default function NativeCapabilitiesWebFallback() {
  return (
    <View p="$6">
      <Text>The retained native-capability fixture is available in the iOS build.</Text>
    </View>
  )
}
