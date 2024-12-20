import { Home } from '@tamagui/lucide-icons'
import { useEffect } from 'react'
import { authClient } from '~/better-auth/authClient'

export default function () {
  useEffect(() => {
    authClient.signIn.social({
      provider: 'github',
    })
  }, [])

  return <Home />
}
