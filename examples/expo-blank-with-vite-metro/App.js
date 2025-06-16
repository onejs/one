import { View, Text, Image } from 'react-native'

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image style={{ width: 50, height: 50 }} source={require('./react-native-logo.png')} />
      <Text>Hello World!</Text>
    </View>
  )
}
