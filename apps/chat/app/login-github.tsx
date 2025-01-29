import { useParams } from 'one'
import { useEffect } from 'react'
import { Spinner, YStack } from 'tamagui'
import { authClient } from '~/better-auth/authClient'
import { setShouldRedirectBackToTauri } from '~/tauri/authFlowHelpers'

export function LoginGithub() {
  const search = useParams()

  useEffect(() => {
    setShouldRedirectBackToTauri('from-tauri' in search)

    authClient.signIn.social({
      provider: 'github',
      callbackURL: '/login-success',
    })
  }, [])

  return (
    <YStack items="center" justify="center" flex={1} width="100%" height="100%">
      <Spinner />
    </YStack>
  )
}
