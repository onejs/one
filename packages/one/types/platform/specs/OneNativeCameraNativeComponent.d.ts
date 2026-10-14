import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import type * as React from 'react';
interface NativeProps extends ViewProps {
    active: boolean;
    facing: string;
    codeTypes: ReadonlyArray<string>;
    flash: string;
    enableTorch: boolean;
    zoom: Double;
    onNativeCameraState?: DirectEventHandler<Readonly<{
        state: string;
    }>>;
    onNativeCameraCode?: DirectEventHandler<Readonly<{
        type: string;
        data: string;
    }>>;
    onNativeCameraPicture?: DirectEventHandler<Readonly<{
        requestId: Int32;
        uri: string;
        width: Int32;
        height: Int32;
        base64: string;
        error: string;
    }>>;
}
interface NativeCommands {
    takePicture(viewRef: React.ElementRef<HostComponent<NativeProps>>, requestId: Int32, quality: Double, base64: boolean): void;
}
export declare const Commands: NativeCommands;
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeCameraNativeComponent.d.ts.map