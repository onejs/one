import { Text } from 'react-native'
import { Link, Stack } from 'vxs'

export default function HomePage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Text>HomePage</Text>

      <Link
        href={{
          pathname: '/test',
        }}
      >
        <Text>Stack into test page</Text>
      </Link>

      <Link
        href={{
          pathname: '/user/[user]',
          params: { user: 'other' },
        }}
      >
        <Text>Go to user tab</Text>
      </Link>
    </>
  )
}
