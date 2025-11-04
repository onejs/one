import { useLayoutEffect, useState } from 'react'

// import type { Schema } from 'zql/src/zql/query/schema.js'
type Schema = any

// @ts-expect-error
import type { Query, QueryType, Smash } from 'zql/src/zql/query/query.js'
// @ts-expect-error
import type { QueryImpl } from 'zql/src/zql/query/query-impl.js'
// @ts-expect-error
import type { TypedView } from 'zql/src/zql/query/typed-view.js'

export function useQuery<TSchema extends Schema, TReturn extends QueryType>(
  q: Query<TSchema, TReturn>,
  enable = true
): Smash<TReturn> {
  const queryImpl = q as QueryImpl<TSchema, TReturn>

  const [snapshot, setSnapshot] = useState<Smash<TReturn>>(undefined as unknown as Smash<TReturn>)
  const [, setView] = useState<TypedView<Smash<TReturn>> | undefined>(undefined)

  useLayoutEffect(() => {
    if (enable) {
      const view = q.materialize()
      setView(view)
      const unsubscribe = view.addListener((snapshot) => {
        setSnapshot(structuredClone(snapshot) as Smash<TReturn>)
      })
      view.hydrate()
      return () => {
        unsubscribe()
        view.destroy()
      }
    }
    setSnapshot((queryImpl.singular ? undefined : []) as unknown as Smash<TReturn>)
    setView(undefined)
    return () => {
      //
    }
  }, [JSON.stringify(enable ? (q as QueryImpl<never, never>).ast : null)])

  return snapshot
}
