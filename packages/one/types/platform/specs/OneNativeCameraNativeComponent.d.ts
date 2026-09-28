import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    active: boolean;
    facing: string;
    codeTypes: ReadonlyArray<string>;
    onNativeCameraState?: DirectEventHandler<Readonly<{
        state: string;
    }>>;
    onNativeCameraCode?: DirectEventHandler<Readonly<{
        type: string;
        data: string;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeCameraNativeComponent.d.ts.map