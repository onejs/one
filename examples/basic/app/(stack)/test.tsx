import { Text } from 'react-native'
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
