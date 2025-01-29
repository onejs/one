import { createEmitter } from '@vxrn/emitter'
import type { Session, User } from 'better-auth'
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

  const setAuthClientToken = async ({ token, session }: { token: string; session: string }) => {
    localStorage.setItem(keys.token, token)
    localStorage.setItem(keys.session, session)
    authClient = createAuthClientWithSession(session)
    authClientVersion.emit(Math.random())
  }

  async function fetchToken() {
    const res = await authClient.$fetch('/token')
    if (res.error) {
      console.error(`Error fetching token ${res.error.statusText}`)
      return
    }
    const data = res.data as any
    return data?.token as string | undefined
  }

  async function refreshAuth() {
    const token = localStorage.getItem(keys.token)
    const session = localStorage.getItem(keys.session)
    if (token && session) {
      setAuthClientToken({ token, session })
      return
    }
  }

  const clearAuthClientToken = () => {
    localStorage.setItem(keys.token, '')
    localStorage.setItem(keys.session, '')
  }

  type State = {
    session: Session | null
    user: User | null
    token: string | null
  }

  const empty: State = {
    session: null,
    user: null,
    token: null,
  }

  const authState = createEmitter<State>(empty)

  function setState(next: Partial<State>) {
    const current = authState.value!
    authState.emit({ ...current, ...next })
  }

  authClient.useSession.subscribe(async ({ data, error }) => {
    if (error) {
      console.error(`Auth error`, error)
    }
    if (data) {
      const token = await fetchToken()
      setState({
        ...data,
        token,
      })
    } else {
      setState(empty)
    }
  })

  const useAuth = () => {
    const state = authState.useValue() || empty
    return {
      ...state,
      loggedIn: !!state.session,
    }
  }

  const response = {
    authState,
    authClient: new Proxy(authClient, {
      get(target, key) {
        // TODO if we need to manually manage clearing
        // if (key === 'signOut') {
        //   return () => {
        //     // ensure we sync state on signout
        //     authClient.signOut()
        //   }
        // }
        return Reflect.get(authClient, key)
      },
    }),
    setAuthClientToken,
    clearAuthClientToken,
    useAuthClientVersion,
    useAuth,
    refreshAuth,
    fetchToken,
  }

  return response
}
