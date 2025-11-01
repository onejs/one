import { Text, View } from 'react-native'
import { Link } from 'one'

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
      <Link href="/test">
        <Text>Go to Test</Text>
      </Link>
    </View>
  )
}
