import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
type NativeTabsScreen = {
    name?: string;
    options?: BottomTabNavigationOptions | ((props: any) => BottomTabNavigationOptions);
};
export declare function processNativeTabsScreens<T extends NativeTabsScreen>(screens: T[]): T[];
export {};
//# sourceMappingURL=nativeTabsOptions.d.ts.map