import type { ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    label: string;
    disabled: boolean;
    value: Double;
    minimumValue: Double;
    maximumValue: Double;
    currentValueLabel: string;
    minimumValueLabel: string;
    maximumValueLabel: string;
    gaugeStyle: string;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeGaugeNativeComponent.d.ts.map