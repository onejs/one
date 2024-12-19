import type { Session, User } from 'better-auth'
import { useEffect, useState } from 'react'
import { authClient, useRefreshAuthClient } from './authClient'

const empty = {
  session: null,
  user: null,
}

export const useAuth = () => {
  const [clientVersion, setClientVersion] = useState(0)
  const [state, setState] = useState<{ session: Session | null; user: User | null }>(empty)
  const [jwtToken, setToken] = useState<string | null>(null)

  useRefreshAuthClient(setClientVersion)

  useEffect(() => {
    authClient.$fetch('/token').then(async (props) => {
      const data = props.data as any
      if (data?.token) {
        setToken(data.token)
        return
      }
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
