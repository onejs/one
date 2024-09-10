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

const server = typeof window === 'undefined' ? 'http://localhost:0000' : `http://localhost:3000`

const zero1 = new Zero({
  logLevel: 'error',
  server,
  userID: 'anon',
  schemas: schema,
  kvStore: 'mem',
})

const postsSubQuery = zero1.query.posts.limit(1).related('user').related('replies')
const repliesSubQuery = zero1.query.replies.limit(1).related('user')

type Param<A> = A | (A & { __keep: true })

export const zero = zero1 as typeof zero1 & {
  subquery: {
    posts: (
      props: any,
      q?: (q: typeof zero1.query.posts) => any
    ) => (props: { id: Param<string> }) => typeof postsSubQuery

    replies: (
      props: any,
      q?: (q: typeof zero1.query.posts) => any
    ) => (props: { id: Param<string> }) => typeof postsSubQuery
  }
}

export let curId = ''

// @ts-ignore
zero1.subquery = {
  posts: (field: 'id', sub: any) => {
    return (params) => {
      curId = params.id
      return sub(zero.query.posts.where(field, '=', params[field]))
    }
  },

  replies: (field: 'id', sub: any) => {
    return (params) => {
      curId = params.id
      return sub(zero.query.replies.where(field, '=', params[field]))
    }
  },
}

export function ZeroProvider({
  children,
}: {
  children?: any
}) {
  if (typeof window === 'undefined') {
    return children
  }
  return <ZeroContext.Provider value={zero as any}>{children}</ZeroContext.Provider>
}
