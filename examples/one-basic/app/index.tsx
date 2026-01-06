import { Link } from 'one'
import { Text, View } from 'react-native'

export function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        minWidth: '100%',
        backgroundColor: '#fff',
      }}
    >
      <Text>Hello world, from One</Text>
      <Link href="/test">
        <Text>Go to Test</Text>
      </Link>
    </View>
  )
}
