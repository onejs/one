import type { Session, User } from 'better-auth'
import { useEffect, useState } from 'react'
import { authClient, useAuthClientInstanceEmitter } from './authClient'

const empty = {
  session: null,
  user: null,
}

export const useAuth = () => {
  const [clientVersion, setClientVersion] = useState(0)
  const [state, setState] = useState<{ session: Session | null; user: User | null }>(empty)
  const [jwtToken, setToken] = useState<string | null>(null)

  useAuthClientInstanceEmitter(() => {
    setClientVersion(Math.random())
  })

  useEffect(() => {
    const setTokenFromJWKS = ({ keys }: { keys: { kid: string }[] }) => {
      if (keys[0]) {
        setToken(keys[0].kid)
      }
    }

    authClient.$fetch('/jwks').then(async ({ data }) => {
      if ((data as any).keys.length) {
        setTokenFromJWKS(data as any)
        return
      }

      // if no token, create one and then set
      // just calling this should generate a token
      // @ts-expect-error TODO need to figure out this type
      await authClient.token()
      const { data: data2 } = await authClient.$fetch('/jwks')
      if ((data2 as any).keys.length) {
        setTokenFromJWKS(data2 as any)
        return
      }
      return
    })

    return authClient.useSession.subscribe((value) => {
      setState(value.data || empty)
    })
  }, [clientVersion])

  return {
    ...state,
    jwtToken,
    loggedIn: !!state.user,
  }
}
