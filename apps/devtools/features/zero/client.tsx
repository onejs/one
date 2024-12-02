// import { createContext, useContext } from 'react'
// import type { QueryDefs } from 'zero-client'
// import { Zero } from 'zero-client'
// import { schema } from './schema'

// const ZeroContext = createContext<Zero<QueryDefs> | undefined>(undefined)

// export function useZero<Q extends QueryDefs>(): Zero<Q> {
//   const zero = useContext(ZeroContext)
//   if (!zero) {
//     throw new Error('useZero must be used within a ZeroProvider')
//   }
//   return zero as Zero<Q>
// }

// const zero1 = new Zero({
//   logLevel: 'error',
//   server: `http://localhost:3000`,
//   userID: 'anon',
//   schemas: schema,
//   kvStore: typeof window !== 'undefined' && typeof indexedDB !== 'undefined' ? 'idb' : 'mem',
// })

// const postsSubQuery = zero1.query.posts.limit(1).related('user').related('replies')
// const repliesSubQuery = zero1.query.replies.limit(1).related('user')

// export type Param<A> = A | (A & { __keep: true })

// // export function expect<Params extends Object, Q extends Query<any, any, any>, Sub extends (q: Q) => any>(sub: Sub): (props: { [Key in keyof Params]: Param<Params[Key]> }) => ReturnType<Sub> {
// //   const cache = {}
// //   return (given) => {
// //     const cacheKey = JSON.stringify(given)
// //     const cached = cache[cacheKey]
// //     if (cached) return cached
// //     cache[cacheKey] = sub(parent.where(field, '=', params[field]))
// //     return cache[cacheKey]
// //   }
// // }

// export const zero = zero1 as typeof zero1 & {
//   expect: {
//     post: (
//       props: any,
//       q?: (q: typeof zero1.query.posts) => any
//     ) => (props: { id: Param<string> }) => typeof postsSubQuery

//     reply: (
//       props: any,
//       q?: (q: typeof zero1.query.posts) => any
//     ) => (props: { id: Param<string> }) => typeof repliesSubQuery
//   }
// }

// const createExpect = (parent, field, sub) => {
//   const cache = {}
//   return (params) => {
//     const cacheKey = JSON.stringify(params)
//     const cached = cache[cacheKey]
//     if (cached) return cached
//     cache[cacheKey] = sub(parent.where(field, '=', params[field]))
//     return cache[cacheKey]
//   }
// }

// // @ts-ignore
// zero1.expect = {
//   post: (field: 'id', sub: any) => {
//     return createExpect(zero.query.posts, field, sub)
//   },

//   reply: (field: 'id', sub: any) => {
//     return createExpect(zero.query.replies, field, sub)
//   },
// }

// export function ZeroProvider({
//   children,
// }: {
//   children?: any
// }) {
//   return <ZeroContext.Provider value={zero as any}>{children}</ZeroContext.Provider>
// }
