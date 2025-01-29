import { Lock } from '@tamagui/lucide-icons'
import { useEffect } from 'react'
import { Button, YStack } from 'tamagui'
import { setAuthClientToken, useAuth } from '../src/better-auth/authClient'
import { shouldRedirectBackToTauri, useTauriAuthDeepLink } from '../src/tauri/authFlowHelpers'

export function LoginSuccess() {
  const { session, token } = useAuth()
  const link = useTauriAuthDeepLink()

  useEffect(() => {
    if (window.opener && session) {
      if (token) {
        // trying to pass back not working yet
        setAuthClientToken({ session: session.token, token })
      }
      window.opener.postMessage({ type: 'login-success' }, window.location.origin)
      window.close()
    }
  }, [session])

  if (shouldRedirectBackToTauri()) {
    return (
      <YStack items="center" justify="center" flex={1} width="100%" height="100%">
        <a href={link}>
          <Button size="$5" icon={Lock}>
            Go back to app
          </Button>
        </a>
      </YStack>
    )
  }

  return null
}
