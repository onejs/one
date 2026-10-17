import type { ReactElement, ReactNode } from 'react';
/**
 * Returns a Stack navigator factory. On native this is the stock
 * `@react-navigation/native-stack`; on web this is replaced via the
 * `.web.ts` sibling with the headless navigator.
 */
export declare const createStackNavigator: import("@react-navigation/core").TypedNavigatorFactory<import("@react-navigation/native-stack").NativeStackTypeBag>;
export declare function getStackNavigatorProps<Args extends {
    children: ReactElement;
}>(_children: ReactNode, screenLayout?: (props: Args) => ReactElement): {
    screenLayout: (props: Args) => import("react").JSX.Element;
};
//# sourceMappingURL=stack-navigator.d.ts.map