import { createZeroClient } from 'on-zero'
import { useMemo, type ReactNode } from 'react'
import { ZERO_SERVER_URL } from '~/constants/urls'
import * as groupedQueries from '~/data/generated/groupedQueries'
import { models } from '~/data/generated/models'
import { schema } from '~/data/generated/schema'
import { getValidToken, useAuth } from '~/features/auth/client/authClient'
import { createKVStore } from './storage'

export const {
  useQuery,
  zero,
  ProvideZero: ZeroProvider,
} = createZeroClient({
  models,
  schema,
  groupedQueries,
})

export function ProvideZero({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const userId = auth.user?.id || 'anon'
  const kvStore = useMemo(() => createKVStore(userId), [userId])

  return (
    <ZeroProvider
      userID={userId}
      auth={auth.token}
      authData={auth.authData}
      kvStore={kvStore}
      cacheURL={ZERO_SERVER_URL}
      disable={!auth.user || !auth.token}
      connectionDataset
      refreshAuth={getValidToken}
    >
      {children}
    </ZeroProvider>
  )
}
