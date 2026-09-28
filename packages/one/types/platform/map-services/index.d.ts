import type { MapCoordinate, MapPlace, MapRoute, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro';
export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro';
export declare const MapServices: Readonly<{
    search: (_query: string, _center: MapCoordinate, _radiusMeters?: number) => Promise<MapPlace[]>;
    autocomplete: (_query: string, _center: MapCoordinate, _radiusMeters?: number) => Promise<MapSuggestion[]>;
    resolveSuggestion: (_id: string) => Promise<MapPlace>;
    directions: (_origin: MapCoordinate, _destination: MapCoordinate, _transport?: MapTransport) => Promise<MapRoute>;
}>;
//# sourceMappingURL=index.d.ts.map