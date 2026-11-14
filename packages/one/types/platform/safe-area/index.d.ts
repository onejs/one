import type { ReactElement } from 'react';
import type { Metrics, NativeSafeAreaProviderProps } from './types.js';
export type * from './types.js';
export { buildSafeAreaInsetStyle, keyboardSafeBottom, providerEventToMetrics, resolveOverlappingInsets, resolveSafeAreaEdgeModes, } from './insets.js';
export declare function getInitialWindowMetrics(): Metrics | null;
export declare function NativeSafeAreaProvider(_props: NativeSafeAreaProviderProps): ReactElement;
//# sourceMappingURL=index.d.ts.map