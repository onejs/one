export type ScanDepsResult = {
    prebundleDeps: string[];
    hasReanimated: boolean;
    hasNativewind: boolean;
};
/** Known packages that will fail to pre-bundle, or no need to pre-bundle. */
export declare const EXCLUDE_LIST: string[];
export declare const EXCLUDE_LIST_SET: Set<string>;
export declare const INCLUDE_LIST: string[];
export declare const INCLUDE_LIST_SET: Set<string>;
export declare function scanDepsToOptimize(packageJsonPath: string, options?: {
    parentDepNames?: string[];
    proceededDeps?: Map<string, string[]>;
    /** If the content of the package.json is already read before calling this function, pass it here to avoid reading it again */
    pkgJsonContent?: any;
}): Promise<ScanDepsResult>;
export declare function findDepPkgJsonPath(dep: any, dependent: any): Promise<string | undefined>;
//# sourceMappingURL=scanDepsToOptimize.d.ts.map