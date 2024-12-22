import type { Session, User } from 'better-auth'
import { useEffect, useState } from 'react'
import { createEmitter } from '@vxrn/emitter'
import { type ClientOptions, createAuthClient } from 'better-auth/client'

interface StorageKeys {
  token: string
  session: string
}

interface ExtraConfig {
  storageKeys?: StorageKeys
}

/**
 *
 * This is a very early package to lightly abstract better-auth/client to work well with:
 *  - React and React Native
 *  - jwt tokens
 *
 *  1. Stores the session and jwt configuration locally and restores from it if existing
 *  2. Provides a useAuth hook that automatically fetches jwt token for you
 *
 * @param options better-auth/client createAuthClient optinos
 * @param extraConfig for setting localStorage keys
 * @returns
 */
export function createBetterAuthClient(
  options: ClientOptions = {},
  { storageKeys }: ExtraConfig = {}
) {
  const keys = {
    token: storageKeys?.token ?? 'TOKEN_KEY',
    session: storageKeys?.session ?? 'SESSION_KEY',
  }

  const createAuthClientWithSession = (session: string) => {
    return createAuthClient({
      ...options,
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
    return existingSession
      ? createAuthClientWithSession(existingSession)
      : createAuthClient(options)
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
