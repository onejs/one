import { type DrawerNavigationEventMap, type DrawerNavigationOptions, type DrawerNavigatorProps } from '@react-navigation/drawer';
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native';
import { type LayoutNavigator, type LayoutScreen } from './withLayoutContext';
type DrawerType = LayoutNavigator<DrawerNavigatorProps> & {
    Screen: LayoutScreen<DrawerNavigationOptions, DrawerNavigationState<ParamListBase>, DrawerNavigationEventMap>;
};
export declare const Drawer: DrawerType;
export default Drawer;
//# sourceMappingURL=Drawer.d.ts.map