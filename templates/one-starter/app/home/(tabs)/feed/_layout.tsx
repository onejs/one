import { Stack } from 'one'

export const unstable_settings = { initialRouteName: 'index' }

export default function FeedLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false, animation: 'default' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="post/[postId]" />
    </Stack>
  )
}
