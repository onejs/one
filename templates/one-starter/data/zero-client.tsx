import { toast } from '@tamagui/toast'
import { clearZeroClientData, createZeroClient, type ZeroEventsEmitter } from 'on-zero'
import { createZeroKvStore } from 'on-zero/kv-store'
import { createZeroClientTransport } from 'orez-lite/client'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useAuth } from '~/auth/client/authClient'
import { SERVER_URL } from '~/constants'
import { aggregates } from './generated/aggregates'
import * as groupedQueries from './generated/groupedQueries'
import { models } from './generated/models'
import { schema } from './generated/schema'

export const queryFns = groupedQueries

// re-export useMutation from the same barrel as useQuery so app code imports
// every Zero hook from one place (`~/data/zero-client`).
export { useMutation } from 'on-zero'

const zeroClient = createZeroClient({
  models,
  schema,
  groupedQueries,
  aggregates,
})

export const {
  usePermission,
  useQuery,
  getQuery,
  zero,
  ProvideZero: ProvideZeroWithoutAuth,
  ControlQueries,
} = zeroClient
export const zeroEvents: ZeroEventsEmitter = zeroClient.zeroEvents

// one pull endpoint in every environment: local dev proxies it to the native
// routes it to the browser host. the application executor remains the one push owner.
const SYNC_URL = `${SERVER_URL}/zero-http`
const SYNC_TRANSPORT = createZeroClientTransport({
  // local previews do not expose an authenticated wake route. cloudflare
  // deployments do, and Zero's existing auth token authorizes that socket.
  wake: process.env.NODE_ENV === 'production',
  pushOrigin: process.env.NODE_ENV === 'development' ? `${SERVER_URL}/api/zero` : undefined,
})

// how many screens' worth of queries keep syncing after their screen unmounts.
// zero drops a query as soon as its last view goes away (its own default is 0),
// which sends `op:"del"`, deletes the rows only that query covered, and makes
// the next visit to that screen wait on a server round trip behind a loading
// state even though it was just there. this sync protocol carries no per-query
// ttl, so this is the one lever that keeps navigation warm. the LRU bound is
// what keeps a parameterized detail screen from syncing forever.
const RECENT_QUERIES_KEPT_WARM = 20

export function ProvideZero({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const authUserId = auth.user?.id
  const authData = useMemo(() => (authUserId ? { id: authUserId } : null), [authUserId])
  const kvStore = useMemo(() => createZeroKvStore(), [])

  // on-zero self-heals sync failures; a terminal `fatal` means its retries are
  // exhausted, so offer the aggressive path: clear local data and reload.
  useEffect(() => {
    return zeroEvents.listen((event) => {
      if (event?.type !== 'fatal') return
      toast.error('Lost sync with the server', {
        description: 'Resetting local data and reloading usually fixes this.',
        duration: 60_000,
        action: {
          label: 'Reset & reload',
          onClick: () => void clearZeroClientData({ closeZero: () => zero.close() }),
        },
      })
    })
  }, [])

  // wait for the session token before mounting Zero so the initial connection
  // is authenticated rather than connecting anonymously and reconnecting.
  const zeroAuth = auth.session?.token
  if (!auth.user?.email || !zeroAuth || !authData) return null

  return (
    <ProvideZeroWithoutAuth
      userID={auth.user.id}
      storageKey="app"
      kvStore={kvStore}
      maxRecentQueries={RECENT_QUERIES_KEPT_WARM}
      connectionDataset
      transport={SYNC_TRANSPORT}
      cacheURL={SYNC_URL}
      auth={zeroAuth}
      authData={authData}
    >
      {children}
    </ProvideZeroWithoutAuth>
  )
}
