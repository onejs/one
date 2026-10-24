import type { One } from '../vite/types';
export type TypedRoutesOptions = {
    /**
     * Type expressions for the search param schemas used under a route, given the
     * context keys of its file and the layouts above it.
     */
    getSearchParamTypes?: (contextKeys: string[]) => string[];
};
export declare function getTypedRoutesDeclarationFile(ctx: One.RouteContext, options?: TypedRoutesOptions): string;
//# sourceMappingURL=getTypedRoutesDeclarationFile.d.ts.map