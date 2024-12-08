import type { Session, User } from 'better-auth'
import { createAuthClient } from 'better-auth/client'
import { useEffect, useState } from 'react'
import { Listeners } from '~/helpers/disposable'

export let authClient = createAuthClient()

const authClientChange = new Listeners<typeof authClient>()

globalThis['authClient'] = authClient

const empty = {
  session: undefined,
  user: undefined,
}

export const setAuthToken = (token: string) => {
  authClient = createAuthClient({
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  authClientChange.trigger(authClient)
}

export const useAuth = () => {
  const [clientVersion, setClientVersion] = useState(0)
  const [state, setState] = useState<{ session?: Session; user?: User }>(empty)

  useEffect(() => {
    // change client
    const dispose = authClientChange.listen(() => {
      setClientVersion(Math.random())
    })

    const dispose2 = authClient.useSession.subscribe((value) => {
      setState(value.data || empty)
    })

    return () => {
      dispose()
      dispose2()
    }
  }, [clientVersion])

  return state
}

export const githubSignIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'github',
  })
}
