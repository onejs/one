import type { ColorValue, ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
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
    value: Double;
    acknowledgedEvent: Int32;
    revision: Int32;
    label: string;
    disabled: boolean;
    minimumValue: Double;
    maximumValue: Double;
    step: Double;
    swiftStyle?: OneNativeStyleNative;
    onNativeStepperValueChange?: DirectEventHandler<Readonly<{
        value: Double;
        eventCount: Int32;
        revision: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeStepperNativeComponent.d.ts.map