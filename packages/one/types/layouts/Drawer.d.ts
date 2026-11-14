import { type DrawerNavigationEventMap, type DrawerNavigationOptions, type DrawerNavigatorProps } from '@react-navigation/drawer';
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native';
import { type LayoutNavigator, type LayoutScreen } from './withLayoutContext.js';
export type DrawerScreenOptions = DrawerNavigationOptions & {
    /** Web only: keep the screen's subtree mounted after it is left. */
    keepMounted?: boolean;
};
type DrawerType = LayoutNavigator<DrawerNavigatorProps, DrawerScreenOptions> & {
    Screen: LayoutScreen<DrawerScreenOptions, DrawerNavigationState<ParamListBase>, DrawerNavigationEventMap>;
};
export declare const Drawer: DrawerType;
export default Drawer;
//# sourceMappingURL=Drawer.d.ts.map