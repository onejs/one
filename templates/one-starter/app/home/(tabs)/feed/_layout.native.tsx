import { Stack } from 'one'

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

    </Stack>
  )
}
