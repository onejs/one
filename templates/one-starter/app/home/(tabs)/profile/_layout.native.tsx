// the native profile layout. the shared sibling is a bare slot; native wraps
// the tab root in its own stack so the root owns a navigation bar, and the
// root screen mounts the permanent settings entry in its content.
import { Stack } from 'one'

export default function ProfileLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false, animation: 'default' }}>
      <Stack.Screen
        name="index"
        // untitled: the tab bar already says this is the profile. the
        // transparent bar floats only the settings gear, and the page starts
        // under it (PageScrollView startUnderBar) since its centered identity
        // leaves the gear's corner free; the top scroll edge effect is hidden
        // so nothing under the bar blurs.
        options={{
          headerShown: true,
          headerTransparent: true,
          title: '',
          scrollEdgeEffects: { top: 'hidden' },
        }}
      />
    </Stack>
  )
}
