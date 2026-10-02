import { Slot, Stack } from 'one'
export function AuthAndOnboardingLayout() {
  return (
    <>
      {process.env.VITE_PLATFORM === 'web' ? (
        <Slot />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName="login"
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="login/password" />
          <Stack.Screen name="signup/[method]" />
        </Stack>
      )}
    </>
  )
}
