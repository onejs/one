import { Stack } from 'one'
import { Platform } from 'react-native'
import { NativeScreensStore } from '../../fixtures/native-screens/store'

// router and state in javascript; every screen below is a native view. on ios the
// swiftui view owns the bar contents, so the stack leaves the bar transparent, lets
// the view's own title and back button stand as uikit shows them, and allows the
// large title the list asks for. android screens draw their own compose app bars.
export default function Layout() {
  return (
    <NativeScreensStore>
      <Stack
        screenOptions={Platform.select({
          ios: { headerTransparent: true, headerBackButtonDisplayMode: 'minimal' as const },
          default: { headerShown: false, statusBarStyle: 'auto' as const },
        })}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Entries', headerLargeTitleEnabled: true }}
        />
        <Stack.Screen name="[id]" options={{ title: 'Entry' }} />
        <Stack.Screen
          name="sort"
          options={{ presentation: 'formSheet', title: 'Sort' }}
        />
        <Stack.Screen
          name="new"
          options={{ presentation: 'modal', title: 'New entry' }}
        />
      </Stack>
    </NativeScreensStore>
  )
}
