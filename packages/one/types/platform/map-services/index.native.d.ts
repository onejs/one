import type { MapCoordinate, MapPlace, MapRoute, MapTransport } from '../specs/OneMapServices.nitro';
export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapTransport } from '../specs/OneMapServices.nitro';
declare function search(query: string, center: MapCoordinate, radiusMeters?: number): Promise<MapPlace[]>;
declare function directions(origin: MapCoordinate, destination: MapCoordinate, transport?: MapTransport): Promise<MapRoute>;
export declare const MapServices: Readonly<{
    search: typeof search;
    directions: typeof directions;
}>;
//# sourceMappingURL=index.native.d.ts.map