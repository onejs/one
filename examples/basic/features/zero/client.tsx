import { createContext, useContext } from 'react'
import type { QueryDefs } from 'zero-client'
import { Zero } from 'zero-client'
import { schema } from './schema'

const ZeroContext = createContext<Zero<QueryDefs> | undefined>(undefined)

export function useZero<Q extends QueryDefs>(): Zero<Q> {
  const zero = useContext(ZeroContext)
  if (zero === undefined) {
    throw new Error('useZero must be used within a ZeroProvider')
  }
  return zero as Zero<Q>
}

export const zero = new Zero({
  logLevel: 'info',
  server: `http://localhost:3000`,
  userID: 'anon',
  schemas: schema,
})

export function ZeroProvider({
  children,
}: {
  children?: any
}) {
  return <ZeroContext.Provider value={zero}>{children}</ZeroContext.Provider>
}
