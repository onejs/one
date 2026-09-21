/**
 * Copyright (c) 650 Industries (Expo). All rights reserved.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { BabelTransformerCacheKeyOptions } from 'metro-babel-transformer';
import type { TransformOptions } from './babel-core';
export type MetroBabelCaller = TransformOptions['caller'] & {
    supportsReactCompiler?: boolean;
    isReactServer?: boolean;
    isHMREnabled?: boolean;
    isServer?: boolean;
    isNodeModule?: boolean;
    preserveEnvVars?: boolean;
    isDev?: boolean;
    asyncRoutes?: boolean;
    baseUrl?: string;
    engine?: string;
    bundler?: 'metro' | (string & object);
    platform?: string | null;
    routerRoot?: string;
    projectRoot: string;
    oneViteMetroBabelConfig?: boolean;
};
export declare function getCacheKey(options?: BabelTransformerCacheKeyOptions): string;
//# sourceMappingURL=babel-transformer.d.ts.map