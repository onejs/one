import { type DefaultNavigatorOptions, type ParamListBase, type TabNavigationState, type TabRouterOptions } from '@react-navigation/native';
import { type HTMLAttributes, type PropsWithChildren } from 'react';
import { type ScreenTrigger } from './common';
import { type ExpoTabsScreenOptions, type TabNavigationEventMap, type TabsContextValue } from './TabContext';
export type UseTabsOptions = Omit<DefaultNavigatorOptions<ParamListBase, TabNavigationState<any>, ExpoTabsScreenOptions, TabNavigationEventMap, any>, 'children'> & {
    backBehavior?: TabRouterOptions['backBehavior'];
};
export type TabsProps = HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
    options?: UseTabsOptions;
};
export type UseTabsWithChildrenOptions = PropsWithChildren<UseTabsOptions>;
export type UseTabsWithTriggersOptions = UseTabsOptions & {
    triggers: ScreenTrigger[];
};
export declare function useTabsWithChildren(options: UseTabsWithChildrenOptions): TabsContextValue;
export declare function useTabsWithTriggers(options: UseTabsWithTriggersOptions): TabsContextValue;
//# sourceMappingURL=Tabs.shared.d.ts.map