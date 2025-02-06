/**
 * This file is copied from the vite repo:
 * https://github.com/vitejs/vite/blob/v6.0.11/packages/vite/src/node/build.ts
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */
import 'react-native-gesture-handler';
import type { InputOption, InternalModuleFormat, LoggingFunction, ModuleFormat, OutputOptions, RollupCache, RollupLog, RollupOptions, RollupOutput, RollupWatcher, WatcherOptions } from 'rollup';
import { type InlineConfig, type Logger, type ResolvedConfig, type RollupDynamicImportVarsOptions, type TerserOptions, type Plugin, type EnvironmentOptions } from 'vite';
import type { RollupCommonJSOptions } from '@rollup/plugin-commonjs';
import type { TransformOptions } from 'esbuild';
export declare const ESBUILD_MODULES_TARGET: string[];
import type { PartialEnvironment } from './baseEnvironment';
import { BaseEnvironment } from './baseEnvironment';
export declare function resolveEnvironmentPlugins(environment: PartialEnvironment): Promise<Plugin[]>;
export interface BuildEnvironmentOptions {
    /**
     * Compatibility transform target. The transform is performed with esbuild
     * and the lowest supported target is es2015. Note this only handles
     * syntax transformation and does not cover polyfills
     *
     * Default: 'modules' - transpile targeting browsers that natively support
     * dynamic es module imports and `import.meta`
     * (Chrome 87+, Firefox 78+, Safari 14+, Edge 88+).
     *
     * Another special value is 'esnext' - which only performs minimal transpiling
     * (for minification compat).
     *
     * For custom targets, see https://esbuild.github.io/api/#target and
     * https://esbuild.github.io/content-types/#javascript for more details.
     * @default 'modules'
     */
    target?: 'modules' | TransformOptions['target'] | false;
    /**
     * whether to inject module preload polyfill.
     * Note: does not apply to library mode.
     * @default true
     * @deprecated use `modulePreload.polyfill` instead
     */
    polyfillModulePreload?: boolean;
    /**
     * Configure module preload
     * Note: does not apply to library mode.
     * @default true
     */
    modulePreload?: boolean | ModulePreloadOptions;
    /**
     * Directory relative from `root` where build output will be placed. If the
     * directory exists, it will be removed before the build.
     * @default 'dist'
     */
    outDir?: string;
    /**
     * Directory relative from `outDir` where the built js/css/image assets will
     * be placed.
     * @default 'assets'
     */
    assetsDir?: string;
    /**
     * Static asset files smaller than this number (in bytes) will be inlined as
     * base64 strings. If a callback is passed, a boolean can be returned to opt-in
     * or opt-out of inlining. If nothing is returned the default logic applies.
     *
     * Default limit is `4096` (4 KiB). Set to `0` to disable.
     * @default 4096
     */
    assetsInlineLimit?: number | ((filePath: string, content: Buffer) => boolean | undefined);
    /**
     * Whether to code-split CSS. When enabled, CSS in async chunks will be
     * inlined as strings in the chunk and inserted via dynamically created
     * style tags when the chunk is loaded.
     * @default true
     */
    cssCodeSplit?: boolean;
    /**
     * An optional separate target for CSS minification.
     * As esbuild only supports configuring targets to mainstream
     * browsers, users may need this option when they are targeting
     * a niche browser that comes with most modern JavaScript features
     * but has poor CSS support, e.g. Android WeChat WebView, which
     * doesn't support the #RGBA syntax.
     * @default target
     */
    cssTarget?: TransformOptions['target'] | false;
    /**
     * Override CSS minification specifically instead of defaulting to `build.minify`,
     * so you can configure minification for JS and CSS separately.
     * @default 'esbuild'
     */
    cssMinify?: boolean | 'esbuild' | 'lightningcss';
    /**
     * If `true`, a separate sourcemap file will be created. If 'inline', the
     * sourcemap will be appended to the resulting output file as data URI.
     * 'hidden' works like `true` except that the corresponding sourcemap
     * comments in the bundled files are suppressed.
     * @default false
     */
    sourcemap?: boolean | 'inline' | 'hidden';
    /**
     * Set to `false` to disable minification, or specify the minifier to use.
     * Available options are 'terser' or 'esbuild'.
     * @default 'esbuild'
     */
    minify?: boolean | 'terser' | 'esbuild';
    /**
     * Options for terser
     * https://terser.org/docs/api-reference#minify-options
     *
     * In addition, you can also pass a `maxWorkers: number` option to specify the
     * max number of workers to spawn. Defaults to the number of CPUs minus 1.
     */
    terserOptions?: TerserOptions;
    /**
     * Will be merged with internal rollup options.
     * https://rollupjs.org/configuration-options/
     */
    rollupOptions?: RollupOptions;
    /**
     * Options to pass on to `@rollup/plugin-commonjs`
     */
    commonjsOptions?: RollupCommonJSOptions;
    /**
     * Options to pass on to `@rollup/plugin-dynamic-import-vars`
     */
    dynamicImportVarsOptions?: RollupDynamicImportVarsOptions;
    /**
     * Whether to write bundle to disk
     * @default true
     */
    write?: boolean;
    /**
     * Empty outDir on write.
     * @default true when outDir is a sub directory of project root
     */
    emptyOutDir?: boolean | null;
    /**
     * Copy the public directory to outDir on write.
     * @default true
     */
    copyPublicDir?: boolean;
    /**
     * Whether to emit a .vite/manifest.json under assets dir to map hash-less filenames
     * to their hashed versions. Useful when you want to generate your own HTML
     * instead of using the one generated by Vite.
     *
     * Example:
     *
     * ```json
     * {
     *   "main.js": {
     *     "file": "main.68fe3fad.js",
     *     "css": "main.e6b63442.css",
     *     "imports": [...],
     *     "dynamicImports": [...]
     *   }
     * }
     * ```
     * @default false
     */
    manifest?: boolean | string;
    /**
     * Build in library mode. The value should be the global name of the lib in
     * UMD mode. This will produce esm + cjs + umd bundle formats with default
     * configurations that are suitable for distributing libraries.
     * @default false
     */
    lib?: LibraryOptions | false;
    /**
     * Produce SSR oriented build. Note this requires specifying SSR entry via
     * `rollupOptions.input`.
     * @default false
     */
    ssr?: boolean | string;
    /**
     * Generate SSR manifest for determining style links and asset preload
     * directives in production.
     * @default false
     */
    ssrManifest?: boolean | string;
    /**
     * Emit assets during SSR.
     * @default false
     */
    ssrEmitAssets?: boolean;
    /**
     * Emit assets during build. Frameworks can set environments.ssr.build.emitAssets
     * By default, it is true for the client and false for other environments.
     */
    emitAssets?: boolean;
    /**
     * Set to false to disable reporting compressed chunk sizes.
     * Can slightly improve build speed.
     * @default true
     */
    reportCompressedSize?: boolean;
    /**
     * Adjust chunk size warning limit (in kB).
     * @default 500
     */
    chunkSizeWarningLimit?: number;
    /**
     * Rollup watch options
     * https://rollupjs.org/configuration-options/#watch
     * @default null
     */
    watch?: WatcherOptions | null;
    /**
     * create the Build Environment instance
     */
    createEnvironment?: (name: string, config: ResolvedConfig) => Promise<BuildEnvironment> | BuildEnvironment;
}
export type BuildOptions = BuildEnvironmentOptions;
export interface LibraryOptions {
    /**
     * Path of library entry
     */
    entry: InputOption;
    /**
     * The name of the exposed global variable. Required when the `formats` option includes
     * `umd` or `iife`
     */
    name?: string;
    /**
     * Output bundle formats
     * @default ['es', 'umd']
     */
    formats?: LibraryFormats[];
    /**
     * The name of the package file output. The default file name is the name option
     * of the project package.json. It can also be defined as a function taking the
     * format as an argument.
     */
    fileName?: string | ((format: ModuleFormat, entryName: string) => string);
    /**
     * The name of the CSS file output if the library imports CSS. Defaults to the
     * same value as `build.lib.fileName` if it's set a string, otherwise it falls
     * back to the name option of the project package.json.
     */
    cssFileName?: string;
}
export type LibraryFormats = 'es' | 'cjs' | 'umd' | 'iife' | 'system';
export interface ModulePreloadOptions {
    /**
     * Whether to inject a module preload polyfill.
     * Note: does not apply to library mode.
     * @default true
     */
    polyfill?: boolean;
    /**
     * Resolve the list of dependencies to preload for a given dynamic import
     * @experimental
     */
    resolveDependencies?: ResolveModulePreloadDependenciesFn;
}
export interface ResolvedModulePreloadOptions {
    polyfill: boolean;
    resolveDependencies?: ResolveModulePreloadDependenciesFn;
}
export type ResolveModulePreloadDependenciesFn = (filename: string, deps: string[], context: {
    hostId: string;
    hostType: 'html' | 'js';
}) => string[];
export interface ResolvedBuildEnvironmentOptions extends Required<Omit<BuildEnvironmentOptions, 'polyfillModulePreload'>> {
    modulePreload: false | ResolvedModulePreloadOptions;
}
export declare const buildEnvironmentOptionsDefaults: Readonly<{
    target: "modules";
    /** @deprecated */
    polyfillModulePreload: true;
    modulePreload: true;
    outDir: "dist";
    assetsDir: "assets";
    assetsInlineLimit: 4096;
    sourcemap: false;
    terserOptions: {};
    rollupOptions: {};
    commonjsOptions: {
        include: RegExp[];
        extensions: string[];
    };
    dynamicImportVarsOptions: {
        warnOnError: boolean;
        exclude: RegExp[];
    };
    write: true;
    emptyOutDir: null;
    copyPublicDir: true;
    manifest: false;
    lib: false;
    ssrManifest: false;
    ssrEmitAssets: false;
    reportCompressedSize: true;
    chunkSizeWarningLimit: 500;
    watch: null;
}>;
export declare function resolveBuildEnvironmentOptions(raw: BuildEnvironmentOptions, logger: Logger, consumer: 'client' | 'server' | undefined): ResolvedBuildEnvironmentOptions;
/**
 * Bundles a single environment for production.
 * Returns a Promise containing the build result.
 */
