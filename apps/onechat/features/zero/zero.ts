import { type Schema, schema } from '~/config/zero/schema'
import { useQuery as useZeroQuery, useZero } from '@rocicorp/zero/react'
import { type Query, type Smash, Zero } from '@rocicorp/zero'

// const encodedJWT = Cookies.get("jwt");
// const decodedJWT = encodedJWT && decodeJwt(encodedJWT);
// const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : "anon";

export const zero = new Zero({
  userID: 'anon',
  auth: undefined,
  server: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
  schema,
  // This is often easier to develop with if you're frequently changing
  // the schema. Switch to 'idb' for local-persistence.
  kvStore: 'mem',
})

export const mutate = zero.mutate

export function useQuery<
  QueryBuilder extends (z: Zero<Schema>['query']) => Query<any>,
  QueryResult extends ReturnType<QueryBuilder>,
>(createQuery: QueryBuilder): QueryResult extends Query<any, infer Return> ? Smash<Return> : never {
  const z = useZero<Schema>()
  return useZeroQuery(createQuery(z.query)) as any
}

export const randomID = () => Math.random().toString(36).slice(2)

// were using JSONB for UserState
type UserState = {
  ui: {
    server?: string
  }
}

export const useUserState = () => {
  const user = useQuery((q) => q.user)[0]
  const state = user.state as UserState
  return [
    state,
    async (next: Partial<UserState>) => {
      await mutate.user.update({
        ...user,
        // TODO deep merge
        state: {
          ...user.state,
          ...next,
        },
      })
    },
  ] as const
}
