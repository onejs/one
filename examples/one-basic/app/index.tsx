import { Link } from 'one'
import { Text, View } from 'react-native'

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        backgroundColor: '#fff',
        paddingVertical: 40,
      }}
    >
      <Text>Hello world, from One</Text>
      <Link href="/test">
        <Text>Go to Test</Text>
      </Link>
      <Link href="/tabs">
        <Text>Tabs demo</Text>
      </Link>
      <Link href="/widget-demo">
        <Text>Widget and Live Activity demo</Text>
      </Link>
      <Link href="/native">
        <Text>Swift and Kotlin demo</Text>
      </Link>
    </View>
  )
}
