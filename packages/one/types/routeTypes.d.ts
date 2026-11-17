import type { WarmStartOptions } from './router/warmStateShared.js';
export declare namespace One {
    type RouteRenderMode = 'ssg' | 'spa' | 'ssr';
    type RouteType = RouteRenderMode | 'api' | 'layout';
    type ClientData = Record<string, any>;
    type RouteOptions = {
        routeModes?: Record<string, RouteRenderMode>;
    };
    interface RouteContext {
        keys(): string[];
        (id: string): any;
        <T>(id: string): T;
        resolve(id: string): string;
        id: string;
    }
    type RouteMatch = {
        /** Route identifier (e.g., "docs/_layout" or "docs/intro") */
        routeId: string;
        /** The pathname segment this route matched */
        pathname: string;
        /** URL params extracted for this route */
        params: Record<string, string | string[]>;
        /** Data returned from this route's loader */
        loaderData: unknown;
    };
    type ServerContext = {
        css?: string[];
        /** When inlineLayoutCSS is enabled, this contains the actual CSS content to inline */
        cssContents?: string[];
        /** Number of inline CSS entries - used for hydration matching when cssContents is stripped */
        cssInlineCount?: number;
        postRenderData?: any;
        loaderData?: any;
        loaderProps?: any;
        mode?: 'spa' | 'ssg' | 'ssr' | 'spa-shell';
        routePreloads?: string[];
        /**
         * All matched routes with their loader data.
         * Ordered from root layout to leaf page (parent → child).
         */
        matches?: RouteMatch[];
    };
    type Flags = {
        warmStart?: boolean | WarmStartOptions;
    };
    type SitemapChangefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    type RouteSitemap = {
        /**
         * Priority for this route (0.0 to 1.0).
         */
        priority?: number;
        /**
         * Change frequency for this route.
         */
        changefreq?: SitemapChangefreq;
        /**
         * Last modification date for this route.
         */
        lastmod?: string | Date;
        /**
         * Exclude this route from the sitemap.
         */
        exclude?: boolean;
    };
}
//# sourceMappingURL=routeTypes.d.ts.map