import { Protected } from '../views/Protected';
import { withLayoutContext } from './withLayoutContext';
type TabsType = ReturnType<typeof withLayoutContext> & {
    Protected: typeof Protected;
};
export declare const Tabs: TabsType;
export default Tabs;
//# sourceMappingURL=Tabs.d.ts.map