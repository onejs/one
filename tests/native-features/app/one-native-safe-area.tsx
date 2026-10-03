import { Stack } from 'one'
import { Platform } from 'react-native'
import Fixture from '../fixtures/one-native-safe-area'

export default function OneNativeSafeAreaRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          // the android suite asserts a live top inset, which needs the
          // provider to span the full window; the ios suite pins the
          // below-header geometry, so only android goes transparent.
          headerTransparent: Platform.OS === 'android',
        }}
      />
      <Fixture />
    </>
  )
}
