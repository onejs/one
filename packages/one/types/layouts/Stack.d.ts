import { Protected } from '../views/Protected';
import { StackHeader, StackHeaderSearchBar, StackScreen, StackToolbarComponent, StackToolbarItem, StackToolbarLeading, StackToolbarMenu, StackToolbarTrailing } from './stack-utils';
import { StackToolbarBottom } from './stack-utils/StackToolbarBottomHost';
import { withLayoutContext } from './withLayoutContext';
type StackToolbarCompound = typeof StackToolbarComponent & {
    Leading: typeof StackToolbarLeading;
    /** One Header-convention alias of Leading. */
    Left: typeof StackToolbarLeading;
    Trailing: typeof StackToolbarTrailing;
    /** One Header-convention alias of Trailing. */
    Right: typeof StackToolbarTrailing;
    Bottom: typeof StackToolbarBottom;
    Item: typeof StackToolbarItem;
    Menu: typeof StackToolbarMenu;
};
type StackType = ReturnType<typeof withLayoutContext> & {
    Screen: typeof StackScreen;
    Header: typeof StackHeader;
    Toolbar: StackToolbarCompound;
    Protected: typeof Protected;
    SearchBar: typeof StackHeaderSearchBar;
};
export declare const Stack: StackType;
export default Stack;
//# sourceMappingURL=Stack.d.ts.map