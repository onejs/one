import type { CameraPosition, MapCircle, MapMarker, MapPolygon, MapPolyline } from './mapTypes';
export type NativeMapModel = {
    latitude: number;
    longitude: number;
    zoom: number;
    markers: {
        id: string;
        title: string;
        latitude: number;
        longitude: number;
        tint: string;
    }[];
    overlays: string;
};
export declare function resolveNativeMapModel(input: {
    cameraPosition?: CameraPosition;
    markers?: readonly MapMarker[];
    polylines?: readonly MapPolyline[];
    polygons?: readonly MapPolygon[];
    circles?: readonly MapCircle[];
}): NativeMapModel;
//# sourceMappingURL=mapValidation.d.ts.map