export declare function build(inlineConfig?: InlineConfig): Promise<RollupOutput | RollupOutput[] | RollupWatcher>;
export declare function resolveBuildOutputs(outputs: OutputOptions | OutputOptions[] | undefined, libOptions: LibraryOptions | false, logger: Logger): OutputOptions | OutputOptions[] | undefined;
export declare function onRollupWarning(warning: RollupLog, warn: LoggingFunction, environment: BuildEnvironment): void;
export declare function injectEnvironmentToHooks(environment: BuildEnvironment, plugin: Plugin): Plugin;
export type RenderBuiltAssetUrl = (filename: string, type: {
    type: 'asset' | 'public';
    hostId: string;
    hostType: 'js' | 'css' | 'html';
    ssr: boolean;
}) => string | {
    relative?: boolean;
    runtime?: string;
} | undefined;
export declare function toOutputFilePathInJS(environment: PartialEnvironment, filename: string, type: 'asset' | 'public', hostId: string, hostType: 'js' | 'css' | 'html', toRelative: (filename: string, hostType: string) => string | {
    runtime: string;
}): string | {
    runtime: string;
};
export declare function createToImportMetaURLBasedRelativeRuntime(format: InternalModuleFormat, isWorker: boolean): (filename: string, importer: string) => {
    runtime: string;
};
export declare function toOutputFilePathWithoutRuntime(filename: string, type: 'asset' | 'public', hostId: string, hostType: 'js' | 'css' | 'html', config: ResolvedConfig, toRelative: (filename: string, hostId: string) => string): string;
export declare const toOutputFilePathInCss: typeof toOutputFilePathWithoutRuntime;
export declare const toOutputFilePathInHtml: typeof toOutputFilePathWithoutRuntime;
export declare class BuildEnvironment extends BaseEnvironment {
    mode: "build";
    constructor(name: string, config: ResolvedConfig, setup?: {
        options?: EnvironmentOptions;
    });
    init(): Promise<void>;
}
export interface ViteBuilder {
    environments: Record<string, BuildEnvironment>;
    config: ResolvedConfig;
    buildApp(): Promise<void>;
    build(environment: BuildEnvironment, rollupCache?: RollupCache): Promise<(RollupOutput | RollupOutput[] | RollupWatcher) & {
        cache?: RollupCache | undefined;
    }>;
}
export interface BuilderOptions {
    /**
     * Whether to share the config instance among environments to align with the behavior of dev server.
     *
     * @default false
     * @experimental
     */
    sharedConfigBuild?: boolean;
    /**
     * Whether to share the plugin instances among environments to align with the behavior of dev server.
     *
     * @default false
     * @experimental
     */
    sharedPlugins?: boolean;
    buildApp?: (builder: ViteBuilder) => Promise<void>;
}
export declare const builderOptionsDefaults: Readonly<{
    sharedConfigBuild: false;
    sharedPlugins: false;
}>;
export declare function resolveBuilderOptions(options: BuilderOptions | undefined): ResolvedBuilderOptions | undefined;
export type ResolvedBuilderOptions = Required<BuilderOptions>;
/**
 * Creates a ViteBuilder to orchestrate building multiple environments.
 * @experimental
 */
export declare function createBuilder(inlineConfig?: InlineConfig, useLegacyBuilder?: null | boolean): Promise<ViteBuilder>;
//# sourceMappingURL=build.d.ts.map