import { type Query, type QueryType, type Smash, Zero } from '@rocicorp/zero'
import { useZero, useQuery as useZeroQuery } from '@rocicorp/zero/react'
import { createEmitter } from '@vxrn/emitter'
import { type Schema, schema } from './schema'

export let zero = createZero()

const zeroEmitter = createEmitter<typeof zero>()
export const useZeroEmit = zeroEmitter.use

function createZero({ auth, userId = 'anon' }: { auth?: string; userId?: string } = {}) {
  return new Zero({
    userID: userId,
    auth,
    server: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
    schema,
    kvStore: 'mem',
  })
}

export function setZeroAuth({ jwtToken, userId }: { jwtToken: string; userId: string }) {
  zero = createZero({
    auth: jwtToken,
    userId,
  })

  // zero.query.server.preload()
  // zero.query.channel.preload()
  // zero.query.user.preload()

  zeroEmitter.emit(zero)
}

export type QueryResult<TReturn extends QueryType> = [
  Smash<TReturn>,
  {
    type: 'unknown' | 'complete'
  },
]

export function useQuery<
  QueryBuilder extends (z: Zero<Schema>['query']) => Query<any, any>,
  Q extends ReturnType<QueryBuilder>,
>(createQuery: QueryBuilder): Q extends Query<any, infer Return> ? QueryResult<Return> : never {
  const z = useZero<Schema>()
  return useZeroQuery(createQuery(z.query)) as any
}
