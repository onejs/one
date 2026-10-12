import type { ViewProps } from 'react-native';
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    animatorId: Int32;
    initialValue: string;
    tracks: string;
    repeating: boolean;
    hasTrigger: boolean;
    trigger: Int32;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeKeyframeAnimatorNativeComponent.d.ts.map