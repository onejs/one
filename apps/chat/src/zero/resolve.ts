import type { Query } from '@rocicorp/zero'
import type { QueryResult } from './zero'

export async function resolve<Q extends Query<any>>(
  query: Q
): Promise<Q extends Query<any, infer Return> ? QueryResult<Return>[0] : never> {
  const view = query.materialize()
  return new Promise((res) => {
    const dispose = view.addListener((data, resultType) => {
      if (resultType === 'complete') {
        res(data as any)
        setTimeout(() => {
          dispose()
        })
      }
    })
  })
}
