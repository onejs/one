import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    isPresented: boolean;
    acknowledgedEvent: Int32;
    revision: Int32;
    arrowEdge: string;
    presentationCompactAdaptation: string;
    contentWidth: Double;
    contentHeight: Double;
    onNativePopoverIsPresentedChange?: DirectEventHandler<Readonly<{
        isPresented: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativePopoverNativeComponent.d.ts.map