/**
 * Validates the query of a document request against the search schemas that
 * components under a route use, before the route's loader runs.
 *
 * The build gives a route module `__oneSearchSchemas`, a list of functions that
 * each read one schema. Every schema validates its own copy of the original query,
 * and the outputs are merged into `loaderProps.searchParams`.
 */
export type LoaderSearchSchemas = readonly (() => unknown)[];
export declare function getLoaderSearchSchemas(routeExported: any): LoaderSearchSchemas | null;
/**
 * Returns the loader props with `searchParams` added, or throws a 400 Response when
 * any schema rejects the query, so a loader never sees unvalidated input.
 */
export declare function withLoaderSearchParams<Props extends {
    search?: string;
} | undefined>(thunks: LoaderSearchSchemas, loaderProps: Props): Props & {
    searchParams: Record<string, unknown>;
};
//# sourceMappingURL=loaderSearchParams.d.ts.map