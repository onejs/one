export type MetroContextParams = {
    recursive: boolean;
    filter: {
        pattern: string;
        flags: string;
    };
    mode: 'sync' | 'eager' | 'lazy' | 'lazy-once';
};
export type MetroDependencyData = {
    key?: string;
    asyncType?: 'async' | 'weak' | 'maybeSync' | null;
    contextParams?: MetroContextParams;
    locs: Array<{
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    }>;
    isOptional?: boolean;
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
export type OneRouterMetroOptions = {
    ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY?: string;
    ONE_ROUTER_LINKING_CONFIG?: unknown;
    ONE_ROUTER_ROOT_FOLDER_NAME?: string;
    ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING?: string;
    ONE_SETUP_FILE_NATIVE?: string;
};
/**
 * one's router options reach the transformer on the same channel the babel
 * transformer reads them from, as the options of its `one-router-metro` plugin
 * entry.
 */
export declare function getOneRouterMetroOptions(options: MetroWorkerOptions): OneRouterMetroOptions | undefined;
/**
 * Reads the router root one's babel preset hands to
 * `babel-plugin-remove-server-code`. Its absence means one did not ask for
 * server-code removal, so the step is skipped rather than guessed at.
 */
export declare function getRemoveServerCodeRouterRoot(options: MetroWorkerOptions): string | undefined;
/**
 * Reads the alias map one's babel preset hands to `babel-plugin-module-resolver`
 * (its "vite-tsconfig-paths for Metro"). Keys ending in `$` are exact matches,
 * the rest are prefixes.
 */
export declare function getModuleResolverAliases(options: MetroWorkerOptions): Record<string, string> | undefined;
/**
 * Resolves one tsconfig-path alias to a specifier relative to the importing
 * file. The native worker replaces the babel transformer, so without this every
 * aliased import fails to resolve.
 */
export declare function resolveAliasSpecifier(specifier: string, filename: string, projectRoot: string, aliases: Record<string, string>): string | undefined;
/**
 * Rewrites aliased import/export/require specifiers in place.
 */
export declare function applyModuleResolverAliases(code: string, filename: string, projectRoot: string, aliases: Record<string, string>): string;
/**
 * Native port of babel-preset-expo's `expo-inline-or-reference-env-vars` and
 * one's `babel-plugin-inline-one-server-url`. In production every
 * `process.env.EXPO_PUBLIC_*` read is inlined as a literal; in development each
 * one is routed through the `expo/virtual/env` module so edits to .env take
 * effect without a full rebuild. Without this the reads survive into the bundle
 * and every EXPO_PUBLIC_ value is undefined at runtime.
 *
 * `process.env.ONE_SERVER_URL` is inlined in both modes, matching one's plugin:
 * it is how a native bundle knows where to fetch loader data from, and a native
 * runtime has no `process.env` to read it back out of.
 *
 * Both live in one pass because they are the same rewrite over the same walk,
 * and a second parse of every file is the cost this transformer exists to avoid.
 */
export declare function applyInlineEnvVars(code: string, filename: string, isProduction: boolean): string;
/**
 * Native port of one's `babel-plugin-environment-guard`.
 */
export declare function applyEnvironmentGuard(code: string, filename: string): string;
/**
 * Native port of one's `babel-plugin-one-router-metro`. The native worker
 * replaces the babel transformer wholesale, so without this the router entry
 * keeps `process.env.ONE_ROUTER_*` reads that never resolve: `require.context`
 * gets a non-literal regex and metro drops the entire route tree, and the
 * configured setup file is never imported.
 */
export declare function applyOneRouterMetro(code: string, filename: string, options: OneRouterMetroOptions): string;
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
export declare function getDependencyKey(name: string, isESM: boolean, asyncType?: 'async' | 'weak' | 'maybeSync' | null, contextParams?: MetroContextParams): string;
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
    allowOptionalDependencies?: any;
}): MetroDependency[];
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