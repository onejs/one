import type { One } from "../vite/types";
export type SitemapEntry = {
  path: string;
  priority?: number;
  changefreq?: One.SitemapChangefreq;
  lastmod?: string | Date;
};
export type RouteSitemapData = {
  path: string;
  routeExport?: One.RouteSitemap;
};
export declare function generateSitemap(
  routes: RouteSitemapData[],
  options: One.SitemapOptions,
): string;
//# sourceMappingURL=generateSitemap.d.ts.map
