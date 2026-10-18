import { Text, View } from 'react-native'
import { systemVersion } from '../src/systemVersion'

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text testID="system-version" style={{ fontSize: 22 }}>
        {`ProcessInfo: ${systemVersion()}`}
      </Text>
    </View>
  )
}
