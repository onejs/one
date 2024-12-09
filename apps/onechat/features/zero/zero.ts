import { type Schema, schema } from '~/config/zero/schema'
import { useQuery as useZeroQuery, useZero } from '@rocicorp/zero/react'
import { type Query, type Smash, Zero } from '@rocicorp/zero'
import { createEmitter, Emitter } from '~/helpers/emitter'

// const encodedJWT = Cookies.get("jwt");
// const decodedJWT = encodedJWT && decodeJwt(encodedJWT);
// const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : "anon";

export let zero = createZero()

export const [emitter, useZeroInstanceEmitter] = createEmitter<typeof zero>()

function createZero({ auth, userID = 'anon' }: { auth?: string; userID?: string } = {}) {
  return new Zero({
    userID,
    auth,
    server: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
    schema,
    // This is often easier to develop with if you're frequently changing
    // the schema. Switch to 'idb' for local-persistence.
    kvStore: 'mem',
  })
}

// TODO add userID
export function setZeroAuth(jwtSecret: string) {
  // slowing down
  // zero = createZero({
  //   auth: jwtSecret,
  // })
  // emitter.trigger(zero)
}

export const mutate = zero.mutate

export function useQuery<
  QueryBuilder extends (z: Zero<Schema>['query']) => Query<any>,
  QueryResult extends ReturnType<QueryBuilder>,
>(createQuery: QueryBuilder): QueryResult extends Query<any, infer Return> ? Smash<Return> : never {
  const z = useZero<Schema>()
  return useZeroQuery(createQuery(z.query)) as any
}
