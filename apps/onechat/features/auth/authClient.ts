import type { Session, User } from 'better-auth'
import { createAuthClient } from 'better-auth/client'
import { useEffect, useState } from 'react'

export const authClient = createAuthClient()

const empty = {
  session: undefined,
  user: undefined,
}

export const useAuth = () => {
  const [state, setState] = useState<{ session?: Session; user?: User }>(empty)

  useEffect(() => {
    return authClient.useSession.subscribe((value) => {
      setState(value.data || empty)
    })
  }, [])

  return state
}

export const githubSignIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'github',
  })
}
