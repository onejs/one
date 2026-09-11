import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
type MapMarker = Readonly<{
    id: string;
    label: string;
    latitude: Double;
    longitude: Double;
}>;
interface NativeProps extends ViewProps {
    latitude: Double;
    longitude: Double;
    distance: Double;
    markers: ReadonlyArray<MapMarker>;
    onNativeMapRegionChange?: DirectEventHandler<Readonly<{
        latitude: Double;
        longitude: Double;
        distance: Double;
        eventCount: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeMapNativeComponent.d.ts.map