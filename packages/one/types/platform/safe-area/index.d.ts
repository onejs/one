import type { ReactElement } from 'react';
import type { Metrics, NativeSafeAreaProviderProps } from './types';
export type * from './types';
export { buildSafeAreaInsetStyle, keyboardSafeBottom, providerEventToMetrics, resolveOverlappingInsets, resolveSafeAreaEdgeModes, } from './insets';
export declare function getInitialWindowMetrics(): Metrics | null;
export declare function NativeSafeAreaProvider(_props: NativeSafeAreaProviderProps): ReactElement;
//# sourceMappingURL=index.d.ts.map