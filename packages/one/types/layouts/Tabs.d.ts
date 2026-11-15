import { type BottomTabNavigationEventMap, type BottomTabNavigationOptions, type BottomTabNavigatorProps } from '@react-navigation/bottom-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { Protected } from '../views/Protected.js';
import { type LayoutNavigator, type LayoutScreen } from './withLayoutContext.js';
export type TabsScreenOptions = BottomTabNavigationOptions & {
    /** Web only: the tab's link target. Native layouts reject it. */
    href?: string | null;
    /** Web only: keep the tab's subtree mounted after it is left. */
    keepMounted?: boolean;
};
type TabsType = LayoutNavigator<BottomTabNavigatorProps, TabsScreenOptions> & {
    Screen: LayoutScreen<TabsScreenOptions, TabNavigationState<ParamListBase>, BottomTabNavigationEventMap>;
    Protected: typeof Protected;
};
export declare const Tabs: TabsType;
export default Tabs;
//# sourceMappingURL=Tabs.d.ts.map