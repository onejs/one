import { Link } from 'one'
import { Image, Text, View } from 'react-native'

const TEST_LOGO = require('../assets/test-logo.png')

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
        paddingVertical: 40,
      }}
    >
      <Image source={TEST_LOGO} style={{ width: 32, height: 32 }} />
      <Text>Hello world, from One</Text>
      <Link href="/test">
        <Text>Go to Test</Text>
      </Link>
    </View>
  )
}
