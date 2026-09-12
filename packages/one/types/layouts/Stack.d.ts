import { Protected } from '../views/Protected';
import { StackHeader, StackHeaderSearchBar, StackScreen } from './stack-utils';
import { withLayoutContext } from './withLayoutContext';
type StackType = ReturnType<typeof withLayoutContext> & {
    Screen: typeof StackScreen;
    Header: typeof StackHeader;
    Protected: typeof Protected;
    SearchBar: typeof StackHeaderSearchBar;
};
export declare const Stack: StackType;
export default Stack;
//# sourceMappingURL=Stack.d.ts.map