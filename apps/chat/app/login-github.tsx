import { Home } from '@tamagui/lucide-icons'
import { useEffect } from 'react'
import { authClient } from '~/better-auth/authClient'
import { setShouldRedirectBackToTauri } from '~/tauri/authFlowHelpers'

export default function () {
  useEffect(() => {
    setShouldRedirectBackToTauri()

    authClient.signIn.social({
      provider: 'github',
    })
  }, [])

  return <Home />
}
