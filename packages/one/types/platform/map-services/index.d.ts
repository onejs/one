import type { MapCoordinate, MapPlace, MapRoute, MapTransport } from '../specs/OneMapServices.nitro';
export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapTransport } from '../specs/OneMapServices.nitro';
export declare const MapServices: Readonly<{
    search: (_query: string, _center: MapCoordinate, _radiusMeters?: number) => Promise<MapPlace[]>;
    directions: (_origin: MapCoordinate, _destination: MapCoordinate, _transport?: MapTransport) => Promise<MapRoute>;
}>;
//# sourceMappingURL=index.d.ts.map