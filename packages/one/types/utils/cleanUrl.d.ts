export declare function encodeReservedFilenameChars(path: string): string;
export declare function decodeReservedFilenameChars(path: string): string;
export declare function getPreloadPath(currentPath: string): string;
export declare function getPreloadCSSPath(currentPath: string): string;
export declare const LOADER_SEARCH_PARAM = "__one_search";
export declare function splitLoaderKey(key: string): [path: string, search: string];
export declare function toLoaderKey(path: string, search: string): string;
export declare function appendLoaderQuery(url: string, name: string, value: string): string;
export declare function readLoaderSearch(url: URL): string;
export declare function getLoaderPath(currentPath: string, includeUrl?: boolean, cacheBust?: string, search?: string): string;
export declare function getNativeLoaderPath(currentPath: string): string;
export declare function getPathFromLoaderPath(loaderPath: string): string;
//# sourceMappingURL=cleanUrl.d.ts.map