import type { Session, User } from 'better-auth'
import { useEffect, useState } from 'react'
import { createEmitter } from '@vxrn/emitter'
import { type ClientOptions, createAuthClient } from 'better-auth/client'

interface StorageKeys {
  token: string
  session: string
}

interface AuthClientConfig {
  options?: ClientOptions
  storageKeys?: StorageKeys
}

export function createBetterAuthClient(config: AuthClientConfig = {}) {
  const keys = {
    token: config.storageKeys?.token ?? 'TOKEN_KEY',
    session: config.storageKeys?.session ?? 'SESSION_KEY',
  }

  const createAuthClientWithSession = (session: string) => {
    return createAuthClient({
      ...config.options,
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${session}`,
        },
      },
    })
  }

  let authClient = (() => {
    const existingSession =
      typeof localStorage !== 'undefined' ? localStorage.getItem(keys.session) : ''
    return existingSession ? createAuthClientWithSession(existingSession) : createAuthClient()
  })()

  const authClientVersion = createEmitter<number>()
  const useAuthClientVersion = authClientVersion.use

  const setAuthClientToken = ({ token, session }: { token: string; session: string }) => {
    localStorage.setItem(keys.token, token)
    localStorage.setItem(keys.session, session)
    authClient = createAuthClientWithSession(session)
    authClientVersion.emit(Math.random())
  }

  const empty = {
    session: null,
    user: null,
  }

  const useAuth = () => {
    const [clientVersion, setClientVersion] = useState(0)
    const [state, setState] = useState<{ session: Session | null; user: User | null }>(empty)
    const [jwtToken, setToken] = useState<string | null>(null)

    useAuthClientVersion(() => {
      setClientVersion(Math.random())
    })

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

  return {
    authClient,
    setAuthClientToken,
    useAuthClientVersion,
    useAuth,
  }
}
