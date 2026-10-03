import type { ViewProps } from 'react-native';
import type { Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    fadeTop: Double;
    fadeBottom: Double;
    fadeLeft: Double;
    fadeRight: Double;
    curveTop: string;
    curveBottom: string;
    curveLeft: string;
    curveRight: string;
    fadeRadius: Double;
    mode: string;
    blurRadius: Double;
    frostProgression: Double;
    overlayColor: Int32;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeEdgeFadeNativeComponent.d.ts.map