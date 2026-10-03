// the native feed layout. one never fires intercepting routes on native,
// so `make` is declared here as the system form sheet; the trigger pushes
// one href on every platform and only this declaration differs.
import { formSheetOptions } from '~/interface/ui/sheet/routeSheetOptions'
import { Stack } from 'one'
import { Platform } from 'react-native'

export const unstable_settings = { initialRouteName: 'index' }

export default function FeedLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false, animation: 'default' }}>
      {/* the tab root owns its navigation bar — the large title collapses
          with this tab's own scroll view — and the root screen mounts the
          permanent settings entry in its content. pushed screens keep the
          stack's headerless default and draw their own chrome. */}
      <Stack.Screen
        name="index"
        options={{ headerShown: true, headerLargeTitleEnabled: true, title: 'Feed' }}
      />
      <Stack.Screen name="post/[postId]" />
      <Stack.Screen
        name="make"
        options={{
          ...formSheetOptions({ initialDetent: 'full' }),
          // the ios toolbar must be visible before modal presentation to preserve state
          headerShown: Platform.OS === 'ios',
        }}
      />
    </Stack>
  )
}
