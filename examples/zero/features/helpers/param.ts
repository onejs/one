import type { Query, QueryResultRow, Smash } from 'zql/src/zql/query/query'

export const expect = <A, B extends (params: A) => any>(expect: A, run: B) => {
  return (params: A) => {
    return run(params) as B extends (p: any) => infer X ? X : unknown
  }
}

export type ExpectedResult<T> = T extends (a: any) => infer X
  ? X extends Query<any, infer B>
    ? Smash<B>
    : unknown
  : unknown
