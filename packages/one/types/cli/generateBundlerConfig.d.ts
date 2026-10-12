import type { One } from '../vite/types';
/**
 * Marker that identifies a bundler config as One-generated. If the file
 * still contains this marker we can safely regenerate it; if the user
 * removed the marker we treat the file as customized and never overwrite.
 */
export declare const ONE_GENERATED_MARKER = "@one/generated bundler-config";
export type OneBundlerConfigOptions = {
    routerRoot?: string;
    ignoredRouteFiles?: Array<`**/*${string}`>;
    linking?: NonNullable<One.PluginOptions['router']>['linking'];
    setupFile?: One.PluginOptions['setupFile'];
};
export declare function getBundlerConfigOptionsFromOneOptions(oneOptions?: One.PluginOptions): OneBundlerConfigOptions;
export type GenerateBundlerConfigArgs = {
    /** Project root. Defaults to `process.cwd()`. */
    cwd?: string;
    /** loaded one plugin options from vite.config. */
    oneOptions?: One.PluginOptions;
    /** Overwrite even when the file has been customized (marker removed). */
    force?: boolean;
    /** Just verify state without writing. exits non-zero when out of sync. */
    check?: boolean;
    /** Suppress logging. */
    quiet?: boolean;
    /**
     * Write files WITHOUT the `@one/generated` marker. The user owns the file
     * after this; subsequent CI auto-gen runs will treat it as customized and
     * skip it. used by `one metro-eject`.
     */
    eject?: boolean;
};
export type FileResult = {
    filePath: string;
    action: 'wrote' | 'kept' | 'skipped-customized' | 'skipped-other-format' | 'would-write' | 'would-overwrite';
    reason?: string;
};
export declare function generateBundlerConfig(args?: GenerateBundlerConfigArgs): {
    results: FileResult[];
    ok: boolean;
};
//# sourceMappingURL=generateBundlerConfig.d.ts.map