import { type Query, Zero } from '@rocicorp/zero'
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
    server:
      typeof window !== 'undefined'
        ? window.location.host === 'start.chat'
          ? 'https://zero.start.chat'
          : `${window.location.origin.replace(/:[\d]+/, ':4848')}`
        : import.meta.env.VITE_PUBLIC_ZERO_SERVER,
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

export function useQuery<
  TSchema extends Schema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn,
>(createQuery: (z: Zero<TSchema>['query']) => Query<TSchema, TTable, TReturn>, enable?: boolean) {
  const z = useZero<TSchema>()
  z.query
  return useZeroQuery<TSchema, TTable, TReturn>(createQuery(z.query), enable)
}
