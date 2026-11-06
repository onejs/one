import { Stack } from 'one'
import { NativeScreensStore } from '../../fixtures/native-screens/store'

// router and state in javascript; every screen below is a native view
export default function Layout() {
  return (
    <NativeScreensStore>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: 'Entries' }} />
        <Stack.Screen name="[id]" options={{ title: 'Entry' }} />
        <Stack.Screen name="sort" options={{ presentation: 'formSheet', title: 'Sort' }} />
        <Stack.Screen name="new" options={{ presentation: 'modal', title: 'New entry' }} />
      </Stack>
    </NativeScreensStore>
  )
}
