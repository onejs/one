export type MetroDependencyData = {
    key?: string;
    asyncType?: 'async' | 'weak' | 'maybeSync' | null;
    locs: Array<{
        line: number;
        column: number;
    }>;
    isESMImportAtSource?: boolean;
    isESMImport?: boolean;
    index?: number;
};
export type MetroDependency = {
    name: string;
    data: MetroDependencyData;
};
export type MetroOutputData = {
    code: string;
    lineCount: number;
    map: any[];
    functionMap?: any;
};
export type MetroOutput = {
    data: MetroOutputData;
    type: 'js/module' | 'js/script' | 'js/module/asset';
};
export type MetroWorkerResult = {
    dependencies: MetroDependency[];
    output: MetroOutput[];
};
export type MetroWorkerConfig = {
    assetRegistryPath?: string;
    assetPlugins?: string[];
    asyncRequireModulePath?: string;
    globalPrefix?: string;
    unstable_dependencyMapReservedName?: string;
    unstable_disableModuleWrapping?: boolean;
    minifierPath?: string;
    minifierConfig?: any;
    publicPath?: string;
    allowOptionalDependencies?: any;
    dynamicDepsInPackages?: string;
};
export type MetroWorkerOptions = {
    dev?: boolean;
    minify?: boolean;
    platform?: 'ios' | 'android' | 'web' | string;
    type?: 'module' | 'script' | 'asset';
    customTransformOptions?: Record<string, any>;
    unstable_transformProfile?: string;
    moduleId?: number | string;
    dependencyIds?: Array<number | string>;
};
export type WrapModuleOptions = {
    globalPrefix?: string;
    moduleId?: number | string;
    dependencyIds?: Array<number | string>;
    dependencyMapName?: string;
    requireAlias?: boolean;
};
/**
 * Recursively collects identifier names from patterns (bindings).
 */
export declare function collectPatternNames(pattern: any, names: Set<string>): void;
/**
 * Recursively collects all hoisted `var` declarations and `FunctionDeclaration` names
 * within a function body or program, stopping traversal at nested function boundaries.
 */
export declare function collectHoistedBindings(node: any, names: Set<string>): void;
/**
 * Collects block-scoped declarations (let, const, class, and block-level function declarations)
 * directly declared in this block (not inside nested blocks).
 */
export declare function collectBlockBindings(statements: any[], names: Set<string>): void;
/**
 * Lexical scope tracker for identifier shadowing analysis.
 */
export declare class ScopeTracker {
    private stack;
    enter(initialBindings?: Iterable<string>): void;
    exit(): void;
    add(name: string): void;
    currentScope(): Set<string>;
    addPattern(pattern: any): void;
    isShadowed(name: string): boolean;
}
/**
 * Cache key generation without any Babel references.
 */
export declare function getCacheKey(config?: MetroWorkerConfig, opts?: any): string;
/**
 * Converts a standard SourceMap V3 object into Metro's raw mapping segment tuples.
 * Metro expects an array of tuples: [line, column] or [line, column, origLine, origCol, name?]
 * Mappings must be strictly sorted by generatedLine ascending, then generatedColumn ascending.
 */
export declare function convertSourceMapToMetroRawMappings(composedMap: any): Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]>;
/**
 * Counts lines and ensures map terminates per Metro contract.
 */
export declare function countLinesAndTerminateMap(code: string, map?: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]>): {
    lineCount: number;
    map: Array<[number, number] | [number, number, number, number] | [number, number, number, number, string]>;
};
/**
 * Wraps JSON in CommonJS via module.exports and Metro's module wrapper.
 */
export declare function wrapJson(source: string, options?: {
    globalPrefix?: string;
    moduleId?: number | string;
    dependencyIds?: Array<number | string>;
}): string;
/**
 * Wraps CommonJS code in Metro's standard define wrapper:
 * __d(function (global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) { ... }, moduleId, [dependencyIds])
 */
export declare function wrapModule(code: string, options?: WrapModuleOptions): string;
/**
 * Metro canonical dependency qualifier key format.
 */
export declare function getDependencyKey(name: string, isESM: boolean, asyncType?: 'async' | 'weak' | 'maybeSync' | null): string;
/**
 * Rewrites require("dep") calls to Metro's dependency ABI:
 * require(_dependencyMap[index], "dep")
 * Respects lexical scope shadowing (does NOT rewrite local parameters or variables named require).
 */
export type RewriteDependencyCallsResult = {
    code: string;
    map: any;
    toString(): string;
};
/**
 * Rewrites require("dep") calls and import("dep") expressions to Metro's dependency ABI:
 * require(_dependencyMap[index], "dep")
 * require(_dependencyMap[asyncIndex], "metro-runtime/src/modules/asyncRequire")(_dependencyMap[depIndex], _dependencyMap.paths, "dep")
 * Respects lexical scope shadowing and JS hoisting rules.
 * Returns { code, map, toString() } preserving source maps for the rewrite stage.
 */
export declare function rewriteDependencyCalls(code: string, dependencies: MetroDependency[], depMapName?: string, filename?: string, asyncRequirePath?: string): RewriteDependencyCallsResult;
/**
 * Extracts dependencies using oxc-parser (zero Babel).
 * Respects lexical scope shadowing and JS hoisting rules.
 */
export declare function extractDependencies(code: string, filename: string, options?: {
    asyncRequireModulePath?: string;
}): MetroDependency[];
/**
 * Main transform entry point conforming to Metro's worker contract with ZERO Babel.
 */
export declare function transform(config: MetroWorkerConfig, projectRoot: string, filename: string, data: Buffer | string, options: MetroWorkerOptions): Promise<MetroWorkerResult>;
declare const _default: {
    transform: typeof transform;
    getCacheKey: typeof getCacheKey;
    wrapModule: typeof wrapModule;
    wrapJson: typeof wrapJson;
    extractDependencies: typeof extractDependencies;
    rewriteDependencyCalls: typeof rewriteDependencyCalls;
    convertSourceMapToMetroRawMappings: typeof convertSourceMapToMetroRawMappings;
};
export default _default;
//# sourceMappingURL=metroNativeWorker.d.ts.map