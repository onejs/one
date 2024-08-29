import { Text } from '@tamagui/core'
import { Stack } from 'vxs'

export default function TestPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Text>Testing</Text>
    </>
  )
}
