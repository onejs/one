// the web feed layout. the @sheet slot renders beside the stack: a soft
// navigation to /home/feed/make renders the intercept overlay over the
// feed, while the stack declares `make` as a transparent modal with no
// modal chrome provider, so a hard navigation (refresh, deep link) seats
// the feed and renders the route's own dialog raw over it. both
// navigations render the same file, so open and refresh can never drift.
import { Stack } from 'one'
import type { ReactNode } from 'react'

export const unstable_settings = { initialRouteName: 'index' }

export default function FeedLayout({ sheet }: { sheet?: ReactNode }) {
  return (
    <>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false, animation: 'default' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="post/[postId]" />
        <Stack.Screen name="make" options={{ presentation: 'transparentModal' }} />
      </Stack>
      {sheet}
    </>
  )
}
