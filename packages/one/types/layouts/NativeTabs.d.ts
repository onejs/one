import { Protected } from '../views/Protected';
import { withLayoutContext } from './withLayoutContext';
type NativeTabsType = ReturnType<typeof withLayoutContext> & {
    Protected: typeof Protected;
};
export declare const NativeTabs: NativeTabsType;
export default NativeTabs;
//# sourceMappingURL=NativeTabs.d.ts.map