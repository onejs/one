import { View, Text } from 'react-native'

export default function NotFound() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        testID="ignoredRouteFiles-not-found"
        style={{ color: 'black', backgroundColor: 'white' }}
      >
        ignoredRouteFiles-not-found
      </Text>
    </View>
  )
}
