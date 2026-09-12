import type { ColorValue, ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
type NativeSheetDetent = Readonly<{
    type: string;
    value: Double;
}>;
interface NativeProps extends ViewProps {
    isPresented: boolean;
    acknowledgedEvent: Int32;
    revision: Int32;
    detents: ReadonlyArray<NativeSheetDetent>;
    fitToContents: boolean;
    selectedDetentType: string;
    selectedDetentValue: Double;
    acknowledgedDetentEvent: Int32;
    detentRevision: Int32;
    interactiveDismissDisabled: boolean;
    presentationDragIndicator: string;
    presentationBackground?: ColorValue;
    presentationBackgroundInteraction: string;
    presentationBackgroundInteractionDetentType: string;
    presentationBackgroundInteractionDetentValue: Double;
    presentationContentInteraction: string;
    presentationSizing: string;
    onNativeSheetIsPresentedChange?: DirectEventHandler<Readonly<{
        isPresented: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeSheetDismiss?: DirectEventHandler<Readonly<{
        revision: Int32;
    }>>;
    onNativeSheetDetentChange?: DirectEventHandler<Readonly<{
        type: string;
        value: Double;
        eventCount: Int32;
        revision: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeSheetNativeComponent.d.ts.map