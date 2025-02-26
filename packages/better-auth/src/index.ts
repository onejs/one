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
  const authState = createEmitter<State>(empty)

  let loading = true

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
    updateAuthClient(session)
  }

  function updateAuthClient(session: string) {
    authClient = createAuthClientWithSession(session)
    authClientVersion.emit(Math.random())
    subscribeToAuthClientSession()
  }

  let disposeSessionSub: Function | null = null
  function subscribeToAuthClientSession() {
    disposeSessionSub?.()
    disposeSessionSub = authClient.useSession.subscribe(async ({ data, error }) => {
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
  }

  subscribeToAuthClientSession()

  async function fetchToken() {
    const res = await authClient.$fetch('/token')
    if (res.error) {
      console.error(`Error fetching token ${res.error.statusText}`)
      return
    }
    const data = res.data as any
    return data?.token as string | undefined
  }

  function getPersistedKeys() {
    const token = localStorage.getItem(keys.token)
    const session = localStorage.getItem(keys.session)
    return {
      token,
      session,
    }
  }

  async function refreshAuth() {
    const { token, session } = getPersistedKeys()
    if (token && session) {
      setAuthClientToken({ token, session })
      return
    }
  }

  const clearAuthClientToken = () => {
    localStorage.setItem(keys.token, '')
    localStorage.setItem(keys.session, '')
  }

  function setState(next: Partial<State>) {
    const current = authState.value!
    loading = false
    authState.emit({ ...current, ...next })
  }

  const useAuth = () => {
    const state = authState.useValue() || empty
    return {
      ...state,
      loggedIn: loading ? null : !!state.session,
      loading,
    }
  }

  const response = {
    getPersistedKeys,
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
