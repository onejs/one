import { View, Text } from 'react-native'

export default function Settings() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="settings-page">Settings Page (Protected)</Text>
    </View>
  )
}
