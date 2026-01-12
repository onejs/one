import { View, Text } from 'react-native'

export default function Dashboard() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="dashboard-page" accessibilityLabel="Dashboard Page">Dashboard Page (Protected)</Text>
    </View>
  )
}
