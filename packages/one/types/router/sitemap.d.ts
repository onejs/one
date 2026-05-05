import type { OneRouter } from '../interfaces/router';
import type { RouteNode } from './Route';
export type SitemapType = {
    contextKey: string;
    filename: string;
    href: string | OneRouter.Href;
    isInitial: boolean;
    isInternal: boolean;
    isGenerated: boolean;
    children: SitemapType[];
};
export declare function useSitemap(): SitemapType | null;
export declare function getSitemap(root: RouteNode | null): SitemapType | null;
//# sourceMappingURL=sitemap.d.ts.map