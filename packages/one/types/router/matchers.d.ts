import type { One } from '../vite/types';
export interface DynamicNameMatch {
    name: string;
    deep: boolean;
}
/** Match `[page]` -> `{ name: 'page', deep: false }` or `[...page]` -> `{ name: 'page', deep: true }` */
export declare function matchDynamicName(name: string): DynamicNameMatch | undefined;
/**
 * Match `[...page]` -> `page`
 * @deprecated Use matchDynamicName instead which returns {name, deep}
 */
export declare function matchDeepDynamicRouteName(name: string): string | undefined;
/** Test `/` -> `page` */
export declare function testNotFound(name: string): boolean;
/** Match `(page)` -> `page` */
export declare function matchGroupName(name: string): string | undefined;
/** Match the first array group name `(a,b,c)/(d,c)` -> `'a,b,c'` */
export declare function matchArrayGroupName(name: string): string | undefined;
export declare function getNameFromFilePath(name: string): string;
export declare function getContextKey(name: string): string;
/** Remove `.js`, `.ts`, `.jsx`, `.tsx` */
export declare function removeSupportedExtensions(name: string): string;
export declare function removeFileSystemDots(filePath: string): string;
export declare function stripGroupSegmentsFromPath(path: string): string;
export declare function stripInvisibleSegmentsFromPath(path: string): string;
/**
 * Match:
 *  - _layout files, +html, +not-found, string+api, etc
 *  - Routes can still use `+`, but it cannot be in the last segment.
 *  - .d.ts files (type definition files)
 */
export declare function isTypedRoute(name: string): boolean;
export interface DirectoryRenderModeMatch {
    /** Directory name without the render mode suffix */
    name: string;
    /** The render mode for this directory */
    renderMode: One.RouteRenderMode | 'api';
}
/**
 * Match directory render mode suffixes
 *
 * Examples:
 *   - "dashboard+ssr" -> { name: "dashboard", renderMode: "ssr" }
 *   - "blog+ssg" -> { name: "blog", renderMode: "ssg" }
 *   - "admin+spa" -> { name: "admin", renderMode: "spa" }
 */
export declare function matchDirectoryRenderMode(name: string): DirectoryRenderModeMatch | undefined;
/** Match @modal -> 'modal', @sidebar -> 'sidebar' */
export declare function matchSlotName(name: string): string | undefined;
/** Check if a directory name is a slot directory */
export declare function isSlotDirectory(name: string): boolean;
export interface InterceptMatch {
    /** Number of levels up (0 = same level, 1 = parent, Infinity = root) */
    levels: number;
    /** The actual route path after stripping intercept prefix */
    targetPath: string;
    /** Original segment like "(.)photos" or "(..)photos" */
    originalSegment: string;
}
/**
 * Match intercept prefixes: (.), (..), (...), (..)(..) etc.
 *
 * Examples:
 *   - "(.)photos" -> { levels: 0, targetPath: "photos" }
 *   - "(..)photos" -> { levels: 1, targetPath: "photos" }
 *   - "(...)photos" -> { levels: Infinity, targetPath: "photos" }
 *   - "(..)(..)photos" -> { levels: 2, targetPath: "photos" }
 */
export declare function matchInterceptPrefix(segment: string): InterceptMatch | undefined;
/**
 * Strip intercept prefixes from a path segment
 * "(.)photos" -> "photos"
 * "(..)settings" -> "settings"
 */
export declare function stripInterceptPrefix(segment: string): string;
/**
 * Check if a segment has an intercept prefix
 */
export declare function hasInterceptPrefix(segment: string): boolean;
/**
 * Strip slot prefix from path for URL generation
 * Removes @slot segments from path
 */
export declare function stripSlotSegmentsFromPath(path: string): string;
//# sourceMappingURL=matchers.d.ts.map