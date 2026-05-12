/**
 * Marker that identifies a bundler config as One-generated. If the file
 * still contains this marker we can safely regenerate it; if the user
 * removed the marker we treat the file as customized and never overwrite.
 */
export declare const ONE_GENERATED_MARKER = "@one/generated bundler-config";
export type GenerateBundlerConfigArgs = {
    /** Project root. Defaults to `process.cwd()`. */
    cwd?: string;
    /** Overwrite even when the file has been customized (marker removed). */
    force?: boolean;
    /** Just verify state without writing — exits non-zero when out of sync. */
    check?: boolean;
    /** Suppress logging. */
    quiet?: boolean;
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
/**
 * True when running on a CI/EAS worker. We only auto-generate bundler-config
 * files in CI so they never appear in a developer's local working tree.
 *
 * Set `CI=1` (or `EAS_BUILD=true`) ahead of `eas update` if you need to
 * publish from a local machine.
 */
export declare function isCiEnvironment(): boolean;
/**
 * Postinstall hook: when expo-updates is in deps AND we're running on
 * a CI/EAS worker, ensure the bundler-config files exist so the
 * subsequent `expo export` / EXUpdates Metro pass succeeds.
 *
 * No-op locally so the files never show up in a developer's working tree.
 */
export declare function maybeGenerateBundlerConfigOnInstall(cwd?: string): void;
//# sourceMappingURL=generateBundlerConfig.d.ts.map