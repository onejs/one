/**
 * @agent-rule
 * auth redirects are route callers. when the signed-in home path changes,
 * update APP_HOME_HREF and auth return links together.
 */
import { Redirect, Slot, Stack } from 'one'
import { isWeb, Spinner, YStack } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { APP_HOME_HREF } from '~/features/app/routes'

function AuthLoading() {
  return (
    <YStack flex={1} items="center" justify="center" bg="color-1">
      <Spinner size="large" color="color-10" />
    </YStack>
  )
}

export default function AuthLayout() {
  const auth = useAuth()

  if (auth.state === 'loading') return <AuthLoading />
  if (auth.user) return <Redirect href={APP_HOME_HREF} />
  // native needs its own stack here: a Slot swaps the child route with no
  // navigator, so pushing signup/[method] and popping it from the back chevron
  // both land instantly with no transition. web stays a slot for SSG.
  if (isWeb) return <Slot />
  return <Stack screenOptions={{ headerShown: false }} />
}
