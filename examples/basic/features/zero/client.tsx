import { createContext, useContext } from 'react'
import type { Query, QueryDefs, QueryRowType } from 'zero-client'
import { Zero } from 'zero-client'
import { schema } from './schema'

const ZeroContext = createContext<Zero<QueryDefs> | undefined>(undefined)

export function useZero<Q extends QueryDefs>(): Zero<Q> {
  const zero = useContext(ZeroContext)
  if (!zero) {
    throw new Error('useZero must be used within a ZeroProvider')
  }
  return zero as Zero<Q>
}

export const zero = new Zero({
  logLevel: 'error',
  server: `http://localhost:3000`,
  userID: 'anon',
  schemas: schema,
  kvStore: typeof window !== 'undefined' && typeof indexedDB !== 'undefined' ? 'idb' : 'mem',
})

export type Param<A> = A | (A & { __keep: true })

export function ZeroProvider({
  children,
}: {
  children?: any
}) {
  return <ZeroContext.Provider value={zero as any}>{children}</ZeroContext.Provider>
}

type GenericQuery = Query<any, any>

// works with .expect or regular queries:

export type ZeroResult<X extends GenericQuery | ((props: any) => GenericQuery)> = X extends (
  props: any
) => infer Y
  ? Y extends GenericQuery
    ? QueryRowType<Y>
    : unknown
  : X extends GenericQuery
    ? QueryRowType<X>
    : unknown
