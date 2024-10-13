import { Text, View } from 'react-native'
import { Svg } from 'react-native-svg'

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
      }}
    >
      <Text>Hello world, from One</Text>

      <Svg />
    </View>
  )
}
