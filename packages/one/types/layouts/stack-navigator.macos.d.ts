import type { ReactElement, ReactNode } from 'react';
/**
 * The stock `@react-navigation/native-stack`, as on ios and android. macos has
 * no reanimated yet, so screens get no shared transition boundary.
 */
export declare const createStackNavigator: import("@react-navigation/core").TypedNavigatorFactory<import("@react-navigation/native-stack").NativeStackTypeBag>;
export declare function getStackNavigatorProps<Args extends {
    children: ReactElement;
}>(_children: ReactNode, screenLayout?: (props: Args) => ReactElement): {
    screenLayout: (props: Args) => ReactElement;
} | {
    screenLayout?: undefined;
};
//# sourceMappingURL=stack-navigator.macos.d.ts.map