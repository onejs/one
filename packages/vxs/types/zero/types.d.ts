import type { Query, QueryRowType } from 'zql/src/zql/query/query';
type GenericQuery = Query<any, any, any>;
export type ZeroResult<X extends GenericQuery | ((props: any) => GenericQuery)> = X extends (props: any) => infer Y ? Y extends GenericQuery ? QueryRowType<Y> : unknown : X extends GenericQuery ? QueryRowType<X> : unknown;
export {};
//# sourceMappingURL=types.d.ts.map