/**
 * Functions in this file are copied from `packages/vite/src/node/build.ts`.
 * Changes are marked with `// vxrn`.
 * Note that not all functions are copied.
 */
import type { BuildEnvironment, LibraryOptions, Logger, Plugin, ResolvedConfig } from 'vite';
import type { LoggingFunction, OutputOptions, RollupCache, RollupLog, RollupOutput, RollupWatcher } from 'rollup';
/**
 * Build an App environment, or a App library (if libraryOptions is provided)
 *
 * This function is copied from Vite's source code, with some modifications and removals.
 * It will not work as the original function as we commented out some parts that are not needed for our use case.
 */
export declare function buildEnvironment(config: ResolvedConfig, environment: BuildEnvironment, libOptions?: LibraryOptions | false): Promise<{
    cache?: RollupCache | undefined;
} & (RollupOutput | RollupOutput[] | RollupWatcher)>;
export declare function resolveBuildOutputs(outputs: OutputOptions | OutputOptions[] | undefined, libOptions: LibraryOptions | false, logger: Logger): OutputOptions | OutputOptions[] | undefined;
export declare function onRollupWarning(warning: RollupLog, warn: LoggingFunction, config: ResolvedConfig): void;
export declare function injectEnvironmentToHooks(environment: BuildEnvironment, plugin: Plugin): Plugin;
//# sourceMappingURL=build.d.ts.map