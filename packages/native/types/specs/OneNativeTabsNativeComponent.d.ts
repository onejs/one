import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    selection: string;
    sidebarAdaptable: boolean;
    tabBarMinimizeBehavior: string;
    acknowledgedEvent: Int32;
    revision: Int32;
    onNativeTabsSelectionChange?: DirectEventHandler<Readonly<{
        selection: string;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeTabsAction?: DirectEventHandler<Readonly<{
        tabId: string;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeTabsNativeComponent.d.ts.map