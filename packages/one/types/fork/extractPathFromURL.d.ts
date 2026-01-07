export declare function parsePathAndParamsFromExpoGoLink(url: string): {
  pathname: string;
  queryString: string;
};
export declare function parsePathFromExpoGoLink(url: string): string;
export declare function extractExpoPathFromURL(_prefixes: string[], url?: string): string;
export declare function adjustPathname(url: { hostname?: string | null; pathname: string }): string;
export declare const extractPathFromURL: typeof extractExpoPathFromURL;
//# sourceMappingURL=extractPathFromURL.d.ts.map
