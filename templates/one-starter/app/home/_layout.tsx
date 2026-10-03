/**
 * @agent-rule
 * this authenticated layout owns the Zero provider boundary and native stack.
 * keep useQuery/useZero callers below ProvideZero, and keep Stack.Screen names
 * aligned with the actual child route nodes.
 */
import { Redirect, Slot, Stack } from 'one'
import { isWeb, useTheme, YStack } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { ProvideZero } from '~/data/zero-client'
import { APP_TABS_ROUTE_NAME } from '~/features/app/routes'
import { NotificationsRoot } from '~/features/notifications/NotificationsRoot'
import type { ReactNode } from 'react'

// a deep link to a pushed screen or a sheet seats the tabs under it
export const unstable_settings = { initialRouteName: APP_TABS_ROUTE_NAME }

// demo content (users + posts + comments) is world data seeded once by
// `database/seed.ts` after migrations — the feed is global, so it exists for
// everyone before any auth, with no client-side seeding. per-user starter data
// (the userPublic mirror) stays in auth/server/afterCreateUser.ts.
function AuthenticatedHome({ children }: { children: ReactNode }) {
  // notifications live inside the Zero provider: the inbox they present and the
  // event a tap opens are both synced rows.
  return (
    <ProvideZero>
      <NotificationsRoot>{children}</NotificationsRoot>
    </ProvideZero>
  )
}

export default function HomeLayout() {
  const theme = useTheme()
  const auth = useAuth()
  if (auth.state === 'loading') return null
  if (!auth.user) return <Redirect href="/auth/login" />

  if (isWeb) {
    // give every home screen a viewport-height column so a screen's flex:1
    // scroll area has a height to fill. without this, a route outside the
    // (tabs) group (which sets its own minH) renders into a 0-height body and
    // its content collapses/clips to blank on the deployed web app.
    return (
      <AuthenticatedHome>
        <YStack minH="100dvh">
          <Slot />
        </YStack>
      </AuthenticatedHome>
    )
  }

  return (
    <AuthenticatedHome>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default',
          contentStyle: { backgroundColor: theme.background?.val },
        }}
        initialRouteName={APP_TABS_ROUTE_NAME}
      >
        {/* a pushed screen's back button is labelled with the previous screen's
            title, falling back to its route name; untitled, the tabs would make
            settings read "(tabs)". */}
        <Stack.Screen name={APP_TABS_ROUTE_NAME} options={{ title: 'Home' }} />
        {/* the settings screens are real pushes of this stack, so
            react-native-screens draws the system back button. a settings
            _layout would nest a second stack whose first screen is index 0 and
            has no back item, which is faithful to UIKit and useless here. */}
        <Stack.Screen name="settings/index" options={{ headerShown: true, title: 'Settings' }} />
        <Stack.Screen
          name="settings/edit-profile"
          options={{ headerShown: true, title: 'Edit Profile' }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{ headerShown: true, title: 'Notifications' }}
        />
      </Stack>
    </AuthenticatedHome>
  )
}
