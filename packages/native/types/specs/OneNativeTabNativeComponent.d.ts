import type { ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    tabId: string;
    kind: string;
    title: string;
    systemImage: string;
    badge: string;
    tabRole: string;
    slotHeight: Double;
    tabModifiers: string;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeTabNativeComponent.d.ts.map