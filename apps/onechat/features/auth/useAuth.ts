import type { Session, User } from 'better-auth'
import { useState, useEffect } from 'react'
import { authClientChange, authClient } from './authClient'

const empty = {
  session: undefined,
  user: undefined,
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
