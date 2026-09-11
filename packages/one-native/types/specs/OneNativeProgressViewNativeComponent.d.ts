import type { ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    label: string;
    disabled: boolean;
    value: Double;
    total: Double;
    indeterminate: boolean;
    progressViewStyle: string;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeProgressViewNativeComponent.d.ts.map