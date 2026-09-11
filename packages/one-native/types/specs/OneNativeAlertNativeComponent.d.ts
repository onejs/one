import type { ColorValue, ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
type DialogAction = Readonly<{
    id: string;
    label: string;
    role?: string;
}>;
type OneNativeStyleNative = Readonly<{
    fontSize?: Double;
    fontWeight?: string;
    fontDesign?: string;
    textStyle?: string;
    foregroundStyle?: ColorValue;
    tint?: ColorValue;
    background?: ColorValue;
    padding?: Double;
    paddingTop?: Double;
    paddingLeading?: Double;
    paddingBottom?: Double;
    paddingTrailing?: Double;
    width?: Double;
    height?: Double;
    minWidth?: Double;
    idealWidth?: Double;
    maxWidth?: Double;
    minHeight?: Double;
    idealHeight?: Double;
    maxHeight?: Double;
    cornerRadius?: Double;
    opacity?: Double;
    borderColor?: ColorValue;
    borderWidth?: Double;
}>;
interface NativeProps extends ViewProps {
    value: boolean;
    acknowledgedEvent: Int32;
    revision: Int32;
    title: string;
    message: string;
    actions: ReadonlyArray<DialogAction>;
    swiftStyle?: OneNativeStyleNative;
    onNativeAlertValueChange?: DirectEventHandler<Readonly<{
        value: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeAlertAction?: DirectEventHandler<Readonly<{
        id: string;
        eventCount: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeAlertNativeComponent.d.ts.map