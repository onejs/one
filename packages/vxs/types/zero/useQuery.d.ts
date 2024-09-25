import type { Query, QueryResultRow, Smash } from 'zql/src/zql/query/query.js';
import type { Schema } from 'zql/src/zql/query/schema.js';
export declare function useQuery<TSchema extends Schema, TReturn extends Array<QueryResultRow>>(query: Query<TSchema, TReturn> | undefined, dependencies?: readonly unknown[], enabled?: boolean): Smash<TReturn>;
//# sourceMappingURL=useQuery.d.ts.map