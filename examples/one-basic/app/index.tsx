import { Text, View } from 'react-native'
import type { SomeType } from '~/server-only-module'

const a: SomeType = { foo: 'bar' }

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
      <Text>Hello world, from One {JSON.stringify(a)}</Text>
    </View>
  )
}
