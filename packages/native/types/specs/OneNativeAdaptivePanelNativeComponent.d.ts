import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
type NativeAdaptivePanelDetent = Readonly<{
    type: string;
    value: Double;
}>;
interface NativeProps extends ViewProps {
    open: boolean;
    acknowledgedEvent: Int32;
    revision: Int32;
    compactDetents: ReadonlyArray<NativeAdaptivePanelDetent>;
    selectedDetentType: string;
    selectedDetentValue: Double;
    acknowledgedDetentEvent: Int32;
    detentRevision: Int32;
    regularWidth?: Double;
    onNativeAdaptivePanelOpenChange?: DirectEventHandler<Readonly<{
        open: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeAdaptivePanelDetentChange?: DirectEventHandler<Readonly<{
        type: string;
        value: Double;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeAdaptivePanelLayoutChange?: DirectEventHandler<Readonly<{
        placement: string;
        frameX: Double;
        frameY: Double;
        frameWidth: Double;
        frameHeight: Double;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeAdaptivePanelNativeComponent.d.ts.map