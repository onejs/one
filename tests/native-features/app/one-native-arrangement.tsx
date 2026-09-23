import { Stack } from 'one'
import Fixture from '../fixtures/one-native-arrangement'

export default function OneNativeArrangementRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Arrangement View',
        }}
      />
      <Fixture />
    </>
  )
}
