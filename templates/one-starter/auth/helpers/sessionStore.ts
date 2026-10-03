export interface BetterAuthSessionStoreClient {
  $store: {
    notify(signal?: string): void
  }
}

type BetterAuthSessionState = {
  data: unknown
  error: unknown
  isPending: boolean
  isRefetching: boolean
  refetch(queryParams?: { query?: Record<string, unknown> }): Promise<void>
}

type BetterAuthSessionAtom = {
  get(): BetterAuthSessionState
  set(value: BetterAuthSessionState): void
}

export interface BetterAuthWritableSessionStoreClient extends BetterAuthSessionStoreClient {
  $store: BetterAuthSessionStoreClient['$store'] & {
    atoms: Record<string, BetterAuthSessionAtom>
  }
}

const locallyClearedSessionClients = new WeakSet<BetterAuthSessionStoreClient>()
const authSessionGenerations = new WeakMap<BetterAuthSessionStoreClient, number>()
const originalSessionAtomSetters = new WeakMap<
  BetterAuthSessionStoreClient,
  BetterAuthSessionAtom['set']
>()
const fencedSessionStates = new WeakMap<
  BetterAuthSessionStoreClient,
  { generation: number; state: BetterAuthSessionState }
>()

export type ReestablishAuthSessionOptions = {
  expectedSessionToken?: string
}

export function refreshAuthSession(authClient: BetterAuthSessionStoreClient): void {
  authClient.$store.notify('$sessionSignal')
}

export function isAuthSessionLocallyCleared(
  authClient: BetterAuthSessionStoreClient,
): boolean {
  return locallyClearedSessionClients.has(authClient)
}

function fenceAuthSession(authClient: BetterAuthWritableSessionStoreClient) {
  locallyClearedSessionClients.add(authClient)
  const generation = (authSessionGenerations.get(authClient) ?? 0) + 1
  authSessionGenerations.set(authClient, generation)
  const sessionAtom = authClient.$store.atoms.session
  if (!sessionAtom) throw new Error('Better Auth session atom is unavailable')
  if (!originalSessionAtomSetters.has(authClient)) {
    const originalSet = sessionAtom.set.bind(sessionAtom)
    originalSessionAtomSetters.set(authClient, originalSet)
    sessionAtom.set = (state) => {
      if (!locallyClearedSessionClients.has(authClient)) {
        originalSet(state)
        return
      }
      fencedSessionStates.set(authClient, {
        generation: authSessionGenerations.get(authClient) ?? 0,
        state,
      })
      originalSet({ ...state, data: null })
    }
  }
  fencedSessionStates.delete(authClient)
  const session = sessionAtom.get()
  // refetch owns Better Auth's active get-session request. starting the empty
  // session check cancels its predecessor before the local clear, so an older
  // authenticated response cannot write itself back afterward.
  const refetch = session.refetch()
  sessionAtom.set({
    ...session,
    data: null,
    error: null,
    isPending: false,
    isRefetching: false,
  })
  return { generation, refetch, sessionAtom }
}

export async function reestablishAuthSession(
  authClient: BetterAuthWritableSessionStoreClient,
  options?: ReestablishAuthSessionOptions,
): Promise<void> {
  const { generation, refetch, sessionAtom } = fenceAuthSession(authClient)
  await refetch
  if (authSessionGenerations.get(authClient) !== generation) {
    throw new Error('Auth session confirmation was superseded')
  }
  const fenced = fencedSessionStates.get(authClient)
  if (!fenced || fenced.generation !== generation) {
    throw new Error('Auth session confirmation did not produce a current response')
  }
  const confirmed = fenced.state
  const data = confirmed.data
  const session =
    typeof data === 'object' && data !== null ? Reflect.get(data, 'session') : null
  if (typeof session !== 'object' || session === null) {
    const message =
      typeof confirmed.error === 'object' && confirmed.error !== null
        ? Reflect.get(confirmed.error, 'message')
        : null
    throw new Error(
      typeof message === 'string' ? message : 'Could not confirm auth session',
    )
  }
  if (
    options?.expectedSessionToken !== undefined &&
    Reflect.get(session, 'token') !== options.expectedSessionToken
  ) {
    throw new Error('Auth session confirmation returned a different session')
  }
  // refetch installed the confirmed response in Better Auth's authoritative
  // atom while the local fence was still closed. removing the fence in this
  // continuation means the next subscriber render can observe only that same
  // confirmed session.
  fencedSessionStates.delete(authClient)
  locallyClearedSessionClients.delete(authClient)
  sessionAtom.set({ ...confirmed })
}

export function clearAuthSession(authClient: BetterAuthWritableSessionStoreClient): void {
  const { refetch } = fenceAuthSession(authClient)
  void refetch
}
