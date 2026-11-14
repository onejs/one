import type { NativeStackNavigatorProps } from '@react-navigation/native-stack';
import { Protected } from '../views/Protected.js';
import { StackHeader, StackHeaderSearchBar, StackScreen, StackToolbarBadge, StackToolbarButton, StackToolbarComponent, StackToolbarIcon, StackToolbarLabel, StackToolbarMenu, StackToolbarMenuAction, StackToolbarSearchBarSlot, StackToolbarSpacer, type StackScreenOptions } from './stack-utils/index.js';
import { type LayoutNavigator } from './withLayoutContext.js';
type StackToolbarCompound = typeof StackToolbarComponent & {
    Button: typeof StackToolbarButton;
    Menu: typeof StackToolbarMenu;
    MenuAction: typeof StackToolbarMenuAction;
    Spacer: typeof StackToolbarSpacer;
    SearchBarSlot: typeof StackToolbarSearchBarSlot;
    Label: typeof StackToolbarLabel;
    Icon: typeof StackToolbarIcon;
    Badge: typeof StackToolbarBadge;
};
type StackType = LayoutNavigator<NativeStackNavigatorProps, StackScreenOptions> & {
    Screen: typeof StackScreen;
    Header: typeof StackHeader;
    Toolbar: StackToolbarCompound;
    Protected: typeof Protected;
    SearchBar: typeof StackHeaderSearchBar;
};
export declare const Stack: StackType;
export default Stack;
//# sourceMappingURL=Stack.d.ts.map