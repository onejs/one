import { Redirect, Slot, Stack, usePathname } from 'one'
import { Configuration } from 'tamagui'
import { useAuth } from '~/features/auth/client/authClient'
import { DialogProvider } from '~/interface/dialogs/Dialog'
import { ToastProvider } from '~/interface/toast/Toast'
import { ProvideZero } from '~/zero/client'
export function AppLayout() {
  const { state } = useAuth()
  const pathname = usePathname()
  if (state === 'loading') {
    return null
  }

  // redirect logged-out users away from protected routes
  const isLoggedInRoute = pathname.startsWith('/home')
  if (state === 'logged-out' && isLoggedInRoute) {
    return <Redirect href="/auth/login" />
  }

  // redirect logged-in users away from auth routes
  const isAuthRoute = pathname.startsWith('/auth')
  if (state === 'logged-in' && isAuthRoute) {
    return <Redirect href="/home/feed" />
  }
  return (
    <Configuration disableSSR>
      <ProvideZero>
        <ToastProvider>
          <DialogProvider>
            {process.env.VITE_PLATFORM === 'web' ? (
              <Slot />
            ) : (
              // We need Stack here for transition animation to work on native
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="home" />
                <Stack.Screen name="auth" />
              </Stack>
            )}
          </DialogProvider>
        </ToastProvider>
      </ProvideZero>
    </Configuration>
  )
}
