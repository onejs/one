import type { Query, QueryResultRow, Smash } from 'zql/src/zql/query/query';
import type { Schema } from 'zql/src/zql/query/schema.js';
export declare function useQuery<TSchema extends Schema, TReturn extends Array<QueryResultRow>>(q: Query<TSchema, TReturn> | undefined, dependencies?: readonly unknown[], enabled?: boolean): Smash<TReturn>;
//# sourceMappingURL=createQuery.d.ts.map