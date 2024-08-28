export { isDepIncluded, isDepExcluded, isDepNoExternaled, isDepExternaled };
export declare function crawlFrameworkPkgs(options: any): Promise<{
    optimizeDeps: {
        include: string[];
        exclude: string[];
    };
    ssr: {
        noExternal: string[];
        external: string[];
    };
}>;
export declare function findDepPkgJsonPath(dep: any, parent: any): Promise<string | undefined>;
export declare function findClosestPkgJsonPath(dir: string, predicate?: Function): Promise<string | undefined>;
export declare function pkgNeedsOptimization(pkgJson: any, pkgJsonPath: string): Promise<boolean>;
declare function isDepIncluded(dep: any, optimizeDepsInclude: any): any;
declare function isDepExcluded(dep: any, optimizeDepsExclude: any): any;
declare function isDepNoExternaled(dep: any, ssrNoExternal: any): any;
declare function isDepExternaled(dep: any, ssrExternal: any): any;
//# sourceMappingURL=findDepsToOptimize.d.ts.map