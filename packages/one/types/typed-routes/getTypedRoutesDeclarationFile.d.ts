import type { One } from '../vite/types';
export type TypedRoutesOptions = {
    /**
     * Type expressions (`typeof import(...)[name]`) for the search param schemas used
     * under a route, given the context key of its file.
     */
    getSearchParamTypes?: (contextKey: string) => string[];
};
export declare function getTypedRoutesDeclarationFile(ctx: One.RouteContext, options?: TypedRoutesOptions): string;
//# sourceMappingURL=getTypedRoutesDeclarationFile.d.ts.map