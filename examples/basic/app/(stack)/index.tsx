import { Text } from '@tamagui/core'
import { Link, Stack } from 'vxs'

export default function HomePage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Text color="yellow">HomePage</Text>

      <Link
        href={{
          pathname: '/test',
        }}
      >
        <Text color="$color">Stack into test page</Text>
      </Link>

      <Link
        href={{
          pathname: '/user/[user]',
          params: { user: 'other' },
        }}
      >
        <Text color="$color">Go to user tab</Text>
      </Link>
    </>
  )
}
