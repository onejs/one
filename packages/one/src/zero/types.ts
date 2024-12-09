// import type { Query, QueryRowType } from 'zql/src/zql/query/query.js'
type Query<a, b> = any
type QueryRowType<a> = any

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
