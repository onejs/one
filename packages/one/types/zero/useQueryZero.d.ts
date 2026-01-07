type Schema = any;
import type { Query, QueryType, Smash } from "zql/src/zql/query/query.js";
export declare function useQuery<TSchema extends Schema, TReturn extends QueryType>(
  q: Query<TSchema, TReturn>,
  enable?: boolean,
): Smash<TReturn>;
export {};
//# sourceMappingURL=useQueryZero.d.ts.map
