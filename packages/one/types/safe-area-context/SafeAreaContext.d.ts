import * as React from 'react';
import type { EdgeInsets, Metrics, Rect } from './SafeArea-types';
export declare const SafeAreaInsetsContext: React.Context<EdgeInsets | null>;
export declare const SafeAreaFrameContext: React.Context<Rect | null>;
export interface SafeAreaProviderProps {
    children?: React.ReactNode;
    initialMetrics?: Metrics | null;
    /**
     * @deprecated
     */
    initialSafeAreaInsets?: EdgeInsets | null;
}
export declare function SafeAreaProvider({ children, initialMetrics, initialSafeAreaInsets, ...others }: SafeAreaProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useSafeAreaInsets(): EdgeInsets;
export declare function useSafeAreaFrame(): Rect;
export type WithSafeAreaInsetsProps = {
    insets: EdgeInsets;
};
export declare function withSafeAreaInsets<T>(WrappedComponent: React.ComponentType<T & WithSafeAreaInsetsProps>): React.ForwardRefExoticComponent<React.PropsWithoutRef<T> & React.RefAttributes<unknown>>;
/**
 * @deprecated
 */
export declare function useSafeArea(): EdgeInsets;
/**
 * @deprecated
 */
export declare const SafeAreaConsumer: React.Consumer<EdgeInsets | null>;
/**
 * @deprecated
 */
export declare const SafeAreaContext: React.Context<EdgeInsets | null>;
//# sourceMappingURL=SafeAreaContext.d.ts.map