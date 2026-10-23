import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    title: string;
    systemImage?: string;
    disabled?: boolean;
    onButtonPress?: DirectEventHandler<Readonly<{}>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneMacButtonNativeComponent.d.ts.map