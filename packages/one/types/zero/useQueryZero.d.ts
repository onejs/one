import type { Schema } from 'zql/src/zql/query/schema.js';
import type { Query, QueryType, Smash } from 'zql/src/zql/query/query.js';
export declare function useQuery<TSchema extends Schema, TReturn extends QueryType>(q: Query<TSchema, TReturn>, enable?: boolean): Smash<TReturn>;
//# sourceMappingURL=useQueryZero.d.ts.map