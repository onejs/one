import type { StyleProp, ViewStyle } from 'react-native';
export type Coordinates = Readonly<{
    latitude: number;
    longitude: number;
}>;
export type CameraPosition = Readonly<{
    coordinates: Coordinates;
    zoom: number;
}>;
export type MapMarker = Readonly<{
    id: string;
    coordinates: Coordinates;
    title?: string;
    tintColor?: string;
}>;
export type MapPolyline = Readonly<{
    id: string;
    coordinates: readonly Coordinates[];
    color?: string;
    width?: number;
}>;
export type MapPolygon = Readonly<{
    id: string;
    coordinates: readonly Coordinates[];
    color?: string;
    lineColor?: string;
    lineWidth?: number;
}>;
export type MapCircle = Readonly<{
    id: string;
    center: Coordinates;
    radius: number;
    color?: string;
    lineColor?: string;
    lineWidth?: number;
}>;
export interface MapProps {
    style?: StyleProp<ViewStyle>;
    testID?: string;
    accessibilityLabel?: string;
    cameraPosition?: CameraPosition;
    markers?: readonly MapMarker[];
    polylines?: readonly MapPolyline[];
    polygons?: readonly MapPolygon[];
    circles?: readonly MapCircle[];
    onCameraMove?: (event: {
        coordinates: Coordinates;
        zoom: number;
    }) => void;
    onMarkerClick?: (marker: MapMarker) => void;
    onMapClick?: (event: {
        coordinates: Coordinates;
    }) => void;
}
//# sourceMappingURL=mapTypes.d.ts.map