// @ts-ignore
import type { Query, QueryRowType } from 'zql/src/zql/query/query.js'

type GenericQuery = Query<any, any, any>

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
