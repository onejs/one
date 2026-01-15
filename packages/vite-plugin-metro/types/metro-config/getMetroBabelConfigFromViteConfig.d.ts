import type { ResolvedConfig } from 'vite';
import type { TransformOptions } from '@babel/core';
/**
 * Creates babel config for Metro transforms from Vite config.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_PLATFORM, EXPO_OS)
 * are handled automatically by the import-meta-env-plugin based on caller.platform.
 */
export declare function getMetroBabelConfigFromViteConfig(config: ResolvedConfig): TransformOptions;
//# sourceMappingURL=getMetroBabelConfigFromViteConfig.d.ts.map