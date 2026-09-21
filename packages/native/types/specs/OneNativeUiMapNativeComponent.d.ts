import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes';
type UiMapMarker = Readonly<{
    id: string;
    title: string;
    latitude: Double;
    longitude: Double;
    tint: string;
}>;
interface NativeProps extends ViewProps {
    latitude: Double;
    longitude: Double;
    zoom: Double;
    markers: ReadonlyArray<UiMapMarker>;
    overlays: string;
    onNativeUiMapCameraMove?: DirectEventHandler<Readonly<{
        latitude: Double;
        longitude: Double;
        zoom: Double;
    }>>;
    onNativeUiMapMarkerClick?: DirectEventHandler<Readonly<{
        id: string;
    }>>;
    onNativeUiMapClick?: DirectEventHandler<Readonly<{
        latitude: Double;
        longitude: Double;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeUiMapNativeComponent.d.ts.map